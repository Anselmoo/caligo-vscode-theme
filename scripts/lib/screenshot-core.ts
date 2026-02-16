/**
 * Shared helpers for screenshot capture improvements.
 * - startApp/stopApp: simplified wrappers around Playwright Electron launch/close.
 * - captureThemeInOpenApp: applies a theme and captures screenshots for requested languages.
 * - instrumentation helpers: recordLaunch, recordThemeTiming, writeReport.
 *
 * This is intentionally minimal: the legacy script remains source-of-truth and
 * this helper encapsulates the new reuse-first flow.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ElectronApplication, Page } from "playwright";
import { _electron as electron } from "playwright";

type VscodeEditorDocument = {
  uri?: { fsPath?: string; path?: string; toString?: () => string };
};

type VscodeEditor = {
  document?: VscodeEditorDocument;
};

type VscodeWindowApi = {
  activeTextEditor?: VscodeEditor;
};

type VscodeSurface = {
  vscode?: { window?: VscodeWindowApi };
};

type VscodeCommands = {
  executeCommand?: (...args: unknown[]) => unknown;
  getCommands?: (filterInternal?: boolean) => Promise<string[]>;
};

type VscodeWorkspace = {
  getConfiguration?: (section?: string) => { get?: (key: string) => unknown };
};

type VscodeExtensions = {
  getExtension?: (id: string) => { activate?: () => Promise<unknown> } | undefined;
};

type VscodeRuntimeSurface = {
  vscode?: {
    commands?: VscodeCommands;
    workspace?: VscodeWorkspace;
    extensions?: VscodeExtensions;
    window?: VscodeWindowApi;
  };
};

export interface ThemeTiming {
  theme: string;
  durationMs: number;
  // Verification fields added to help diagnose flakiness between theme selection and
  // opening a file. These are optional and only populated for instrumentation.
  themeApplied?: boolean;
  appliedThemeName?: string | null;
  openedFile?: string | null;
  verificationErrors?: string[];
  // If any obstructing UI areas remain open after cleanup, record them to diagnose why captures are blocked.
  obstructingAreas?: { sidebar: boolean; panel: boolean; auxiliary: boolean };
}

export interface ScreenshotReport {
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  electronLaunchCount: number;
  themeTimings: ThemeTiming[];
  errors?: Array<{ theme?: string; step: string; message: string }>;
  environment?: Record<string, unknown>;
}

export async function startApp(opts: {
  vscodePath: string;
  extensionPath?: string;
  workspacePath: string;
  args?: string[];
  runRoot: string;
  editorFontSize?: number;
  windowZoomLevel?: number;
  installExtensionIds?: string[];
  reuseUserData?: boolean;
  colorTheme?: string;
}): Promise<{ app: ElectronApplication; page: Page; userDataDir?: string }> {
  // Small wrapper that creates an isolated user-data-dir and optionally launches
  // in Extension Development Host mode when an extensionPath is provided.
  const vscodePath = opts.vscodePath;

  // Prepare an isolated run directory for user data and extensions
  const runRoot = opts.runRoot || "/tmp/caligo-vscode-playwright";
  const userDataDir = path.join(runRoot, `user-data-${Date.now()}`);
  const extensionsDir = path.join(runRoot, `extensions-${Date.now()}`);
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
  if (!fs.existsSync(extensionsDir)) fs.mkdirSync(extensionsDir, { recursive: true });

  // Write minimal user settings to avoid interactive prompts and reduce noise
  try {
    const userSettingsDir = path.join(userDataDir, "User");
    if (!fs.existsSync(userSettingsDir)) fs.mkdirSync(userSettingsDir, { recursive: true });
    const settingsPath = path.join(userSettingsDir, "settings.json");
    const baseSettings: Record<string, unknown> = {
      "telemetry.telemetryLevel": "off",
      "workbench.tips.enabled": false,
      "workbench.startupEditor": "none",
      "update.mode": "none",
      "extensions.autoUpdate": false,
      "extensions.autoCheckUpdates": false,
      // Disable Copilot Chat sidebar and related features
      "github.copilot.chat.welcomeMessage": "never",
      "github.copilot.enable": { "*": false },
      "github.copilot.chat.enabled": false,
      "github.copilot.chat.codesGeneration": false,
      "chat.commandCenter.enabled": false,
      "workbench.panel.chat.defaultOpen": false,
      // Disable git-related prompts
      "git.enabled": false,
      "git.autoRepositoryDetection": false,
      "git.openRepositoryInParentFolders": "never",
      // Activity bar and sidebars - keep activity bar but close sidebars
      "workbench.activityBar.visible": true,
      "workbench.sideBar.location": "left",
      // IMPORTANT: Hide the primary sidebar (Explorer) at startup
      "workbench.sideBar.alwaysOpenOnStartup": false,
      // IMPORTANT: Hide auxiliary/secondary sidebar (Copilot Chat uses this)
      "workbench.auxiliarySidebar.visible": false,
      "workbench.secondarySideBar.visible": false,
      // Disable notifications and welcome
      "workbench.welcomePage.walkthroughs.openOnInstall": false,
      "workbench.editor.showTabs": "single",
      // Zen mode settings for cleaner screenshots
      "zenMode.hideStatusBar": false,
      "zenMode.hideTabs": false,
      "zenMode.fullScreen": false,
    };
    if (opts.colorTheme) {
      baseSettings["workbench.colorTheme"] = opts.colorTheme;
    }
    fs.writeFileSync(settingsPath, JSON.stringify(baseSettings, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write user settings for isolated profile:", String(e));
  }

  // Construct launch args: include workspace path and isolation flags
  const launchArgs = opts.args ?? [opts.workspacePath];
  const computedArgs = [
    `--user-data-dir=${userDataDir}`,
    `--extensions-dir=${extensionsDir}`,
    ...(launchArgs || []),
  ];

  // If extensionPath provided, run in Extension Development Host mode so that
  // the extension under development is loaded (deterministic theme activation)
  if (opts.extensionPath) {
    computedArgs.unshift(`--extensionDevelopmentPath=${opts.extensionPath}`);
  }

  const launchOptions = {
    executablePath: vscodePath,
    args: computedArgs,
    timeout: 120000,
    env: { ...process.env },
  };

  console.log("📣 Launching Electron with options:", {
    executablePath: launchOptions.executablePath,
    args: launchOptions.args,
    timeout: launchOptions.timeout,
  });

  // If DISPLAY is not set (commonly in Docker/CI), attempt to start a headless Xvfb server
  // to provide an X11 environment that Electron can use. This is a best-effort helper that
  // helps stabilize container-based runs where xvfb-run may not be applied to the electron launch.
  if (!process.env.DISPLAY) {
    try {
      const cp = await import("node:child_process");
      // Only start Xvfb if the binary is present and /tmp/xvfb.pid not already set
      const xvfbPath = cp.execSync?.("which Xvfb 2>/dev/null || true").toString().trim();
      if (xvfbPath) {
        if (!fs.existsSync("/tmp/xvfb.pid")) {
          console.log("🛰️  Starting Xvfb on :99 for headless display (Docker/CI helper)");
          try {
            cp.execSync(
              "Xvfb :99 -screen 0 1920x1080x24 >/dev/null 2>&1 & echo $! > /tmp/xvfb.pid"
            );
            process.env.DISPLAY = ":99";
            launchOptions.env = { ...process.env };
          } catch (err) {
            console.warn("⚠️ Failed to start Xvfb helper:", String(err));
          }
        } else {
          try {
            const pid = fs.readFileSync("/tmp/xvfb.pid", "utf-8").trim();
            if (pid) {
              process.env.DISPLAY = ":99";
              launchOptions.env = { ...process.env };
              console.log(`🛰️  Reusing existing Xvfb (pid=${pid}) and DISPLAY=:99`);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      // non-fatal: continue to launch and provide existing diagnostics if it fails
      console.warn("⚠️ Xvfb helper check failed:", String(err));
    }
  }

  let electronApp: ElectronApplication | undefined;
  try {
    electronApp = await electron.launch(launchOptions as Parameters<typeof electron.launch>[0]);
  } catch (err: unknown) {
    // Enhanced diagnostics for CI failures (Process failed to launch)
    let errorDetails = String(err);
    if (err instanceof Error) {
      errorDetails = err.stack ?? err.message ?? String(err);
    }
    console.error("Electron failed to launch", {
      launchOptions: {
        executablePath: launchOptions.executablePath,
        args: launchOptions.args,
        timeout: launchOptions.timeout,
      },
      envSnapshot: {
        DEBUG: process.env.DEBUG,
        CODE_ARGS: process.env.CODE_ARGS,
        ELECTRON_ENABLE_LOGGING: process.env.ELECTRON_ENABLE_LOGGING,
        ELECTRON_ENABLE_STACK_DUMPING: process.env.ELECTRON_ENABLE_STACK_DUMPING,
      },
      error: errorDetails,
    });

    // Best-effort local diagnostic: try to run VS Code manually under xvfb and capture verbose logs
    try {
      const cp = await import("node:child_process");
      const logDir = "/tmp/vscode-launch";
      try {
        cp.execSync(`mkdir -p ${logDir} && chown -R $(whoami) ${logDir}`);
      } catch (_) {
        // ignore
      }
      const argsStr = (launchOptions.args || []).map(a => String(a)).join(" ");
      const runCmd = `su -s /bin/bash pwuser -c "xvfb-run --auto-servernum --server-args=' -screen 0 1920x1080x24' sh -lc '${launchOptions.executablePath} ${argsStr} > /tmp/vscode-launch/log.txt 2>&1 & sleep 3; pkill -f code || true'"`;
      try {
        cp.execSync(runCmd, { stdio: "ignore" });
        const raw = fs.readFileSync("/tmp/vscode-launch/log.txt", "utf-8");
        console.error(
          "Electron manual diagnostic log (first 200 lines):\n" +
            raw.split(/\n/).slice(0, 200).join("\n")
        );
      } catch (err) {
        console.error("Failed to run manual diagnostic:", String(err));
      }
    } catch (_) {
      // ignore diagnostics failing
    }

    throw err;
  }

  if (!electronApp) throw new Error("Electron did not launch (launch returned undefined)");
  const page = await electronApp.firstWindow();
  await page.waitForLoadState("domcontentloaded");

  // Wait for VS Code workbench to be ready
  await waitForWorkbenchReady(page);

  return { app: electronApp, page, userDataDir };
}

async function waitForWorkbenchReady(page: Page): Promise<void> {
  // VS Code workbench root
  await page.waitForSelector(".monaco-workbench", { state: "visible", timeout: 60000 });
  // Don't require an editor yet.
  // On some VS Code builds/configs, an editor isn't created until a file is opened.

  // Additional wait for extension host initialization and theme loading
  await page.waitForTimeout(8000);

  // Log current theme state for diagnostics
  try {
    const themeInfo = await page.evaluate(() => {
      try {
        // Try to get current theme from CSS variables
        const doc = document.documentElement;
        const cs = window.getComputedStyle(doc);
        const editorBg = cs.getPropertyValue("--vscode-editor-background");
        const editorFg = cs.getPropertyValue("--vscode-editor-foreground");

        // Also check body class for theme hints
        const bodyClasses = document.body.className;

        return {
          editorBg: editorBg?.trim(),
          editorFg: editorFg?.trim(),
          bodyClasses,
        };
      } catch {
        return null;
      }
    });
    console.log("   🎨 Initial theme state:", themeInfo);
  } catch {
    // ignore diagnostics
  }
}

export async function stopApp(app: ElectronApplication) {
  try {
    await app.close();
  } catch (_e) {
    // best-effort
  }

  // Try to clean up Xvfb if we started it in startApp (best-effort)
  try {
    const cp = await import("node:child_process");
    if (cp.execSync && fs.existsSync("/tmp/xvfb.pid")) {
      try {
        const pid = fs.readFileSync("/tmp/xvfb.pid", "utf-8").trim();
        if (pid) {
          cp.execSync(`kill ${pid} || true`);
          try {
            fs.unlinkSync("/tmp/xvfb.pid");
          } catch {}
          console.log(`🛰️  Stopped Xvfb (pid=${pid})`);
        }
      } catch {
        // ignore cleanup failures
      }
    }
  } catch (_) {
    // ignore
  }
}

import { tryCloseSidebarOnce } from "./theme-utils";

export async function captureThemeInOpenApp(params: {
  page: Page;
  themeName: string;
  languages: string[];
  workspacePath: string;
  outputDir: string;
  waitForSemanticTokensMs: number;
  takeScreenshot: (page: Page, dest: string) => Promise<void>;
  openFile: (page: Page, filePath: string, workspacePath?: string) => Promise<void>;
  cleanupUI: (page: Page) => Promise<void>;
  selectThemeViaCommandPalette: (page: Page, themeName: string) => Promise<void>;
  userDataDir?: string;
}): Promise<ThemeTiming & { errors?: string[] }> {
  const { page, themeName, languages, outputDir, waitForSemanticTokensMs } = params;

  const start = Date.now();
  const errors: string[] = [];

  // Verification instrumentation
  let themeApplied: boolean | undefined;
  let appliedThemeName: string | null = null;
  let openedFile: string | null = null;
  const verificationErrors: string[] = [];
  let obstructingAreas: { sidebar: boolean; panel: boolean; auxiliary: boolean } | undefined;

  function readUserSettingsTheme(userDataDir?: string): string | null {
    if (!userDataDir) return null;
    try {
      const settingsPath = path.join(userDataDir, "User", "settings.json");
      if (!fs.existsSync(settingsPath)) return null;
      const raw = fs.readFileSync(settingsPath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const value = parsed["workbench.colorTheme"];
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  }

  function writeUserSettingsTheme(userDataDir: string, themeNameToApply: string): boolean {
    try {
      const userSettingsDir = path.join(userDataDir, "User");
      if (!fs.existsSync(userSettingsDir)) fs.mkdirSync(userSettingsDir, { recursive: true });
      const settingsPath = path.join(userSettingsDir, "settings.json");
      let base: Record<string, unknown> = {};
      if (fs.existsSync(settingsPath)) {
        try {
          base = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
        } catch {
          base = {};
        }
      }
      base["workbench.colorTheme"] = themeNameToApply;
      fs.writeFileSync(settingsPath, JSON.stringify(base, null, 2), "utf-8");
      return true;
    } catch {
      return false;
    }
  }

  async function verifyThemeApplied(): Promise<boolean> {
    for (let attempt = 1; attempt <= 4; attempt++) {
      appliedThemeName = await page
        .evaluate(() => {
          try {
            const w = window as unknown as VscodeRuntimeSurface;
            if (w?.vscode?.workspace?.getConfiguration) {
              try {
                const cfg = w.vscode.workspace.getConfiguration("workbench");
                if (cfg && typeof cfg.get === "function") {
                  const value = cfg.get("colorTheme");
                  return typeof value === "string" ? value : null;
                }
              } catch {}
            }
            return null;
          } catch {
            return null;
          }
        })
        .catch(() => null);

      if (appliedThemeName) {
        const matched = String(appliedThemeName)
          .toLowerCase()
          .includes(String(themeName).toLowerCase().split("—")[0].trim());
        if (matched) {
          themeApplied = true;
          console.log(
            `   🔎 Theme verification succeeded via config (attempt ${attempt}): ${appliedThemeName}`
          );
          return true;
        }
      }

      const bg = await page
        .evaluate(() => {
          try {
            const el =
              document.querySelector(".monaco-editor .view-lines") ||
              document.querySelector(".monaco-workbench");
            if (!el) return null;
            const style = window.getComputedStyle(el as Element);
            return style.backgroundColor || null;
          } catch {
            return null;
          }
        })
        .catch(() => null);
      if (bg && bg !== "rgba(0, 0, 0, 0)") {
        themeApplied = true;
        console.log(
          `   🔎 Theme verification succeeded via background (attempt ${attempt}): ${bg}`
        );
        return true;
      }

      const cssVar = await page
        .evaluate(() => {
          try {
            const doc = document.documentElement;
            const cs = window.getComputedStyle(doc as Element);
            const keys = [
              "--vscode-editor-background",
              "--vscode-editor-foreground",
              "--vscode-sideBar-background",
            ];
            for (const k of keys) {
              const v = cs.getPropertyValue(k);
              const trimmed = v?.trim?.();
              if (trimmed) return `${k}:${trimmed}`;
            }
            return null;
          } catch {
            return null;
          }
        })
        .catch(() => null);
      if (cssVar) {
        appliedThemeName = String(cssVar);
        themeApplied = true;
        console.log(
          `   🔎 Theme verification succeeded via CSS var (attempt ${attempt}): ${cssVar}`
        );
        return true;
      }

      const tokenColor = await page
        .evaluate(() => {
          try {
            const span = document.querySelector(".monaco-editor .view-lines span");
            if (!span) return null;
            const style = window.getComputedStyle(span as Element);
            return style.color || null;
          } catch {
            return null;
          }
        })
        .catch(() => null);
      if (tokenColor && tokenColor !== "rgba(0, 0, 0, 0)") {
        appliedThemeName = String(tokenColor);
        themeApplied = true;
        console.log(
          `   🔎 Theme verification succeeded via token color (attempt ${attempt}): ${tokenColor}`
        );
        return true;
      }

      await page.waitForTimeout(400);
    }

    return false;
  }

  async function reloadWindowAndWait(): Promise<void> {
    await page
      .evaluate(() => {
        try {
          const w = window as unknown as VscodeRuntimeSurface;
          if (w?.vscode?.commands?.executeCommand) {
            w.vscode.commands.executeCommand("workbench.action.reloadWindow");
            return true;
          }
          const cs = (
            window as unknown as {
              commandService?: { executeCommand?: (...args: unknown[]) => unknown };
            }
          )?.commandService;
          if (cs?.executeCommand) {
            cs.executeCommand("workbench.action.reloadWindow");
            return true;
          }
        } catch {}
        return false;
      })
      .catch(() => false);

    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForSelector(".monaco-workbench", { state: "visible", timeout: 60000 });
    await page.waitForTimeout(4000);
  }

  try {
    // Prefer extension-registered command to apply theme (deterministic)
    try {
      // Diagnostic: list available commands and try to activate our extension explicitly
      try {
        const cmds = await page.evaluate(async () => {
          try {
            const w = window as unknown as VscodeRuntimeSurface;
            // Try activating our extension explicitly if available
            try {
              const ext = w?.vscode?.extensions?.getExtension?.("AnselmHahn.caligo-vscode-theme");
              if (ext && typeof ext.activate === "function") {
                try {
                  ext.activate();
                } catch {}
              }
            } catch {}

            if (w?.vscode?.commands?.getCommands) {
              return await w.vscode.commands.getCommands(true);
            }
            return [];
          } catch {
            return [];
          }
        });
        console.log(
          "   🧭 Available commands snapshot:",
          Array.isArray(cmds) ? cmds.slice(0, 40) : cmds
        );
      } catch {}

      const applied = await page
        .evaluate((t: string) => {
          try {
            const w = window as unknown as VscodeRuntimeSurface;
            if (w?.vscode?.commands?.executeCommand) {
              // returns a promise; we don't await it here inside the browser context
              w.vscode.commands.executeCommand("caligo-test.applyTheme", t);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        }, themeName)
        .catch(() => false);

      if (applied) {
        console.log(`   ✅ Theme applied via extension command: ${themeName}`);
        await page.waitForTimeout(800); // Longer wait for theme to fully render
      } else {
        // Fallback: try direct configuration update via VS Code API
        const configApplied = await page
          .evaluate((t: string) => {
            try {
              const w = window as unknown as VscodeRuntimeSurface;
              if (w?.vscode?.workspace?.getConfiguration) {
                const cfg = w.vscode.workspace.getConfiguration();
                if (
                  cfg &&
                  typeof (cfg as unknown as { update?: (...args: unknown[]) => unknown }).update ===
                    "function"
                ) {
                  (cfg as unknown as { update: (...args: unknown[]) => unknown }).update(
                    "workbench.colorTheme",
                    t,
                    true // global
                  );
                  return true;
                }
              }
              return false;
            } catch {
              return false;
            }
          }, themeName)
          .catch(() => false);

        if (configApplied) {
          console.log(`   ✅ Theme applied via direct config update: ${themeName}`);
          await page.waitForTimeout(800);
        } else {
          // Final fallback to UI-driven selection
          await params.selectThemeViaCommandPalette(page, themeName);
        }
      }
    } catch {
      // fallback
      await params.selectThemeViaCommandPalette(page, themeName);
    }

    // Ensure obstructing UI is closed (sidebars/panels) before proceeding
    try {
      await tryCloseSidebarOnce(page).catch(() => {});
    } catch {
      // ignore
    }

    // Verification: check whether the theme actually applied according to workspace config or a visible UI change.
    try {
      const verified = await verifyThemeApplied();
      if (!verified && params.userDataDir) {
        const priorSetting = readUserSettingsTheme(params.userDataDir);
        const wrote = writeUserSettingsTheme(params.userDataDir, themeName);
        console.warn(
          "   ⚠️ Theme verification failed; updating user settings and reloading window. " +
            `previousSetting=${String(priorSetting)}, wrote=${wrote}`
        );
        if (wrote) {
          await reloadWindowAndWait();
          const verifiedAfterReload = await verifyThemeApplied();
          if (!verifiedAfterReload)
            verificationErrors.push("theme-verification-failed-after-reload");
        } else {
          verificationErrors.push("theme-verification-failed-settings-write");
        }
      }

      if (themeApplied)
        console.log(`   ✅ Theme verified: appliedThemeName=${String(appliedThemeName)}`);
      else {
        console.warn(
          `   ⚠️ Theme verification may have failed for '${themeName}' (appliedThemeName=${String(
            appliedThemeName
          )})`
        );
        verificationErrors.push("theme-verification-failed");
      }
    } catch {
      verificationErrors.push("theme-verification-exception");
    }

    // Run caller-provided cleanup (e.g., Escape) as last resort
    try {
      await params.cleanupUI(page);
    } catch {
      // ignore
    }

    // After attempting cleanup, record which UI regions are (still) visible so we can debug obstructing areas.
    try {
      obstructingAreas = await page
        .evaluate(() => {
          try {
            const isVisibleSel = (sel: string) => {
              const el = document.querySelector(sel) as HTMLElement | null;
              if (!el) return false;
              const rect = el.getBoundingClientRect?.();
              if (!rect) return false;
              const style = window.getComputedStyle(el);
              return (
                rect.width > 24 &&
                rect.height > 24 &&
                style.display !== "none" &&
                style.visibility !== "hidden"
              );
            };

            const sidebarSel = [
              ".part.sidebar",
              ".part.sideBar",
              "#workbench\\.parts\\.sidebar",
              ".explorer-viewlet",
            ].join(", ");
            const panelSel = [".part.panel", "#workbench\\.parts\\.panel", ".panel"].join(", ");
            const auxiliarySel = [".part.auxiliarybar", ".auxiliarybar", ".secondary-sidebar"].join(
              ", "
            );

            return {
              sidebar: isVisibleSel(sidebarSel),
              panel: isVisibleSel(panelSel),
              auxiliary: isVisibleSel(auxiliarySel),
            };
          } catch {
            return { sidebar: false, panel: false, auxiliary: false };
          }
        })
        .catch(() => ({ sidebar: false, panel: false, auxiliary: false }));

      if (
        obstructingAreas &&
        (obstructingAreas.sidebar || obstructingAreas.panel || obstructingAreas.auxiliary)
      ) {
        verificationErrors.push(`obstructing-areas:${JSON.stringify(obstructingAreas)}`);
        console.warn("   ⚠️ Obstructing UI regions still open after cleanup:", obstructingAreas);
      }
    } catch {
      // ignore
    }

    for (const lang of languages) {
      // Ensure page focused before opening file
      await page.bringToFront().catch(() => {});

      // open file and wait for tokens/idle (caller owns specifics)
      await params.openFile(page, lang === "typescript" ? "test-samples/typescript-types.ts" : "");

      // Give language servers / tokenizers more time if the editor was cold
      await page.waitForTimeout(Math.max(waitForSemanticTokensMs, 1200));

      // Verification: record which file is active (best-effort) and capture editor diagnostics
      try {
        // Best-effort: find the active editor via VS Code API or fallback to DOM
        try {
          if (!openedFile) {
            const activeFileName = await page
              .evaluate(() => {
                try {
                  const w = window as unknown as VscodeSurface;
                  const ed = w?.vscode?.window?.activeTextEditor;
                  const uri =
                    ed?.document?.uri?.fsPath ||
                    ed?.document?.uri?.path ||
                    ed?.document?.uri?.toString?.();
                  if (typeof uri === "string" && uri.length) return uri.split("/").pop();
                } catch {}
                try {
                  const sel =
                    document.querySelector('[aria-selected="true"]') ||
                    document.querySelector('.tabs-container .tab[aria-selected="true"]');
                  if (sel?.textContent) return sel.textContent.trim().split("\n")[0];
                } catch {}
                return null;
              })
              .catch(() => null as string | null);

            if (activeFileName) {
              openedFile = activeFileName;
            } else {
              const hasEditor = await page
                .evaluate(() => {
                  try {
                    return document.querySelectorAll(".monaco-editor .view-lines span").length > 0;
                  } catch {
                    return false;
                  }
                })
                .catch(() => false);
              if (hasEditor) openedFile = "editor-open";
              else verificationErrors.push("no-active-editor");
            }
          }
        } catch {
          verificationErrors.push("opened-file-verification-exception");
        }

        const editorBg = await page
          .evaluate(() => {
            const el =
              document.querySelector(".monaco-editor .view-lines") ||
              document.querySelector(".monaco-workbench");
            if (!el) return null as string | null;
            const style = window.getComputedStyle(el as Element);
            return style.backgroundColor || null;
          })
          .catch(() => null as string | null);

        const firstLine = await page
          .evaluate(() => {
            try {
              const span = document.querySelector(".monaco-editor .view-lines span");
              return span ? (span.textContent || "").slice(0, 200) : null;
            } catch {
              return null;
            }
          })
          .catch(() => null as string | null);

        console.log(
          `   🖌 Editor background: ${String(editorBg)}; snippet: ${String(firstLine).slice(0, 120)}`
        );
      } catch {
        // ignore diagnostics failing but record if needed
        verificationErrors.push("editor-diagnostic-exception");
      }

      // Ensure sidebars/panels are closed again before screenshot
      try {
        await tryCloseSidebarOnce(page).catch(() => {});
      } catch {
        // ignore
      }

      // Extra small pause for layout stablization
      await page.waitForTimeout(200);

      const screenshotName = `${slugifyForFilename(themeName)}-${lang}.png`;
      const screenshotPath = path.join(outputDir, screenshotName);
      try {
        // Ensure any existing screenshot is removed so we always write fresh output
        try {
          if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
            console.log("   🧹 Removed existing screenshot:", screenshotPath);
          }
        } catch {
          // ignore file removal failures
        }

        await params.takeScreenshot(page, screenshotPath);
        try {
          const ok = fs.existsSync(screenshotPath);
          console.log("   📸 Screenshot written:", screenshotPath, "exists:", ok);
        } catch (e) {
          console.warn("   ⚠️ Could not verify screenshot file after capture:", String(e));
        }
      } catch (e) {
        console.warn("   ⚠️ takeScreenshot failed:", String(e));
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) errors.push(err.message);
    else errors.push(String(err));
  }

  const durationMs = Date.now() - start;

  const verification = verificationErrors.length > 0 ? verificationErrors : undefined;
  return {
    theme: themeName,
    durationMs,
    errors: errors.length > 0 ? errors : undefined,
    themeApplied: themeApplied ?? undefined,
    appliedThemeName: appliedThemeName ?? null,
    openedFile: openedFile ?? null,
    verificationErrors: verification,
    obstructingAreas: obstructingAreas ?? undefined,
  } as ThemeTiming & { errors?: string[] };
}

export function recordLaunch(report: ScreenshotReport) {
  report.electronLaunchCount = (report.electronLaunchCount ?? 0) + 1;
}

export function recordThemeTiming(report: ScreenshotReport, timing: ThemeTiming) {
  if (!report.themeTimings) report.themeTimings = [];
  report.themeTimings.push(timing);
}

export function writeReportAtomic(report: ScreenshotReport, targetPath: string) {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${targetPath}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(report, null, 2), "utf-8");
  fs.renameSync(tmp, targetPath);
}

function slugifyForFilename(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}
