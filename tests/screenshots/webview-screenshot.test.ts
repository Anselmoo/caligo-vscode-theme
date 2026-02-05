/**
 * Direct Screenshot Test - Using Webview + dom-to-image approach
 * Based on scripts/screenshot-extension logic
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");
const SAMPLES_DIR = path.join(__dirname, "test-samples");

const TEST_THEMES = ["Caligo-Cinder", "Caligo-Eclipse", "Caligo-AuroraNoir"];

suite("Webview Screenshot Tests", () => {
  test("Capture 3 themes using webview", async function () {
    this.timeout(120000);

    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    // Read Python sample code
    const sampleFile = path.join(SAMPLES_DIR, "python-decorators.py");
    const sampleCode = fs.readFileSync(sampleFile, "utf-8");

    for (const themeName of TEST_THEMES) {
      console.log(`\n📸 Capturing ${themeName}...`);

      // Switch theme
      const config = vscode.workspace.getConfiguration("workbench");
      await config.update("colorTheme", themeName, vscode.ConfigurationTarget.Global);
      await new Promise(r => setTimeout(r, 1000));

      // Create webview panel
      const panel = vscode.window.createWebviewPanel(
        "themeScreenshot",
        `Screenshot: ${themeName}`,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: true, retainContextWhenHidden: true }
      );

      // Generate HTML with code and dom-to-image
      panel.webview.html = getWebviewContent(sampleCode, themeName);

      // Wait for screenshot
      const screenshotPromise = new Promise<string>(resolve => {
        panel.webview.onDidReceiveMessage((message: { command: string; data: string }) => {
          if (message.command === "screenshot") {
            resolve(message.data);
          }
        });
      });

      // Trigger screenshot capture
      await new Promise(r => setTimeout(r, 1500)); // Wait for webview to render
      panel.webview.postMessage({ command: "capture" });

      const base64Data = await screenshotPromise;

      // Save screenshot
      const outputPath = path.join(SCREENSHOTS_DIR, `${themeName.toLowerCase()}-webview.png`);
      const imageData = base64Data.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(outputPath, imageData, "base64");

      const stats = fs.statSync(outputPath);
      console.log(
        `   ✅ Saved: ${path.basename(outputPath)} (${(stats.size / 1024).toFixed(1)}KB)`
      );

      panel.dispose();
    }
  });
});

function getWebviewContent(code: string, themeName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screenshot</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: var(--vscode-editor-font-family, 'Menlo', 'Monaco', 'Courier New', monospace);
      font-size: var(--vscode-editor-font-size, 12px);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    #code-container {
      display: inline-block;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      border-radius: 8px;
    }
    pre {
      margin: 0;
      white-space: pre;
      font-family: inherit;
      line-height: 1.6;
    }
    .theme-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--vscode-editor-foreground);
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div id="code-container">
    <div class="theme-title">${escapeHtml(themeName)}</div>
    <pre id="code">${escapeHtml(code)}</pre>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/dom-to-image/2.6.0/dom-to-image.min.js"></script>
  <script>
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', async (event) => {
      const message = event.data;
      if (message.command === 'capture') {
        try {
          const node = document.getElementById('code-container');
          const dataUrl = await domtoimage.toPng(node, {
            quality: 1.0,
            bgcolor: getComputedStyle(document.body).backgroundColor
          });
          vscode.postMessage({
            command: 'screenshot',
            data: dataUrl
          });
        } catch (error) {
          console.error('Screenshot failed:', error);
        }
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
