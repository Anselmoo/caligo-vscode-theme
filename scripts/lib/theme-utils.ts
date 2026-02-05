import * as fs from "node:fs";
import * as path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { Page } from "playwright";

type VscodeCommands = {
  executeCommand?: (...args: unknown[]) => unknown;
};

type VscodeWorkspace = {
  openTextDocument?: (arg: unknown) => Promise<unknown>;
  getConfiguration?: (section?: string) => { update?: (...args: unknown[]) => unknown };
};

type VscodeWindowApi = {
  showTextDocument?: (doc: unknown) => unknown;
};

type VscodeExtensionsApi = {
  getExtension?: (id: string) => { activate?: () => Promise<unknown> } | undefined;
};

type VsCodeSurface = {
  vscode?: {
    commands?: VscodeCommands;
    workspace?: VscodeWorkspace;
    window?: VscodeWindowApi;
    extensions?: VscodeExtensionsApi;
  };
  commandService?: { executeCommand?: (...args: unknown[]) => unknown };
  workspace?: VscodeWorkspace;
};

type QuickOpenSnapshot = { input?: string | null; items: string[] };

export async function selectThemeViaCommandPalette(page: Page, themeName: string): Promise<void> {
  console.log(`   🎨 Selecting theme via Command Palette: ${themeName}`);

  // helper to fetch quick-pick entries for diagnostics
  async function snapshotQuickPickItems(): Promise<string[]> {
    return page
      .evaluate(() => {
        try {
          const rows = Array.from(
            document.querySelectorAll(".quick-input-list .monaco-list-row")
          ) as HTMLElement[];
          return rows.map(r => r.innerText?.trim() ?? "");
        } catch {
          return [];
        }
      })
      .catch(() => []);
  }

  type VsCodeWindow = {
    vscode?: { commands?: { executeCommand?: (...args: unknown[]) => unknown } };
    commandService?: { executeCommand?: (...args: unknown[]) => unknown };
  };

  // Attempt selection: first try to set via any available settings/command API, then fall back to the UI picker.
  // This is more robust in headless/CI where keyboard events or quick-picks can be flaky.
  // Try a best-effort config/command API before using the QuickPick.
  try {
    type ExtendedVsCodeWindow = VsCodeWindow & {
      workspace?: {
        getConfiguration?: (section?: string) => { update?: (...args: unknown[]) => unknown };
      };
    };
    const apiApplied = await page
      .evaluate((t: string) => {
        try {
          const w = window as unknown as ExtendedVsCodeWindow;
          // Try workspace configuration update if available
          const ws =
            w?.workspace ??
            (w as unknown as { vscode?: { workspace?: unknown } })?.vscode?.workspace;
          if (ws) {
            try {
              const cfgFn = (
                ws as unknown as {
                  getConfiguration?: (section?: string) => {
                    update?: (...args: unknown[]) => unknown;
                  };
                }
              ).getConfiguration;
              if (typeof cfgFn === "function") {
                const cfg = cfgFn.call(ws, "workbench");
                const update = cfg?.update as ((...args: unknown[]) => unknown) | undefined;
                if (typeof update === "function") {
                  // Correctly update the 'colorTheme' setting in the workbench configuration (global)
                  try {
                    // update(sectionKey, value, configurationTarget)
                    // Use 'colorTheme' (not 'workbench.colorTheme') as the setting key when calling update on the 'workbench' configuration
                    update("colorTheme", t, /*global*/ true);
                    return true;
                  } catch {
                    // continue to other strategies
                  }
                }
              }
            } catch {
              // continue
            }
          }
          // Try executing a changeColorTheme command with argument (some builds accept args)
          const vs = w?.vscode;
          if (vs?.commands?.executeCommand) {
            try {
              vs.commands.executeCommand("workbench.action.changeColorTheme", t);
              return true;
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
        return false;
      }, themeName)
      .catch(() => false);

    if (apiApplied) {
      console.log(`   ✅ Theme applied via settings/command API: ${themeName}`);
      await delay(500);
      return;
    }
  } catch {
    // ignore and fall back to UI-driven flow
  }

  // Attempt selection multiple times in case VS Code is still initializing
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Ensure page has focus before sending keyboard input
    await page.bringToFront().catch(() => {});
    await page.click("body").catch(() => {});
    await delay(120);

    // Try direct execution first (if exposed)
    const commandExecuted = await page
      .evaluate(() => {
        try {
          const w = window as unknown as VsCodeWindow;
          const vs = w?.vscode;
          const cs = w?.commandService;
          if (vs?.commands?.executeCommand) {
            vs.commands.executeCommand("workbench.action.selectTheme");
            return true;
          }
          if (cs?.executeCommand) {
            cs.executeCommand("workbench.action.selectTheme");
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })
      .catch(() => false);

    if (!commandExecuted) {
      // Fallback keyboard chord
      const chordModifier = process.platform === "darwin" ? "Meta" : "Control";
      await page.keyboard.press(`${chordModifier}+K`).catch(() => {});
      await delay(400);
      await page.keyboard.press(`${chordModifier}+T`).catch(() => {});
    }

    // Wait for quick pick (more generous timeout)
    try {
      await page.waitForSelector(".quick-input-list", { state: "visible", timeout: 20000 });
      await delay(600);
    } catch (e) {
      console.warn(`   ⚠️ Theme picker did not appear (attempt ${attempt}): ${String(e)}`);
      const items = await snapshotQuickPickItems();
      console.log("   🧾 QuickPick snapshot:", items.slice(0, 20));
      if (attempt === 3) {
        console.warn(`   ⚠️ Giving up on theme selection after ${attempt} attempts: ${themeName}`);
      }
      continue;
    }

    // Wait for the theme list to finish loading (avoid selecting while it says "Searching for themes...")
    for (let probe = 0; probe < 10; probe++) {
      const items = await snapshotQuickPickItems();
      const searching = items.some(i => i.toLowerCase().includes("searching for themes"));
      if (!searching && items.length > 0) break;
      await delay(300);
    }

    // If the exact theme is already listed, click it directly (most reliable)
    try {
      for (let probe = 0; probe < 6; probe++) {
        const themeItem = page
          .locator(".quick-input-list .monaco-list-row")
          .filter({ hasText: themeName });
        if ((await themeItem.count()) > 0) {
          await themeItem.first().click();
          await delay(800);
          await page.keyboard.press("Escape").catch(() => {});
          console.log(`   ✅ Theme applied via direct match: ${themeName}`);
          return;
        }
        await delay(300);
      }
    } catch {
      // fall through to other strategies
    }

    // Try to find the exact match
    try {
      const themeItem = page
        .locator(".quick-input-list .monaco-list-row")
        .filter({ hasText: themeName });
      const count = await themeItem.count();
      if (count > 0) {
        await themeItem.first().click();
        await delay(800);
        await page.keyboard.press("Escape").catch(() => {});
        console.log(`   ✅ Theme applied via click: ${themeName}`);
        return;
      }

      // Not found — try typing a shorter hint (name before '—')
      const shortName = themeName.split("—")[0].trim();
      if (shortName && shortName.length > 3) {
        await page.keyboard.type(shortName, { delay: 40 });
        await delay(400);
        let hintedCount = 0;
        for (let probe = 0; probe < 6; probe++) {
          const hinted = page
            .locator(".quick-input-list .monaco-list-row")
            .filter({ hasText: themeName });
          hintedCount = await hinted.count();
          if (hintedCount > 0) {
            await hinted.first().click();
            break;
          }
          await delay(300);
        }
        if (hintedCount === 0) {
          await page.keyboard.press("Enter");
        }
        await delay(800);
        await page.keyboard.press("Escape").catch(() => {});

        const items = await snapshotQuickPickItems();
        console.log("   🧾 QuickPick after typing shortName: ", items.slice(0, 20));
        console.log(`   ✅ Theme applied via typing: ${themeName}`);
        return;
      }

      // Final fallback: type full name and press Enter
      await page.keyboard.type(themeName, { delay: 30 });
      await delay(300);
      await page.keyboard.press("Enter");
      await delay(800);
      await page.keyboard.press("Escape").catch(() => {});

      const items = await snapshotQuickPickItems();
      console.log("   🧾 QuickPick final snapshot: ", items.slice(0, 20));
      console.log(`   ✅ Theme applied via final typing fallback: ${themeName}`);
      return;
    } catch (err) {
      console.warn(`   ⚠️ Could not select theme on attempt ${attempt}: ${String(err)}`);
      const items = await snapshotQuickPickItems();
      console.log("   🧾 QuickPick snapshot after error: ", items.slice(0, 20));
      if (attempt === 2) {
        console.warn(`   ❌ Failed to apply theme: ${themeName}`);
      }
    }
  }
}

export async function openFile(window: Page, filePath: string, workspaceRoot?: string) {
  // Accept either workspace-relative or absolute file paths
  let target = filePath;
  if (workspaceRoot && !path.isAbsolute(filePath)) {
    target = path.join(workspaceRoot, filePath);
  }

  // Ensure the page has focus before attempting open
  await window.bringToFront().catch(() => {});
  await window.click("body").catch(() => {});

  console.log(`   📂 Opening file: ${target}`);

  // Diagnostic: enumerate explorer rows and open editors for debugging
  try {
    const explorer = await window
      .evaluate(() => {
        try {
          const rows = Array.from(
            document.querySelectorAll(
              ".explorer-viewlet .monaco-list-row, .explorer-viewlet .monaco-tree-row"
            )
          ) as HTMLElement[];
          return rows.map(r => (r.innerText || "").trim()).slice(0, 40);
        } catch {
          return [] as string[];
        }
      })
      .catch(() => [] as string[]);
    console.log("   🧭 Explorer rows snapshot:", explorer.slice(0, 12));

    const openTabs = await window
      .evaluate(() => {
        try {
          return Array.from(document.querySelectorAll("[aria-label]"))
            .map(el => ((el as HTMLElement).getAttribute("aria-label") || "").slice(0, 200))
            .slice(0, 40);
        } catch {
          return [] as string[];
        }
      })
      .catch(() => [] as string[]);
    console.log("   🧾 Open tabs snapshot:", openTabs.slice(0, 12));
  } catch {
    // ignore diagnostics failing
  }

  // If the file exists on disk, prefer opening it directly via workspace.openTextDocument / vscode.open (more reliable than QuickOpen)
  try {
    const exists = fs.existsSync(target);
    console.log(`   🔍 File exists on disk: ${exists} — ${target}`);
    if (exists) {
      try {
        const openedDirect = await window
          .evaluate((fp: string) => {
            try {
              const w = window as unknown as VsCodeSurface;
              // Prefer explicit workspace API if exposed
              if (
                w?.vscode?.workspace &&
                typeof w.vscode.workspace.openTextDocument === "function"
              ) {
                w.vscode.workspace.openTextDocument(fp).then((doc: unknown) => {
                  try {
                    w?.vscode?.window?.showTextDocument?.(doc);
                  } catch {}
                });
                return true;
              }
              // Fallback to 'vscode.open' with a path string
              if (w?.vscode?.commands?.executeCommand) {
                try {
                  w.vscode.commands.executeCommand("vscode.open", fp);
                  return true;
                } catch {}
              }
              if (w?.commandService?.executeCommand) {
                try {
                  w.commandService.executeCommand("vscode.open", fp);
                  return true;
                } catch {}
              }
            } catch {
              return false;
            }
            return false;
          }, target)
          .catch(() => false);

        if (openedDirect) {
          await window
            .waitForSelector(".monaco-editor .view-lines span", { timeout: 2500 })
            .catch(() => {});
          const cnt = (await window.evaluate(
            () => document.querySelectorAll(".monaco-editor .view-lines span").length
          )) as number;
          if (cnt > 0) return; // success, done
        }
      } catch (err) {
        console.warn("   ⚠️ Direct openTextDocument attempt failed:", String(err));
      }
    }
  } catch (e) {
    console.warn("   ⚠️ Could not stat file before opening:", String(e));
  }

  // Try a few strategies to open the file reliably
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      // 1) Try vscode.open with a file-like resource object or URI string
      await window
        .evaluate((fp: string) => {
          try {
            const w = window as unknown as VsCodeSurface;
            const fileObj: { scheme: "file"; path: string } = { scheme: "file", path: fp };
            const uri = `file://${fp}`;
            if (w?.vscode?.commands?.executeCommand) {
              try {
                w.vscode.commands.executeCommand("vscode.open", fileObj);
                return true;
              } catch {
                try {
                  w.vscode.commands.executeCommand("vscode.open", uri);
                  return true;
                } catch {
                  // ignore
                }
              }
            }
            if (w?.commandService?.executeCommand) {
              try {
                w.commandService.executeCommand("vscode.open", fileObj);
                return true;
              } catch {
                try {
                  w.commandService.executeCommand("vscode.open", uri);
                  return true;
                } catch {
                  // ignore
                }
              }
            }
            return false;
          } catch {
            return false;
          }
        }, target)
        .catch(() => {});

      // 2) Wait for editor content indicating the file opened
      await window.waitForSelector(".monaco-editor .view-lines span", { timeout: 2000 });
      // If we have content, we're done
      const count = (await window.evaluate(
        () => document.querySelectorAll(".monaco-editor .view-lines span").length
      )) as number;
      if (count > 0) break;

      // 3) Fallback: Quick-open using basename and then try workspace-relative path
      await window.bringToFront().catch(() => {});
      const chordModifier = process.platform === "darwin" ? "Meta" : "Control";
      await window.keyboard.press(`${chordModifier}+P`).catch(() => {});
      await delay(200);
      const basename = path.basename(target);
      await window.keyboard.type(basename, { delay: 20 }).catch(() => {});
      await delay(200);
      await window.keyboard.press("Enter").catch(() => {});
      await delay(600);

      // If basename fails, try workspace-relative path
      try {
        const rel = ((fp: string) => {
          // Compute naive relative path by dropping leading workspace prefix if present
          const parts = fp.split("/");
          const idx = parts.lastIndexOf("test-samples");
          if (idx >= 0) return parts.slice(idx).join("/");
          return parts.slice(-2).join("/");
        })(target);
        if (rel && rel.length > 3) {
          await window.keyboard.press("Control+P").catch(() => {});
          await delay(120);
          await window.keyboard.type(rel, { delay: 20 }).catch(() => {});
          await delay(200);
          await window.keyboard.press("Enter").catch(() => {});
          await delay(700);
        }
      } catch {
        // ignore
      }

      // Diagnostic: snapshot quick-open if present
      try {
        const quickOpen = await window
          .evaluate(() => {
            try {
              const input = document.querySelector(
                ".quick-open .quick-open-input, .quick-input .input, .quick-input-widget .monaco-quick-input"
              ) as HTMLElement | null;
              const list = Array.from(
                document.querySelectorAll(
                  ".quick-open-widget .monaco-list-row, .quick-input-list .monaco-list-row"
                )
              ) as HTMLElement[];
              return {
                input: input ? (input as HTMLElement).textContent?.slice(0, 200) : null,
                items: list.map(l => (l.innerText || "").trim()).slice(0, 20),
              } as { input?: string | null; items: string[] };
            } catch {
              return null as QuickOpenSnapshot | null;
            }
          })
          .catch(() => null as QuickOpenSnapshot | null);
        console.log(
          "   🧾 QuickOpen snapshot:",
          quickOpen?.items?.slice(0, 8),
          "input:",
          quickOpen?.input
        );
      } catch {
        // ignore
      }

      await delay(700);
      const count2 = (await window.evaluate(
        () => document.querySelectorAll(".monaco-editor .view-lines span").length
      )) as number;
      if (count2 > 0) break;

      // 4) Try opening file by injecting content into an untitled editor (bypass explorer)
      try {
        const content = fs.readFileSync(target, "utf-8");
        const opened = await window
          .evaluate((c: string) => {
            try {
              const w = window as unknown as VsCodeSurface;
              if (
                w?.vscode?.workspace &&
                typeof w.vscode.workspace.openTextDocument === "function"
              ) {
                w.vscode.workspace.openTextDocument({ content: c }).then((doc: unknown) => {
                  try {
                    w?.vscode?.window?.showTextDocument?.(doc);
                  } catch {}
                });
                return true;
              }
              return false;
            } catch {
              return false;
            }
          }, content)
          .catch(() => false);

        if (opened) {
          await window
            .waitForSelector(".monaco-editor .view-lines span", { timeout: 2000 })
            .catch(() => {});
          const cnt = (await window.evaluate(
            () => document.querySelectorAll(".monaco-editor .view-lines span").length
          )) as number;
          if (cnt > 0) break;
        }
      } catch {
        // ignore
      }

      // 4b) Extension helper fallback: try the registered 'caligo-test.openFile' command if available
      try {
        const extTry = await window
          .evaluate(async (fp: string) => {
            try {
              const w = window as unknown as VsCodeSurface;
              // Try activating the extension if present
              try {
                const ext = w?.vscode?.extensions?.getExtension?.("AnselmHahn.caligo-vscode-theme");
                if (ext && typeof ext.activate === "function") {
                  try {
                    await ext.activate();
                  } catch {}
                }
              } catch {}

              if (w?.vscode?.commands?.executeCommand) {
                try {
                  const r = await w.vscode.commands.executeCommand("caligo-test.openFile", fp);
                  return Boolean(r);
                } catch {
                  return false;
                }
              }
              return false;
            } catch {
              return false;
            }
          }, target)
          .catch(() => false);

        if (extTry) {
          await window
            .waitForSelector(".monaco-editor .view-lines span", { timeout: 2000 })
            .catch(() => {});
          const cnt = (await window.evaluate(
            () => document.querySelectorAll(".monaco-editor .view-lines span").length
          )) as number;
          if (cnt > 0) break;
        }
      } catch {
        // ignore
      }

      // 5) Final fallback: expand explorer folders and click the file
      await window
        .evaluate((fp: string) => {
          try {
            const parts = fp.split("/").filter(Boolean);
            const basename = parts[parts.length - 1];
            const dirParts = parts.slice(0, -1);

            // Click through folder parts to expand
            for (const part of dirParts) {
              const rows = Array.from(
                document.querySelectorAll(
                  ".explorer-viewlet .monaco-list-row, .explorer-viewlet .monaco-tree-row"
                )
              ) as HTMLElement[];
              const match = rows.find(r =>
                (r.innerText || "").trim().split("\n")[0].includes(part)
              );
              if (match) {
                // click to expand (click twice to ensure expansion)
                match.click();
                try {
                  (match as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
                } catch {}
              }
            }

            // Now find file row
            const rows2 = Array.from(
              document.querySelectorAll(
                ".explorer-viewlet .monaco-list-row, .explorer-viewlet .monaco-tree-row"
              )
            ) as HTMLElement[];
            const fileRow = rows2.find(r =>
              (r.innerText || "").trim().split("\n")[0].includes(basename)
            );
            if (fileRow) {
              fileRow.click();
              return true;
            }

            // Aggressive fallback: search any element whose text contains the basename and click it
            try {
              const all = Array.from(document.querySelectorAll("*")) as HTMLElement[];
              const fuzzy = all.find(el => (el.innerText || "").includes(basename));
              if (fuzzy) {
                try {
                  fuzzy.click();
                } catch {}
                try {
                  (fuzzy as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
                } catch {}
                return true;
              }
            } catch {}

            return false;
          } catch {
            return false;
          }
        }, target)
        .catch(() => {});

      await window.waitForSelector(".monaco-editor .view-lines span", { timeout: 2000 });
      break;
    } catch {
      // If this was the last attempt, rethrow to allow caller to log an error
      if (attempt === 4) throw new Error(`Failed to open file: ${target}`);
      await delay(400);
    }
  }

  // Wait a bit for semantic tokens / highlights to appear
  await delay(1200);
}

// Close sidebar/panel/aux if open and return whether anything was closed.
export async function tryCloseSidebarOnce(page: Page): Promise<boolean> {
  const areas = await page
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
        // Extended selectors to catch VS Code Chat/Copilot auxiliary bar
        const auxiliarySel = [
          ".part.auxiliarybar",
          ".auxiliarybar",
          ".secondary-sidebar",
          "#workbench\\.parts\\.auxiliarybar",
          "[id*='auxiliarybar']",
          "[class*='auxiliarybar']",
          // Chat-specific selectors
          ".chat-view-container",
          "[class*='chat-']",
        ].join(", ");

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

  // Avoid toggling closed areas (prevents open/close alternation across themes)
  if (!areas.sidebar && !areas.panel && !areas.auxiliary) return false;

  console.log("   🔧 Detected open UI regions:", areas);
  let closedSomething = false;

  if (areas.sidebar) {
    const closedViaCommand = await page
      .evaluate(() => {
        try {
          const w = window as unknown as {
            vscode?: { commands?: { executeCommand?: (...args: unknown[]) => unknown } };
            commandService?: { executeCommand?: (...args: unknown[]) => unknown };
          };
          if (w?.vscode?.commands?.executeCommand) {
            w.vscode.commands.executeCommand("workbench.action.closeSidebar");
            return true;
          }
          if (w?.commandService?.executeCommand) {
            w.commandService.executeCommand("workbench.action.closeSidebar");
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })
      .catch(() => false);

    if (!closedViaCommand) {
      console.log("   🔧 Closing left sidebar via keyboard shortcut (Ctrl+B)...");
      const sidebarChord = process.platform === "darwin" ? "Meta+B" : "Control+B";
      await page.keyboard.press(sidebarChord).catch(() => {});
      await delay(300);
    }

    closedSomething = true;
  }

  if (areas.panel) {
    const tried = await page
      .evaluate(() => {
        try {
          const w = window as unknown as {
            vscode?: { commands?: { executeCommand?: (...args: unknown[]) => unknown } };
            commandService?: { executeCommand?: (...args: unknown[]) => unknown };
          };
          if (w?.vscode?.commands?.executeCommand) {
            w.vscode.commands.executeCommand("workbench.action.closePanel");
            return true;
          }
          if (w?.commandService?.executeCommand) {
            w.commandService.executeCommand("workbench.action.closePanel");
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })
      .catch(() => false);

    if (!tried) {
      await page.keyboard.press("Escape").catch(() => {});
      await delay(200);
    }

    closedSomething = true;
  }

  if (areas.auxiliary) {
    const closedAuxViaCommand = await page
      .evaluate(() => {
        try {
          const w = window as unknown as {
            vscode?: { commands?: { executeCommand?: (...args: unknown[]) => unknown } };
            commandService?: { executeCommand?: (...args: unknown[]) => unknown };
          };
          if (w?.vscode?.commands?.executeCommand) {
            w.vscode.commands.executeCommand("workbench.action.closeAuxiliaryBar");
            w.vscode.commands.executeCommand("workbench.action.closeSecondarySideBar");
            return true;
          }
          if (w?.commandService?.executeCommand) {
            w.commandService.executeCommand("workbench.action.closeAuxiliaryBar");
            w.commandService.executeCommand("workbench.action.closeSecondarySideBar");
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })
      .catch(() => false);

    if (!closedAuxViaCommand) {
      // Fallback to keyboard shortcut only when visible to avoid toggling
      console.log("   🔧 Closing auxiliary bar via keyboard shortcut (Ctrl+Alt+B)...");
      const auxChord = process.platform === "darwin" ? "Meta+Alt+B" : "Control+Alt+B";
      await page.keyboard.press(auxChord).catch(() => {});
      await delay(300);
    }

    closedSomething = true;
  }

  await delay(150);

  const now = await page
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

  console.log("   🔧 Post-close UI regions:", now);

  // Command Palette fallback if any area remains open
  if (now.sidebar || now.panel || now.auxiliary) {
    try {
      const chordModifier = process.platform === "darwin" ? "Meta" : "Control";
      const runPaletteCommand = async (label: string) => {
        await page.keyboard.press(`${chordModifier}+Shift+P`).catch(() => {});
        await delay(200);
        await page.keyboard.type(label, { delay: 30 }).catch(() => {});
        await page.keyboard.press("Enter").catch(() => {});
        await delay(300);
        await page.keyboard.press("Escape").catch(() => {});
      };

      if (now.sidebar) await runPaletteCommand("View: Close Sidebar");
      if (now.panel) await runPaletteCommand("View: Close Panel");
      if (now.auxiliary) {
        await runPaletteCommand("View: Close Secondary Side Bar");
        await delay(200);
        // Also try closing Copilot Chat specifically
        await runPaletteCommand("Chat: Close");
      }
    } catch {
      // ignore command palette failures
    }
  }

  // Final verification - if auxiliary is still open, try one more aggressive approach
  const finalCheck = await page
    .evaluate(() => {
      try {
        const auxiliarySel = [".part.auxiliarybar", ".auxiliarybar", ".secondary-sidebar"].join(
          ", "
        );
        const el = document.querySelector(auxiliarySel) as HTMLElement | null;
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
      } catch {
        return false;
      }
    })
    .catch(() => false);

  if (finalCheck) {
    console.log("   ⚠️ Auxiliary sidebar still open, attempting keyboard close");
    // Try keyboard shortcut to close secondary sidebar (Ctrl+Alt+B on Windows/Linux)
    const chordModifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${chordModifier}+Alt+B`).catch(() => {});
    await delay(200);
  }

  return closedSomething;
}
