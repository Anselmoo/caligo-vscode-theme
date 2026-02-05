/**
 * Simple Screenshot Test - Just 3 Themes
 * Using GitHub Copilot Chat extension commands that create perfect window screenshots
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const SAMPLES_DIR = path.join(__dirname, "test-samples");
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TEST_THEMES = ["Caligo-Cinder", "Caligo-Eclipse", "Caligo-AuroraNoir"];

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

suite("Simple Screenshot Tests", () => {
  test("Capture 3 theme screenshots with Python", async function () {
    this.timeout(120000); // 2 minutes

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error("No workspace folder found");
    }

    await configureScreenshotUi();
    ensureWorkspaceSamples(workspaceRoot);

    // Open Python sample file
    const sampleFile = path.join(workspaceRoot, "test-samples", "python-decorators.py");
    const doc = await vscode.workspace.openTextDocument(sampleFile);
    const _editor = await vscode.window.showTextDocument(doc, {
      preview: false,
      preserveFocus: false,
    });

    // Wait for document to load
    await new Promise(r => setTimeout(r, 1000));

    for (const themeName of TEST_THEMES) {
      console.log(`\n📸 Capturing ${themeName}...`);

      // Switch theme
      const config = vscode.workspace.getConfiguration("workbench");
      await config.update("colorTheme", themeName, vscode.ConfigurationTarget.Global);
      await new Promise(r => setTimeout(r, 1000)); // Wait for theme to apply

      // Clean up UI
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
      await vscode.commands.executeCommand("workbench.action.closePanel");
      await vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
      await vscode.commands.executeCommand("notifications.clearAll");
      await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
      await new Promise(r => setTimeout(r, 500));

      // Try Copilot Chat screenshot commands
      const commands = await vscode.commands.getCommands(true);
      const beforeFiles = fs.readdirSync(SCREENSHOTS_DIR);

      let captured = false;
      for (const cmd of ["chat.openFileUpdatedBySnapshot", "chat.openFileSnapshot"]) {
        if (!commands.includes(cmd)) {
          console.log(`   ⚠️  Command not available: ${cmd}`);
          continue;
        }

        try {
          console.log(`   Trying: ${cmd}`);
          await vscode.commands.executeCommand(cmd);
          await new Promise(r => setTimeout(r, 3000)); // Wait for screenshot

          // Check for new files
          const afterFiles = fs.readdirSync(SCREENSHOTS_DIR);
          const newFiles = afterFiles
            .filter(f => !beforeFiles.includes(f) && f.endsWith(".png"))
            .map(f => ({
              name: f,
              path: path.join(SCREENSHOTS_DIR, f),
              stats: fs.statSync(path.join(SCREENSHOTS_DIR, f)),
            }));

          if (newFiles.length > 0) {
            const newest = newFiles.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0];
            const targetName = `${themeName.toLowerCase()}-python.png`;
            const targetPath = path.join(SCREENSHOTS_DIR, targetName);

            fs.renameSync(newest.path, targetPath);
            const sizeMB = (newest.stats.size / 1024 / 1024).toFixed(1);
            console.log(`   ✅ Saved: ${targetName} (${sizeMB}MB)`);
            captured = true;
            break;
          }
        } catch (error) {
          console.log(`   ❌ ${cmd} failed:`, error);
        }
      }

      if (!captured) {
        console.log(`   ⚠️  No screenshot captured for ${themeName}`);
      }
    }
  });
});
