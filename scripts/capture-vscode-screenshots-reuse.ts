/**
 * Reuse-first VS Code Theme Screenshot Automation (new)
 *
 * This script implements a reuse-first flow: it launches VS Code/Electron once,
 * iterates all requested themes, and captures screenshots. It emits an
 * instrumentation JSON at `build/screenshots-report.json` to validate that
 * a single Electron instance was used and to capture per-theme timings.
 *
 * CLI: run with `npx tsx scripts/capture-vscode-screenshots-reuse.ts [--full|--aurora-demo|--balanced-demo] --lang typescript`
 * Defaults: reuse-window = true (opt-out with --no-reuse-window)
 */

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { Page } from "playwright";
import {
  captureThemeInOpenApp,
  recordThemeTiming,
  type ScreenshotReport,
  startApp,
  stopApp,
  writeReportAtomic,
} from "./lib/screenshot-core";
import { openFile, selectThemeViaCommandPalette, tryCloseSidebarOnce } from "./lib/theme-utils";

interface VscodeThemeContribution {
  label?: string;
}

interface VscodeExtensionPackageJson {
  contributes?: { themes?: VscodeThemeContribution[] };
}

interface VscodeExtensionInfo {
  id?: string;
  isActive?: boolean;
  packageJSON?: VscodeExtensionPackageJson;
}

interface VscodeTextDocument {
  fileName?: string;
}

interface VscodeTextEditor {
  document?: VscodeTextDocument;
}

interface VscodeApi {
  workspace?: { openTextDocument?: (uri: unknown) => Promise<unknown> };
  commands?: {
    executeCommand?: (...args: unknown[]) => Promise<unknown>;
    getCommands?: (filterInternal?: boolean) => Promise<string[]>;
  };
  extensions?: {
    all?: VscodeExtensionInfo[];
    getExtension?: (id: string) => { activate?: () => Promise<unknown> } | undefined;
  };
  window?: {
    showTextDocument?: (doc: unknown) => Promise<unknown> | unknown;
    visibleTextEditors?: VscodeTextEditor[];
    activeTextEditor?: VscodeTextEditor;
  };
  Uri?: { file?: (path: string) => unknown };
}

interface ExtensionSnapshot {
  id?: string;
  isActive?: boolean;
  themes: string[];
}

const REPORT_PATH = path.join(process.cwd(), "build", "screenshots-report.json");

function _readArgValue(args: string[], flag: string): string | undefined {
  const eq = args.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return undefined;
}

function readContributedThemes(): string[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")) as {
    contributes?: { themes?: Array<{ label?: string }> };
  };
  const contributedLabels = (pkg.contributes?.themes ?? []).reduce<string[]>((acc, theme) => {
    if (theme?.label) acc.push(theme.label);
    return acc;
  }, []);
  return contributedLabels.length > 0
    ? (contributedLabels as string[])
    : ["Caligo (Aurora Noir — Balanced)"];
}

function selectThemes(
  allThemes: string[],
  opts: {
    useFull: boolean;
    useAuroraDemo: boolean;
    useMandarianDemo: boolean;
    useBalancedDemo: boolean;
  }
): string[] {
  const demoThemes = allThemes.slice(0, 4);
  if (opts.useAuroraDemo)
    return allThemes.reduce<string[]>((acc, theme) => {
      if (theme.toLowerCase().includes("aurora noir")) acc.push(theme);
      return acc;
    }, []);
  if (opts.useMandarianDemo)
    return allThemes.reduce<string[]>((acc, theme) => {
      if (theme.toLowerCase().includes("mandarian")) acc.push(theme);
      return acc;
    }, []);
  if (opts.useBalancedDemo)
    return allThemes
      .reduce<string[]>((acc, theme) => {
        if (/balanced\)$/i.test(theme)) acc.push(theme);
        return acc;
      }, [])
      .slice(0, 10);
  return opts.useFull ? allThemes : demoThemes;
}

function ensureOutputDir(outputDir: string) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Clean up any existing screenshots to enforce fresh captures (prevents stale/duplicate images)
  try {
    const existing = fs.readdirSync(outputDir).reduce<string[]>((acc, file) => {
      if (file.endsWith(".png")) acc.push(file);
      return acc;
    }, []);
    if (existing.length > 0) {
      console.log(`🧹 Removing ${existing.length} existing screenshot(s) from ${outputDir}`);
      for (const f of existing) {
        try {
          fs.unlinkSync(path.join(outputDir, f));
        } catch {
          // ignore individual unlink failures
        }
      }
    }
  } catch {
    // best-effort cleanup
  }
}

function ensureThemesGenerated() {
  console.log("🔨 Ensuring themes are generated...");
  const gen = spawnSync("npm", ["run", "generate"], { stdio: "inherit" });
  if (gen.status !== 0) {
    console.error("Failed to generate themes.");
    process.exit(1);
  }
}

function resolveVscodeExecutable(): string {
  const vscodePathEnv = process.env.CODE_EXECUTABLE;
  let vscodePath = vscodePathEnv ?? "";
  if (!vscodePath) {
    const whichRes = spawnSync("which", ["code"], { encoding: "utf-8" });
    if (whichRes.status === 0 && whichRes.stdout) vscodePath = whichRes.stdout.trim();
  }
  if (!vscodePath) {
    console.error(
      "VS Code CLI ('code') not found. Please install VS Code or set CODE_EXECUTABLE env var."
    );
    process.exit(1);
  }

  // If 'code' is a wrapper script, resolve to the real electron binary (e.g. /usr/share/code/code)
  try {
    const rl = spawnSync("readlink", ["-f", vscodePath], { encoding: "utf-8" });
    if (rl.status === 0 && rl.stdout) {
      const resolved = rl.stdout.trim();
      // If resolved points to a 'bin/code' helper, map to parent '..' + '/code'
      if (resolved.endsWith("/bin/code")) {
        const candidate = path.join(path.dirname(path.dirname(resolved)), "code");
        if (fs.existsSync(candidate)) {
          vscodePath = candidate;
        }
      } else if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        // Use the resolved path if it's a real file (likely the electron binary)
        vscodePath = resolved;
      }
    }
  } catch (_e) {
    // ignore; fall back to whatever we found
  }

  return vscodePath;
}

function stageWorkspaceSamples(workspaceDir: string) {
  const sampleSrc = path.join(process.cwd(), "tests", "screenshots", "test-samples");
  const sampleDst = path.join(workspaceDir, "test-samples");
  try {
    if (!fs.existsSync(workspaceDir)) fs.mkdirSync(workspaceDir, { recursive: true });
    // Copy only if destination missing or empty
    const dstEmpty = !fs.existsSync(sampleDst) || fs.readdirSync(sampleDst).length === 0;
    if (fs.existsSync(sampleSrc) && dstEmpty) {
      console.log("🔧 Staging test samples into workspace:", sampleDst);
      fs.cpSync(sampleSrc, sampleDst, { recursive: true });
    }
  } catch (err) {
    console.warn("⚠️ Failed to stage test samples into workspace:", String(err));
  }
}

function getCodeArgs(): string[] {
  return (
    process.env.CODE_ARGS ||
    "--disable-workspace-trust --no-sandbox --disable-gpu --disable-dev-shm-usage"
  )
    .split(/\s+/)
    .reduce<string[]>((acc, arg) => {
      if (arg) acc.push(arg);
      return acc;
    }, []);
}

async function ensureExtensionRegistered(page: Page, extId: string, timeoutMs = 10000) {
  const start = Date.now();
  let lastSnapshot: ExtensionSnapshot[] = [];
  while (Date.now() - start < timeoutMs) {
    const snapshot = await page
      .evaluate(() => {
        try {
          const exts = (window as unknown as { vscode?: VscodeApi })?.vscode?.extensions?.all ?? [];
          return exts.map((e: VscodeExtensionInfo) => ({
            id: e.id,
            isActive: Boolean(e.isActive),
            themes: (e.packageJSON?.contributes?.themes ?? []).reduce<string[]>((acc, theme) => {
              if (theme?.label) acc.push(theme.label);
              return acc;
            }, []),
          }));
        } catch {
          return [] as ExtensionSnapshot[];
        }
      })
      .catch(() => [] as ExtensionSnapshot[]);
    lastSnapshot = snapshot;

    const found = snapshot.find((e: ExtensionSnapshot) => e.id === extId);
    if (found?.themes?.length) return { registered: true, found, snapshot };

    // If the extension exists but isn't active, try activating it
    if (found && !found.isActive) {
      await page
        .evaluate(async (id: string) => {
          try {
            const w = window as unknown as { vscode?: VscodeApi };
            const ext = w?.vscode?.extensions?.getExtension?.(id);
            if (ext && typeof ext.activate === "function") {
              await ext.activate();
              return true;
            }
          } catch {}
          return false;
        }, extId)
        .catch(() => false);
    }

    await page.waitForTimeout(500);
  }
  return { registered: false, snapshot: lastSnapshot };
}

async function runInitialSetupOnce(
  page: Page,
  workspaceDir: string
): Promise<{
  openedSample: boolean;
  hidSecondarySideBar: boolean;
  logs?: string[];
}> {
  const logs: string[] = [];

  // Helper: wait for the VS Code API surface to be available
  async function waitForVscodeApi(timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ok = await page
          .evaluate(() => {
            try {
              const w = window as unknown as { vscode?: VscodeApi };
              return Boolean(
                w?.vscode &&
                  (typeof w.vscode.workspace?.openTextDocument === "function" ||
                    typeof w.vscode.commands?.executeCommand === "function" ||
                    typeof w.vscode.extensions?.getExtension === "function")
              );
            } catch {
              return false;
            }
          })
          .catch(() => false);
        if (ok) return true;
      } catch {
        // ignore
      }
      await page.waitForTimeout(500);
    }
    return false;
  }

  // 1) Open a TypeScript sample to create an editor (preferred over invoking native file dialog)
  let openedSample = false;
  try {
    const sample = path.join(workspaceDir, "test-samples", "typescript-types.ts");
    if (fs.existsSync(sample)) {
      logs.push(`Sample exists: ${sample}`);

      // Wait for API to be ready (best-effort)
      const apiReady = await waitForVscodeApi(8000);
      logs.push(`vscode api ready: ${apiReady}`);

      // Try API-first open with retries
      const basename = path.basename(sample);
      for (let attempt = 1; attempt <= 4 && !openedSample; attempt++) {
        logs.push(`open-sample attempt ${attempt}`);
        try {
          const res = await page
            .evaluate(async (fp: string) => {
              try {
                const w = window as unknown as { vscode?: VscodeApi };
                if (w?.vscode?.workspace?.openTextDocument && w?.vscode?.Uri?.file) {
                  try {
                    const doc = await w.vscode.workspace.openTextDocument(w.vscode.Uri.file(fp));
                    await w.vscode.window?.showTextDocument?.(doc);
                    return { ok: true, method: "workspace.openTextDocument" };
                  } catch {
                    // fallthrough
                  }
                }

                if (w?.vscode?.commands?.executeCommand) {
                  try {
                    await w.vscode.commands.executeCommand(
                      "vscode.open",
                      w?.vscode?.Uri?.file ? w.vscode.Uri.file(fp) : `file://${fp}`
                    );
                    return { ok: true, method: "commands.executeCommand" };
                  } catch {}
                }

                return { ok: false };
              } catch {
                return { ok: false };
              }
            }, sample)
            .catch(() => ({ ok: false }) as { ok: boolean; method?: string });

          logs.push(`open-sample eval result: ${JSON.stringify(res)}`);

          // Verify editor opened by checking visible editors via API or DOM
          const verified = await page
            .evaluate((bn: string) => {
              try {
                const w = window as unknown as { vscode?: VscodeApi };
                // API-level check
                if (w?.vscode?.window?.visibleTextEditors?.some) {
                  try {
                    const found = w.vscode.window.visibleTextEditors.some((e: VscodeTextEditor) =>
                      (e.document?.fileName || "").includes(bn)
                    );
                    if (found) return true;
                  } catch {}
                }
                // DOM fallback: find aria-labels
                try {
                  const tabs = Array.from(
                    document.querySelectorAll("[aria-label]")
                  ) as HTMLElement[];
                  return tabs.some(t => (t.getAttribute("aria-label") || "").includes(bn));
                } catch {
                  return false;
                }
              } catch {
                return false;
              }
            }, basename)
            .catch(() => false);

          logs.push(`open-sample verification: ${verified}`);
          if (verified) {
            openedSample = true;
            break;
          }
        } catch (e) {
          logs.push(`open-sample exception: ${String(e)}`);
        }

        await page.waitForTimeout(600);
      }

      // If API-first attempts didn't open the sample, fall back to the openFile helper which implements
      // QuickOpen / explorer click / untitled injection fallback strategies.
      if (!openedSample) {
        logs.push("API attempts failed; falling back to openFile helper");
        try {
          await openFile(page, "test-samples/typescript-types.ts", workspaceDir);
          await page.waitForTimeout(600);

          const foundFallback = await page
            .evaluate((bn: string) => {
              try {
                const w = window as unknown as { vscode?: VscodeApi };
                if (w?.vscode?.window?.visibleTextEditors?.some) {
                  try {
                    return w.vscode.window.visibleTextEditors.some((e: VscodeTextEditor) =>
                      (e.document?.fileName || "").includes(bn)
                    );
                  } catch {}
                }
                try {
                  const tabs = Array.from(
                    document.querySelectorAll("[aria-label]")
                  ) as HTMLElement[];
                  return tabs.some(t => (t.getAttribute("aria-label") || "").includes(bn));
                } catch {
                  return false;
                }
              } catch {
                return false;
              }
            }, path.basename(sample))
            .catch(() => false);

          logs.push(`openFile fallback verification: ${foundFallback}`);
          if (foundFallback) openedSample = true;
        } catch (e) {
          logs.push(`openFile fallback exception: ${String(e)}`);
        }

        // If helper fallback didn't open the file, try invoking our extension command that opens files
        if (!openedSample) {
          logs.push("openFile helper failed; trying extension command caligo-test.openFile");
          try {
            // Ask extension to activate then call its helper command
            await page
              .evaluate(() => {
                try {
                  const w = window as unknown as { vscode?: VscodeApi };
                  const ext = w?.vscode?.extensions?.getExtension?.(
                    "AnselmHahn.caligo-vscode-theme"
                  );
                  if (ext && typeof ext.activate === "function")
                    try {
                      ext.activate();
                    } catch {}
                } catch {}
              })
              .catch(() => {});

            const extRes = await page
              .evaluate(async (fp: string) => {
                try {
                  const w = window as unknown as { vscode?: VscodeApi };
                  if (w?.vscode?.commands?.executeCommand) {
                    try {
                      const r = await w.vscode.commands.executeCommand("caligo-test.openFile", fp);
                      return { ok: Boolean(r) };
                    } catch (e) {
                      return { ok: false, err: String(e) };
                    }
                  }
                  return { ok: false, err: "commands unavailable" };
                } catch (e) {
                  return { ok: false, err: String(e) };
                }
              }, sample)
              .catch(() => ({ ok: false }));

            logs.push(`extension openFile result: ${JSON.stringify(extRes)}`);

            if (extRes?.ok) {
              // verify open
              const extVerified = await page
                .evaluate((bn: string) => {
                  try {
                    const w = window as unknown as { vscode?: VscodeApi };
                    if (w?.vscode?.window?.visibleTextEditors?.some) {
                      try {
                        return w.vscode.window.visibleTextEditors.some((e: VscodeTextEditor) =>
                          (e.document?.fileName || "").includes(bn)
                        );
                      } catch {}
                    }
                    try {
                      const tabs = Array.from(
                        document.querySelectorAll("[aria-label]")
                      ) as HTMLElement[];
                      return tabs.some(t => (t.getAttribute("aria-label") || "").includes(bn));
                    } catch {
                      return false;
                    }
                  } catch {
                    return false;
                  }
                }, path.basename(sample))
                .catch(() => false);

              logs.push(`extension openFile verification: ${extVerified}`);
              if (extVerified) openedSample = true;
            }
          } catch (e) {
            logs.push(`extension openFile exception: ${String(e)}`);
          }
        }
      }
    } else {
      logs.push("Sample file missing on disk");
    }
  } catch (err) {
    logs.push(`open error: ${String(err)}`);
  }

  // 2) Hide the secondary side bar via command API when available (with retries)
  let hidSecondarySideBar = false;
  try {
    const cmdCandidates = [
      "workbench.action.toggleSecondarySideBarVisibility",
      "workbench.action.hideSecondarySideBar",
      "workbench.action.closeSecondarySideBar",
      "workbench.action.toggleSecondarySideBar",
    ];

    // also include auxiliary-specific commands as fallback
    const auxCmdCandidates = [
      "workbench.action.hideAuxiliaryBar",
      "workbench.action.toggleAuxiliaryBar",
      "workbench.action.toggleSecondarySideBarVisibility",
    ];

    const apiReady = await waitForVscodeApi(8000);
    logs.push(`vscode api ready for commands: ${apiReady}`);

    if (apiReady) {
      for (let attempt = 1; attempt <= 4 && !hidSecondarySideBar; attempt++) {
        logs.push(`hide-secondary attempt ${attempt}`);
        try {
          // Get available commands to choose the correct id
          const commands: string[] = (await page
            .evaluate(async () => {
              try {
                const w = window as unknown as { vscode?: VscodeApi };
                if (w?.vscode?.commands?.getCommands) {
                  return await w.vscode.commands.getCommands(true);
                }
              } catch {}
              return [] as string[];
            })
            .catch(() => [])) as string[];

          logs.push(`available commands snapshot (count=${commands.length})`);

          // Pick a candidate that exists
          const found = cmdCandidates.find(c => commands.includes(c));
          if (found) {
            logs.push(`executing command id: ${found}`);
            await page
              .evaluate(async (c: string) => {
                try {
                  const w = window as unknown as { vscode?: VscodeApi };
                  await w?.vscode?.commands?.executeCommand?.(c);
                } catch {}
              }, found)
              .catch(() => {});
          } else {
            // Fallback: try some known ids anyway
            logs.push(
              "no matching command id found; trying common ids via executeCommand fallback"
            );
            for (const c of cmdCandidates) {
              await page
                .evaluate(async (cc: string) => {
                  try {
                    const w = window as unknown as { vscode?: VscodeApi };
                    if (w?.vscode?.commands?.executeCommand)
                      await w.vscode.commands.executeCommand(cc);
                  } catch {}
                }, c)
                .catch(() => {});
            }
          }

          // Verify via DOM whether auxiliary sidebar is visible
          const visible = await page
            .evaluate(() => {
              try {
                const aux = document.querySelector(
                  ".part.auxiliarybar, .auxiliarybar, .secondary-sidebar"
                );
                if (!aux) return false;
                const rect = aux.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(aux as Element);
                return (
                  rect.width > 16 &&
                  rect.height > 16 &&
                  style.display !== "none" &&
                  style.visibility !== "hidden"
                );
              } catch {
                return false;
              }
            })
            .catch(() => false);

          logs.push(`aux visible after attempt: ${visible}`);
          if (!visible) {
            // mark as hidden after verification below (avoid premature short-circuit)
            hidSecondarySideBar = true;
            break;
          }
        } catch (e) {
          logs.push(`hide-secondary exception: ${String(e)}`);
        }

        await page.waitForTimeout(600);
      }
    } else {
      logs.push("vscode API not ready for commands; skipping command-based hide attempts");
    }

    // Last resort: attempt programmatic executeCommand first, then Command Palette fallback (label-based)
    if (!hidSecondarySideBar) {
      try {
        logs.push("Attempting programmatic executeCommand fallback to hide secondary side bar");
        // Try executing a known auxiliary/hide command even if initial apiReady was false
        await page
          .evaluate(async (auxCmds: string[]) => {
            try {
              const w = window as unknown as { vscode?: VscodeApi };
              for (const c of auxCmds) {
                try {
                  if (w?.vscode?.commands?.executeCommand)
                    await w.vscode.commands.executeCommand(c);
                } catch {}
              }
            } catch {}
          }, auxCmdCandidates)
          .catch(() => {});

        // Verify quickly if it worked
        let visible = await page
          .evaluate(() => {
            try {
              const aux = document.querySelector(
                ".part.auxiliarybar, .auxiliarybar, .secondary-sidebar"
              );
              if (!aux) return false;
              const rect = aux.getBoundingClientRect?.();
              if (!rect) return false;
              const style = window.getComputedStyle(aux as Element);
              return (
                rect.width > 16 &&
                rect.height > 16 &&
                style.display !== "none" &&
                style.visibility !== "hidden"
              );
            } catch {
              return false;
            }
          })
          .catch(() => false);

        if (!visible) {
          hidSecondarySideBar = true;
        } else {
          // If programmatic didn't work, fall back to Command Palette but ensure the quick input opened
          logs.push("Attempting Command Palette fallback to hide secondary side bar");
          const chordModifier = process.platform === "darwin" ? "Meta" : "Control";
          await page.keyboard.press(`${chordModifier}+Shift+P`).catch(() => {});
          // Wait for quick-pick to appear before typing; otherwise typing may go into editor
          await page
            .waitForSelector(".quick-input-list", { state: "visible", timeout: 2000 })
            .catch(() => {});
          await page.waitForTimeout(120);
          await page.keyboard.type("View: Hide Secondary Side Bar", { delay: 40 });
          await page.keyboard.press("Enter").catch(() => {});
          await page.waitForTimeout(400);

          visible = await page
            .evaluate(() => {
              try {
                const aux = document.querySelector(
                  ".part.auxiliarybar, .auxiliarybar, .secondary-sidebar"
                );
                if (!aux) return false;
                const rect = aux.getBoundingClientRect?.();
                if (!rect) return false;
                const style = window.getComputedStyle(aux as Element);
                return (
                  rect.width > 16 &&
                  rect.height > 16 &&
                  style.display !== "none" &&
                  style.visibility !== "hidden"
                );
              } catch {
                return false;
              }
            })
            .catch(() => false);
          if (!visible) {
            hidSecondarySideBar = true;
          }
          logs.push(`Command Palette fallback result visible=${visible}`);
        }
      } catch (e) {
        logs.push(`Command Palette hide exception: ${String(e)}`);
      }
    }
  } catch (err) {
    logs.push(`hide-secondary error: ${String(err)}`);
  }

  return { openedSample, hidSecondarySideBar, logs };
}

async function main() {
  const args = process.argv.slice(2);
  const useFull = args.includes("--full") || args.includes("--all");
  const useAuroraDemo = args.includes("--aurora-demo");
  const useMandarianDemo = args.includes("--mandarian-demo");
  const useBalancedDemo = args.includes("--balanced-demo");
  const reuseWindow = !args.includes("--no-reuse-window");
  const customOutputDir = _readArgValue(args, "--output");

  const allThemes = readContributedThemes();
  const selectedThemes = selectThemes(allThemes, {
    useFull,
    useAuroraDemo,
    useMandarianDemo,
    useBalancedDemo,
  });

  const languages = ["typescript"];
  const outputDir = customOutputDir || path.join(process.cwd(), "tmp-screenshots-reuse");
  ensureOutputDir(outputDir);
  const workspaceDir = path.join(process.cwd(), "tests", "screenshots", "workspace");

  const report: ScreenshotReport = {
    startTime: new Date().toISOString(),
    electronLaunchCount: 0,
    themeTimings: [],
    environment: { reuseMode: reuseWindow ? "single" : "per-theme" },
  };

  // Ensure themes are generated (delegate to npm script - reuse the project's existing command)
  ensureThemesGenerated();

  if (reuseWindow) {
    // Start a single app and iterate
    const vscodePath = resolveVscodeExecutable();

    // Prepare workspace: ensure test-samples are staged into the workspace folder so Explorer shows them
    stageWorkspaceSamples(workspaceDir);

    // Include --disable-workspace-trust to avoid interactive trust prompts in headless/CI runs
    const codeArgs = getCodeArgs();

    console.log("📣 Starting VS Code with:", {
      vscodePath,
      codeArgs,
      envSnapshot: {
        DEBUG: process.env.DEBUG,
        CODE_ARGS: process.env.CODE_ARGS,
        ELECTRON_ENABLE_LOGGING: process.env.ELECTRON_ENABLE_LOGGING,
        ELECTRON_ENABLE_STACK_DUMPING: process.env.ELECTRON_ENABLE_STACK_DUMPING,
      },
    });

    // Prefer opening the sample file on startup (makes editor creation deterministic in headless runs)
    const initialSampleFile = path.join(workspaceDir, "test-samples", "typescript-types.ts");
    const { app, page, userDataDir } = await startApp({
      vscodePath,
      extensionPath: process.cwd(),
      workspacePath: workspaceDir,
      args: [...codeArgs, workspaceDir, initialSampleFile],
      runRoot: "/tmp/caligo-vscode-playwright",
    });

    // If the editor opened the initial sample during launch, record that now (best-effort)
    try {
      const active = await page
        .evaluate(() => {
          try {
            const w = window as unknown as { vscode?: VscodeApi };
            const ed = w?.vscode?.window?.activeTextEditor;
            const activeFile = ed?.document?.fileName;
            if (activeFile) return activeFile;
            return null;
          } catch {
            return null;
          }
        })
        .catch(() => null as string | null);
      if (active) console.log("   📂 Active editor at launch:", active.split("/").pop());
    } catch {}

    // Diagnostic: list installed extensions and which themes they contribute (helps detect whether our themes are registered)
    try {
      const extThemes = await page
        .evaluate(() => {
          try {
            const w = window as unknown as { vscode?: VscodeApi };
            const exts = w?.vscode?.extensions?.all ?? [];
            return exts.map((e: VscodeExtensionInfo) => ({
              id: e.id,
              themes: (e.packageJSON?.contributes?.themes ?? []).reduce<string[]>((acc, theme) => {
                if (theme?.label) acc.push(theme.label);
                return acc;
              }, []),
            }));
          } catch {
            return [] as ExtensionSnapshot[];
          }
        })
        .catch(() => [] as ExtensionSnapshot[]);
      console.log(
        "   🧾 Extensions and their themes (sample):",
        JSON.stringify(extThemes.slice(0, 20))
      );
    } catch {
      // ignore
    }

    // Ensure the local extension is registered and that it contributes themes.
    try {
      const extCheck = await ensureExtensionRegistered(
        page,
        "AnselmHahn.caligo-vscode-theme",
        12000
      );
      report.environment = {
        ...(report.environment ?? {}),
        extensionRegistered: Boolean(extCheck.registered),
        extThemesSnapshot: extCheck.snapshot,
      };
      console.log(
        "   🧾 Extension registration check:",
        extCheck.registered,
        "snapshot size:",
        (extCheck.snapshot || []).length
      );
      if (!extCheck.registered)
        console.warn(
          "   ⚠️ Extension not fully registered or themes not available in the runtime snapshots"
        );
    } catch (e) {
      console.warn("   ⚠️ ensureExtensionRegistered failed:", String(e));
    }

    // Run one-time initial setup actions that help stabilize the workbench before we start capturing.
    // These steps are intentionally run once at startup (not per-theme):
    //  1) Open a sample file (equivalent to "File: Open File...") to ensure an editor exists
    //  2) Hide the Secondary Side Bar ("View: Hide Secondary Side Bar") to reduce obstructing areas
    try {
      const closed = await tryCloseSidebarOnce(page).catch(e => {
        console.warn("   ⚠️ tryCloseSidebarOnce failed:", String(e));
        return false;
      });
      if (closed) report.environment = { ...(report.environment ?? {}), closedObstructingUI: true };

      // Run one-time initial setup (open file + hide secondary side bar)
      try {
        const initialSetup = await runInitialSetupOnce(page, workspaceDir);
        report.environment = { ...(report.environment ?? {}), initialSetup };
        if (!initialSetup.openedSample)
          console.warn("   ⚠️ Initial setup did not open sample file as expected");
        if (!initialSetup.hidSecondarySideBar)
          console.warn("   ⚠️ Initial setup did not hide secondary side bar as expected");
        if (initialSetup.logs?.length)
          console.log("   🧾 Initial setup logs:", initialSetup.logs.join(" | "));
      } catch (err) {
        console.warn("   ⚠️ runInitialSetupOnce failed:", String(err));
      }
    } catch {
      // no-op
    }

    try {
      report.electronLaunchCount = (report.electronLaunchCount ?? 0) + 1;

      for (const theme of selectedThemes) {
        const _tStart = Date.now();
        const res = await captureThemeInOpenApp({
          page,
          themeName: theme,
          languages,
          workspacePath: workspaceDir,
          outputDir,
          waitForSemanticTokensMs: 3000,
          userDataDir,
          takeScreenshot: async (p: Page, dest: string) => {
            await p.screenshot({ path: dest });
          },
          openFile: async (p: Page, filePath: string) => {
            await openFile(p, filePath, workspaceDir);
          },
          cleanupUI: async (p: Page) => {
            await tryCloseSidebarOnce(p).catch(() => {});
            await p.keyboard.press("Escape").catch(() => {});
          },
          selectThemeViaCommandPalette: selectThemeViaCommandPalette,
        });

        recordThemeTiming(report, {
          theme: res.theme,
          durationMs: res.durationMs,
          themeApplied: res.themeApplied,
          appliedThemeName: res.appliedThemeName,
          openedFile: res.openedFile,
          verificationErrors: res.verificationErrors,
          obstructingAreas: res.obstructingAreas,
        });

        if (res.errors) {
          report.errors = (report.errors ?? []).concat(
            res.errors.map((e: string) => ({ theme: res.theme, step: "capture", message: e }))
          );
        }

        if (res.verificationErrors) {
          report.errors = (report.errors ?? []).concat(
            res.verificationErrors.map((m: string) => ({
              theme: res.theme,
              step: "verification",
              message: m,
            }))
          );
        }
      }
    } finally {
      await stopApp(app);
    }
  } else {
    // Per-theme (legacy-like) behavior: launch per theme (kept for parity/testing)
    stageWorkspaceSamples(workspaceDir);
    for (const theme of selectedThemes) {
      report.electronLaunchCount = (report.electronLaunchCount ?? 0) + 1;
      const vscodePathEnv = process.env.CODE_EXECUTABLE;
      let vscodePath = vscodePathEnv;
      if (!vscodePath) {
        const whichRes = spawnSync("which", ["code"], { encoding: "utf-8" });
        if (whichRes.status === 0 && whichRes.stdout) vscodePath = whichRes.stdout.trim();
      }
      if (!vscodePath) {
        console.error(
          "VS Code CLI ('code') not found. Please install VS Code or set CODE_EXECUTABLE env var."
        );
        process.exit(1);
      }

      const codeArgs = (
        process.env.CODE_ARGS || "--no-sandbox --disable-gpu --disable-dev-shm-usage"
      )
        .split(/\s+/)
        .reduce<string[]>((acc, arg) => {
          if (arg) acc.push(arg);
          return acc;
        }, []);
      const sampleFile = path.join(
        process.cwd(),
        "tests",
        "screenshots",
        "test-samples",
        "typescript-types.ts"
      );
      const { app, page, userDataDir } = await startApp({
        vscodePath,
        extensionPath: process.cwd(),
        workspacePath: workspaceDir,
        args: [...codeArgs, workspaceDir, sampleFile],
        runRoot: "/tmp/caligo-vscode-playwright",
        colorTheme: theme,
      });
      try {
        const res = await captureThemeInOpenApp({
          page,
          themeName: theme,
          languages,
          workspacePath: workspaceDir,
          outputDir,
          waitForSemanticTokensMs: 3000,
          userDataDir,
          takeScreenshot: async (p: Page, dest: string) => {
            await p.screenshot({ path: dest });
          },
          openFile: async (p: Page, filePath: string) => {
            await openFile(p, filePath, workspaceDir);
          },
          selectThemeViaCommandPalette: async (p: Page, themeName: string) => {
            // Actually try to select the theme via command palette
            await selectThemeViaCommandPalette(p, themeName);
          },
          cleanupUI: async (p: Page) => {
            await tryCloseSidebarOnce(p).catch(() => {});
          },
        });
        recordThemeTiming(report, {
          theme: res.theme,
          durationMs: res.durationMs,
          themeApplied: res.themeApplied,
          appliedThemeName: res.appliedThemeName,
          openedFile: res.openedFile,
          verificationErrors: res.verificationErrors,
          obstructingAreas: res.obstructingAreas,
        });

        if (res.errors) {
          report.errors = (report.errors ?? []).concat(
            res.errors.map((e: string) => ({ theme: res.theme, step: "capture", message: e }))
          );
        }

        if (res.verificationErrors) {
          report.errors = (report.errors ?? []).concat(
            res.verificationErrors.map((m: string) => ({
              theme: res.theme,
              step: "verification",
              message: m,
            }))
          );
        }
      } finally {
        await stopApp(app);
      }
    }
  }

  report.endTime = new Date().toISOString();
  report.totalDurationMs = Date.now() - new Date(report.startTime).getTime();
  writeReportAtomic(report, REPORT_PATH);
  console.log(`✅ Wrote instrumentation: ${REPORT_PATH}`);
  if (report.electronLaunchCount && report.electronLaunchCount > 1) {
    console.warn("⚠️ electronLaunchCount > 1 — investigate why multiple launches happened.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
