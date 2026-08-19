/**
 * Smoke Test: Find Working Screenshot Method
 *
 * Tests different screenshot capture methods to find one that works
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const TEST_DIR = path.join(__dirname, "test-screenshots");
if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });

suite("Screenshot Method Smoke Test", () => {
  suiteSetup(async function () {
    this.timeout(60000);
    console.log("\n📋 Testing screenshot capture methods...\n");
  });

  test("Method 1: Electron BrowserWindow.capturePage", async function () {
    this.timeout(30000);

    try {
      // Define proper types for the global object
      interface ElectronCapturedImage {
        toPNG: () => Buffer;
      }
      interface ElectronWindow {
        webContents: { capturePage: () => Promise<ElectronCapturedImage> };
      }
      interface ElectronBrowserWindow {
        getFocusedWindow?: () => ElectronWindow | undefined;
        getAllWindows?: () => ElectronWindow[];
      }
      interface ElectronModule {
        BrowserWindow?: ElectronBrowserWindow;
      }
      interface ElectronGlobal {
        require?: (module: string) => unknown;
        process?: {
          electronBinding?: (module: string) => unknown;
        };
      }

      // Try to access electron module (only available in Electron context)
      const globalWithElectron = global as unknown as ElectronGlobal;
      const electron =
        globalWithElectron.require?.("electron") ||
        globalWithElectron.process?.electronBinding?.("electron");
      if (!electron) {
        console.log("❌ Method 1 FAILED: Electron module not accessible");
        return;
      }
      const { BrowserWindow } = electron as ElectronModule;
      const win = BrowserWindow?.getFocusedWindow?.() || BrowserWindow?.getAllWindows?.()?.[0];

      if (!win) {
        console.log("❌ Method 1 FAILED: No BrowserWindow available");
        return;
      }

      const image = await win.webContents.capturePage();
      const buffer = image.toPNG();
      const filepath = path.join(TEST_DIR, "method1-electron.png");
      fs.writeFileSync(filepath, buffer);

      console.log(`✅ Method 1 SUCCESS: ${filepath}`);
      console.log(`   Size: ${buffer.length} bytes`);
    } catch (err) {
      console.log(`❌ Method 1 FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test("Method 2: VS Code Extension Commands", async function () {
    this.timeout(30000);

    try {
      // Open a test file first
      const samplePath = path.join(__dirname, "test-samples", "typescript-types.ts");
      const doc = await vscode.workspace.openTextDocument(samplePath);
      await vscode.window.showTextDocument(doc);
      await new Promise(r => setTimeout(r, 2000));

      // Get all commands that might capture screenshots
      const allCommands = await vscode.commands.getCommands(true);
      const screenshotCommands = allCommands.filter((c: string) =>
        /screenshot|snapshot|codesnap|capture/i.test(c)
      );

      console.log(`   Found ${screenshotCommands.length} screenshot-related commands:`);
      // biome-ignore lint/suspicious/useIterableCallbackReturn: forEach only used for logging
      screenshotCommands.forEach((cmd: string) => console.log(`     - ${cmd}`));

      if (screenshotCommands.length === 0) {
        console.log("❌ Method 2 FAILED: No screenshot extension commands available");
        return;
      }

      // Try each command
      const beforeFiles = new Set(fs.readdirSync(TEST_DIR));
      let worked = false;

      for (const cmd of screenshotCommands.slice(0, 5)) {
        // Try first 5
        try {
          console.log(`   Trying: ${cmd}`);
          await vscode.commands.executeCommand(cmd);
          await new Promise(r => setTimeout(r, 3000));

          const afterFiles = fs.readdirSync(TEST_DIR);
          const newFiles = afterFiles.filter(
            f => !beforeFiles.has(f) && /\.(png|jpg|jpeg)$/i.test(f)
          );

          if (newFiles.length > 0) {
            console.log(`✅ Method 2 SUCCESS: Command "${cmd}" created ${newFiles[0]}`);
            worked = true;
            break;
          }
        } catch (err) {
          console.log(`   ${cmd}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      if (!worked) {
        console.log("❌ Method 2 FAILED: No command created screenshot file");
      }
    } catch (err) {
      console.log(`❌ Method 2 FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test("Method 3: Native OS Screenshot (macOS)", async function () {
    this.timeout(30000);

    if (process.platform !== "darwin") {
      console.log("⏭️  Method 3 SKIPPED: Not macOS");
      return;
    }

    try {
      // Focus VS Code window first
      await vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");
      await new Promise(r => setTimeout(r, 500));

      const filepath = path.join(TEST_DIR, "method3-screencapture.png");

      // Try screencapture without window selection (-x = no sound, -T 0 = immediate)
      execSync(`screencapture -x -T 0 ${JSON.stringify(filepath)}`, {
        stdio: "pipe",
        timeout: 5000,
      });

      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log(`✅ Method 3 SUCCESS: ${filepath}`);
        console.log(`   Size: ${stats.size} bytes`);
      } else {
        console.log("❌ Method 3 FAILED: No file created");
      }
    } catch (err) {
      console.log(`❌ Method 3 FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test("Method 4: AppleScript window ID + screencapture", async function () {
    this.timeout(30000);

    if (process.platform !== "darwin") {
      console.log("⏭️  Method 4 SKIPPED: Not macOS");
      return;
    }

    try {
      // Try different app names for VS Code test instance
      const appNames = ["Electron", "Code", "Visual Studio Code", "Code - OSS"];
      let windowId: string | null = null;
      let appName: string | null = null;

      for (const name of appNames) {
        try {
          const result = execSync(`osascript -e 'tell application "${name}" to id of window 1'`, {
            encoding: "utf-8",
            timeout: 2000,
            stdio: "pipe",
          }).trim();

          if (result && !result.includes("error")) {
            windowId = result;
            appName = name;
            break;
          }
        } catch {}
      }

      if (!windowId || !appName) {
        console.log("❌ Method 4 FAILED: Could not find window ID for any VS Code app name");
        return;
      }

      console.log(`   Found window ID: ${windowId} (app: ${appName})`);

      const filepath = path.join(TEST_DIR, "method4-applescript-screencapture.png");

      // Capture that specific window
      execSync(`screencapture -l${windowId} -x ${JSON.stringify(filepath)}`, {
        stdio: "pipe",
        timeout: 5000,
      });

      if (fs.existsSync(filepath)) {
        const stats = fs.statSync(filepath);
        console.log(`✅ Method 4 SUCCESS: ${filepath}`);
        console.log(`   Size: ${stats.size} bytes`);
        console.log("   🎯 This method captures ONLY the VS Code window!");
      } else {
        console.log("❌ Method 4 FAILED: No file created");
      }
    } catch (err) {
      console.log(`❌ Method 4 FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  test("Summary: Check created files", () => {
    const files = fs.readdirSync(TEST_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

    console.log(`\n📊 Summary: ${files.length} screenshot(s) created`);
    files.forEach(f => {
      const stats = fs.statSync(path.join(TEST_DIR, f));
      console.log(`   - ${f}: ${stats.size} bytes`);
    });

    if (files.length === 0) {
      console.log("\n⚠️  No screenshots were successfully captured by any method!");
      console.log("💡 Recommendation: Install a VS Code screenshot extension manually:");
      console.log("   - CodeSnap");
      console.log("   - Polacode");
      console.log("   - Carbon Now");
    }
  });
});
