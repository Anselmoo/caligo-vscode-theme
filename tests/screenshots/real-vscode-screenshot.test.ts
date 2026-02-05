/**
 * Real VS Code Screenshot Test
 *
 * This test runs in the Extension Development Host (a separate VS Code instance)
 * and uses macOS screencapture to capture the REAL VS Code window.
 *
 * The key insight:
 * - @vscode/test-electron launches an isolated VS Code instance
 * - We can use osascript/screencapture to capture THAT specific window
 * - This captures real syntax highlighting including semantic tokens
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

// Use the project root docs directory, not the out directory
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, "docs", "images", "themes");
const SAMPLES_DIR = path.join(__dirname, "test-samples");

function ensureWorkspaceSamples(workspaceRoot: string) {
  const dstDir = path.join(workspaceRoot, "test-samples");
  fs.mkdirSync(dstDir, { recursive: true });
  // Copy all test samples into the workspace so VS Code shows workspace-relative breadcrumbs
  // instead of absolute /Users/... paths.
  fs.cpSync(SAMPLES_DIR, dstDir, { recursive: true });
}

async function configureScreenshotUi() {
  // Bigger text for screenshots
  await vscode.workspace
    .getConfiguration("editor")
    .update("fontSize", 18, vscode.ConfigurationTarget.Global);
  await vscode.workspace
    .getConfiguration("window")
    .update("zoomLevel", 1, vscode.ConfigurationTarget.Global);
}

async function cleanupUiChrome() {
  await vscode.commands.executeCommand("workbench.action.closeSidebar");
  await vscode.commands.executeCommand("workbench.action.closePanel");
  await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
  await vscode.commands.executeCommand("notifications.clearAll");
  await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
}

// Demo themes for testing - use exact labels from package.json
const DEMO_THEMES = ["Caligo (Void Ember)", "Caligo (Aurora Noir)"];

// Sample files to open
const SAMPLE_FILES = {
  python: "python-decorators.py",
  typescript: "typescript-types.ts",
};

suite("Real VS Code Screenshot Capture", () => {
  suiteSetup(async () => {
    // Ensure screenshots directory exists
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    console.log(`\n📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}`);

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceRoot) {
      ensureWorkspaceSamples(workspaceRoot);
    }

    await configureScreenshotUi();
  });

  test("Capture demo themes (2 themes × 2 languages)", async function () {
    this.timeout(180000); // 3 minutes timeout

    for (const themeName of DEMO_THEMES) {
      console.log(`\n🎨 Theme: ${themeName}`);

      // Switch to this theme
      await setTheme(themeName);
      await delay(1500); // Wait for theme to apply

      for (const [lang, filename] of Object.entries(SAMPLE_FILES)) {
        console.log(`   📄 ${lang}: ${filename}`);

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        const samplePath = workspaceRoot
          ? path.join(workspaceRoot, "test-samples", filename)
          : path.join(SAMPLES_DIR, filename);
        if (!fs.existsSync(samplePath)) {
          console.log(`   ⚠️  Sample file not found: ${samplePath}`);
          continue;
        }

        // Open the sample file in the editor
        const doc = await vscode.workspace.openTextDocument(samplePath);
        await vscode.window.showTextDocument(doc, { preview: false });

        // Wait for semantic tokens to load
        console.log("   ⏳ Waiting for semantic tokens...");
        await waitForSemanticTokens(doc, 5000);

        // Select all code for better screenshot
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const fullRange = new vscode.Range(
            new vscode.Position(0, 0),
            new vscode.Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length)
          );
          editor.selection = new vscode.Selection(fullRange.start, fullRange.start);
          editor.revealRange(fullRange, vscode.TextEditorRevealType.AtTop);
        }

        await delay(500);

        // Clean up UI (Chat/sidebars/panels/notifications) so screenshots don't include them
        await cleanupUiChrome();
        await delay(500);

        // Capture the VS Code window
        const safeName = themeName.toLowerCase().replace(/ /g, "-");
        const outputFile = path.join(SCREENSHOTS_DIR, `${safeName}-${lang}.png`);

        // Delete existing screenshot to allow overwriting
        if (fs.existsSync(outputFile)) {
          fs.unlinkSync(outputFile);
        }

        console.log("   📷 Capturing window...");
        await captureVSCodeWindow(outputFile);

        if (fs.existsSync(outputFile)) {
          const stats = fs.statSync(outputFile);
          console.log(
            `   ✅ Saved: ${path.basename(outputFile)} (${(stats.size / 1024).toFixed(0)}KB)`
          );
        } else {
          console.log("   ❌ Screenshot failed");
        }

        // Close the document
        await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        await delay(300);
      }
    }
  });
});

async function setTheme(themeName: string): Promise<void> {
  // Directly set the theme via configuration (more reliable than command palette)
  try {
    const config = vscode.workspace.getConfiguration("workbench");
    await config.update("colorTheme", themeName, vscode.ConfigurationTarget.Global);
    // Give VS Code time to apply the theme
    await delay(500);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`   ⚠️  Could not set theme: ${message}`);
  }
}

// biome-ignore lint/suspicious/noExplicitAny: VS Code API uses any for document type
async function waitForSemanticTokens(doc: any, timeoutMs: number): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if document has semantic tokens
    // This is a heuristic - we wait until the editor is likely ready
    try {
      const result = await vscode.commands.executeCommand(
        "vscode.provideDocumentSemanticTokens",
        doc.uri
      );
      const tokens = result as { data: Uint32Array };
      if (tokens && tokens.data.length > 0) {
        return;
      }
    } catch {
      // Semantic tokens not available yet
    }
    await delay(200);
  }

  // Fallback: just wait the full timeout
  console.log("   ⚠️  Semantic tokens may not be fully loaded");
}

async function captureVSCodeWindow(outputPath: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log("   ⚠️  Screenshot capture only supported on macOS");
    return;
  }

  try {
    // First, try to activate a VS Code "Extension Development Host" window explicitly
    try {
      execSync(
        `osascript -e 'tell application "System Events"\n\trepeat with p in application processes\n\t\trepeat with w in windows of p\n\t\t\ttry\n\t\t\t\tif name of w contains "Extension Development Host" then\n\t\t\t\t\tset frontmost of p to true\n\t\t\t\t\treturn "activated"\n\t\t\t\tend if\n\t\t\tend try\n\t\tend repeat\n\tend repeat\nend tell'`,
        { timeout: 3000 }
      );
    } catch {}

    // Robust AppleScript: find the window whose title contains "Extension Development Host",
    // activate it, and return its bounds. This avoids relying on the currently frontmost app.
    const getBoundsScript = `
tell application "System Events"
  repeat with p in application processes
    repeat with w in windows of p
      try
        if (name of w contains "Extension Development Host") then
          set frontmost of p to true
          delay 0.1
          set {x, y} to position of w
          set {w, h} to size of w
          return (x as string) & "," & (y as string) & "," & (w as string) & "," & (h as string)
        end if
      end try
    end repeat
  end repeat
end tell`;

    const bounds = execSync(`osascript -e '${getBoundsScript}'`, {
      encoding: "utf-8",
      timeout: 4000,
    }).trim();

    if (bounds?.includes(",")) {
      const [x, y, w, h] = bounds.split(",").map(Number);

      // Try multiple scale factors to handle Retina (backingScaleFactor)
      const scalesToTry = [1, 2, 3];

      function captureWithScale(scale: number): boolean {
        try {
          // Expand rect slightly to include window chrome/shadow
          const margin = Math.max(4, Math.round(6 * scale));
          const rx = Math.max(0, Math.round(x * scale) - margin);
          const ry = Math.max(0, Math.round(y * scale) - margin);
          const rw = Math.max(1, Math.round(w * scale) + margin * 2);
          const rh = Math.max(1, Math.round(h * scale) + margin * 2);

          execSync(`screencapture -x -R${rx},${ry},${rw},${rh} "${outputPath}"`, {
            timeout: 7000,
            stdio: "pipe",
          });

          if (!fs.existsSync(outputPath)) return false;

          // Use `sips` to get pixel dimensions of the resulting image
          try {
            const sipsOut = execSync(`sips -g pixelWidth -g pixelHeight "${outputPath}"`, {
              encoding: "utf-8",
              timeout: 2000,
            });
            const widthMatch = sipsOut.match(/pixelWidth:\s*(\d+)/i);
            const heightMatch = sipsOut.match(/pixelHeight:\s*(\d+)/i);
            if (widthMatch && heightMatch) {
              const imgW = Number(widthMatch[1]);
              const imgH = Number(heightMatch[1]);

              // Expected pixel dims for requested rect (approx)
              const expectedW = Math.round(w * scale);
              const expectedH = Math.round(h * scale);

              // Accept capture when image dims are not much smaller than expected (allow rounding/menubar differences)
              if (imgW >= Math.round(expectedW * 0.8) && imgH >= Math.round(expectedH * 0.8)) {
                return true;
              } else {
                console.log(
                  `   ⚠️  Capture with scale=${scale} produced ${imgW}x${imgH}px (expected ~${expectedW}x${expectedH}) — retrying with different scale.`
                );
                return false;
              }
            }
          } catch (_e) {
            // Couldn't read dimensions; fall back to size-based heuristic
            const stats = fs.statSync(outputPath);
            if (stats.size > 10 * 1024) return true; // >10KB likely non-empty
            return false;
          }
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.log(`   ⚠️  Capture attempt failed at scale=${scale}: ${message}`);
          return false;
        }
        // Should never reach here, but be explicit about returning a boolean
        return false;
      }

      // Try scales until one produces a reasonably sized image
      for (const scale of scalesToTry) {
        if (captureWithScale(scale)) {
          console.log(`   ✅ Captured with scale=${scale}`);
          return;
        }
      }

      console.log(
        "   ❌ All capture attempts failed or produced low-quality images; ensure Screen Recording permission is granted and EDH window is visible."
      );
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`   ⚠️  Could not capture window bounds, trying fallback: ${message}`);
  }

  // Fallback: capture full screen
  try {
    await delay(100);
    execSync(`screencapture -x "${outputPath}"`, {
      timeout: 5000,
      stdio: "pipe",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`   ❌ Screenshot capture failed: ${message}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
