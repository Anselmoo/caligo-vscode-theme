import { defineConfig } from "@vscode/test-cli";

export default defineConfig([
  {
    label: "smoke",
    files: "out/tests/screenshots/smoke-test.test.cjs",
    mocha: {
      ui: "tdd",
      timeout: 60000,
    },
    launchArgs: [
      "--install-extension=robertz.code-snapshot",
      "--install-extension=vkrsi.code-screenshot",
      "--install-extension=khattakdev.capture",
      "--disable-workspace-trust",
    ],
    workspaceFolder: "./tests/screenshots/workspace",
  },
  {
    label: "screenshots",
    files: "out/tests/screenshots/webview-screenshot.test.cjs",
    mocha: {
      ui: "tdd",
      timeout: 120000, // Longer timeout for extension installation and extension activation
    },
    // Note: TEST_THEMES is read by the test runner manually (not by this config file)

    // Install language extensions before running tests
    launchArgs: [
      "--install-extension=ms-python.vscode-pylance",
      "--install-extension=ms-python.python",
      "--install-extension=rust-lang.rust-analyzer",
      "--install-extension=redhat.java",
      "--install-extension=fwcd.kotlin",
      "--install-extension=robertz.code-snapshot",
      "--install-extension=vkrsi.code-screenshot",
      "--install-extension=khattakdev.capture",
      "--disable-workspace-trust",
    ],
    // Use a clean user data directory for tests
    workspaceFolder: "./tests/screenshots/workspace",
  },
  {
    // Real VS Code screenshot capture - captures the actual EDH window
    label: "real-screenshots",
    files: "out/tests/screenshots/real-vscode-screenshot.test.cjs",
    mocha: {
      ui: "tdd",
      timeout: 180000, // 3 minutes for screenshot capture
    },
    launchArgs: [
      // Install Pylance for Python semantic tokens
      "--install-extension=ms-python.vscode-pylance",
      "--install-extension=ms-python.python",
      "--disable-workspace-trust",
      // Open in a clean state
      "--new-window",
    ],
    workspaceFolder: "./tests/screenshots/workspace",
  },
]);
