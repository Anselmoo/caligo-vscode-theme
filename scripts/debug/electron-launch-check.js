#!/usr/bin/env node
const { _electron: electron } = require("playwright");

(async () => {
  const executable = process.env.CODE_EXECUTABLE || "/usr/share/code/code";
  const codeArgs = (process.env.CODE_ARGS || "").split(/\s+/).filter(Boolean);
  console.log("Debug: attempting Electron launch", {
    executable,
    codeArgs,
    env: { DEBUG: process.env.DEBUG, CODE_ARGS: process.env.CODE_ARGS },
  });

  try {
    const app = await electron.launch({
      executablePath: executable,
      args: codeArgs,
      timeout: 60000,
    });
    console.log("Launched Electron app successfully");
    try {
      const windows = await app.windows();
      console.log("Window count:", windows.length);
    } catch (werr) {
      console.warn("Failed to query windows:", werr?.stack ?? String(werr));
    }
    await app.close();
    console.log("Closed Electron app successfully");
    process.exit(0);
  } catch (err) {
    console.error("Electron launch failed:", err?.stack ?? String(err));
    process.exit(2);
  }
})();
