/**
 * Phase 2 acceptance: the app shell and cross-page guarantees.
 *
 * Navigation, legacy redirects, the ⌘K palette, Export, the footer, the 404
 * page, accessibility (axe-core) and phone-width layout on every page.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
  applyThemeViaPalette,
  expectThemeApplied,
  gotoApp,
  loadThemeManifest,
  rootVar,
  themeByKey,
  themeChip,
} from "./support/app";

const manifest = loadThemeManifest();
const defaultTheme = themeByKey(manifest, manifest.defaultThemeKey);
const eclipseTriadic = themeByKey(manifest, "Caligo-EclipseTriadic");

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * What "the page has rendered its content" means for each route, and which work
 * area owns the page (run one area's tests with `--grep @<area>`).
 */
const PAGES: Array<{ name: string; path: string; ready: string; owner: string }> = [
  { name: "Home", path: "/", ready: "#main h1", owner: "@shell" },
  { name: "Themes", path: "/#/themes", ready: "#main [data-theme-card]", owner: "@themes" },
  { name: "Wallpapers", path: "/#/wallpapers", ready: "#main h1", owner: "@wallpapers" },
  {
    name: "Science",
    path: "/#/science",
    ready: '#main [data-science-view="oklch"]',
    owner: "@science",
  },
  { name: "Export", path: "/#/export", ready: "#main [data-export-action]", owner: "@science" },
];

async function openPage(page: Page, path: string, ready: string) {
  await gotoApp(page, path);
  await expect(page.locator(ready).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
}

function seriousViolations(results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  return results.violations
    .filter(v => v.impact === "serious" || v.impact === "critical")
    .map(v => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.slice(0, 3).map(n => n.target.join(" ")),
    }));
}

test.describe("Shell: navigation", { tag: "@shell" }, () => {
  test("nav has exactly Themes, Wallpapers and Science plus the theme chip", async ({ page }) => {
    await gotoApp(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });

    const links = await nav
      .getByRole("link")
      .evaluateAll(as =>
        as
          .filter(a => a.getAttribute("aria-label") !== "Caligo home")
          .map(a => [a.textContent?.trim(), a.getAttribute("href")])
      );
    expect(links).toEqual([
      ["Themes", "#/themes"],
      ["Wallpapers", "#/wallpapers"],
      ["Science", "#/science"],
    ]);

    await expect(nav.getByRole("button")).toHaveCount(1);
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(defaultTheme.seedLabel));
  });

  test("/#/gallery redirects to the Themes page", { tag: "@themes" }, async ({ page }) => {
    await gotoApp(page, "/#/gallery");
    await expect(page).toHaveURL(/#\/themes$/);
    await expect(page.locator("#main [data-theme-card]").first()).toBeVisible();
  });

  test("/#/analysis redirects to the Science page", { tag: "@science" }, async ({ page }) => {
    await gotoApp(page, "/#/analysis");
    await expect(page).toHaveURL(/#\/science$/);
    await expect(page.locator('#main [data-science-view="oklch"]')).toBeVisible();
  });
});

test.describe("Shell: command palette", { tag: "@shell" }, () => {
  test("⌘K / Ctrl+K opens the palette and Enter applies the chosen theme", async ({ page }) => {
    await gotoApp(page, "/");
    await applyThemeViaPalette(page, "eclipse triadic");
    await expectThemeApplied(page, eclipseTriadic);
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.seedLabel));
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(eclipseTriadic.harmonyLabel));
  });

  test("Escape closes the palette without changing the theme", async ({ page }) => {
    await gotoApp(page, "/");
    const before = await rootVar(page, "--bg0");
    await page.keyboard.press("ControlOrMeta+k");
    const dialog = page.getByRole("dialog", { name: /switch theme/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await rootVar(page, "--bg0")).toBe(before);
  });
});

test.describe("Export page", { tag: "@science" }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, "/#/export");
    await applyThemeViaPalette(page, "eclipse triadic");
    await expectThemeApplied(page, eclipseTriadic);
  });

  test("names the current theme", async ({ page }) => {
    await expect(page.locator("#main h1")).toBeVisible();
    await expect(page.locator("#main [data-export-theme]")).toContainText(
      eclipseTriadic.displayName
    );
  });

  test("downloads the current theme", async ({ page }) => {
    const downloadButton = page.locator('#main [data-export-action="download"]');
    await expect(downloadButton).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
    expect(download.suggestedFilename()).toMatch(/\.(css|scss|json|ts)$/);
    const path = await download.path();
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(path, "utf8");
    expect(content).toContain(eclipseTriadic.seedLabel);
  });

  test("copies the current theme and confirms it", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const copyButton = page.locator('#main [data-export-action="copy"]');
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.locator("#main").getByRole("status")).toContainText(/copied/i);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain(eclipseTriadic.seedLabel);
  });
});

test.describe("Footer", { tag: "@science" }, () => {
  test("links to the Themes page, never to the old gallery", async ({ page }) => {
    await gotoApp(page, "/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    await expect(footer.getByRole("link", { name: "Themes", exact: true })).toHaveAttribute(
      "href",
      "#/themes"
    );
    for (const name of ["Marketplace", "GitHub", "License"]) {
      await expect(footer.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(footer.getByRole("link", { name: /gallery/i })).toHaveCount(0);
    const hrefs = await footer
      .getByRole("link")
      .evaluateAll(as => as.map(a => a.getAttribute("href") ?? ""));
    for (const href of hrefs) expect(href).not.toMatch(/gallery/i);
  });

  test("uses the new tokens: body font, neutral ink, no icon font or emoji", async ({ page }) => {
    await gotoApp(page, "/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    const facts = await footer.evaluate(el => {
      const probe = (value: string) => {
        const span = document.createElement("span");
        span.style.color = value;
        el.appendChild(span);
        const color = getComputedStyle(span).color;
        span.remove();
        return color;
      };
      return {
        font: getComputedStyle(el).fontFamily,
        neutral: [probe("var(--fg0)"), probe("var(--fg1)"), probe("var(--fg-muted)")],
        linkColors: [...el.querySelectorAll("a")].map(a => getComputedStyle(a).color),
        iconFont: el.querySelectorAll(".pi, [class^='pi-'], [class*=' pi-']").length,
        text: el.textContent ?? "",
      };
    });

    expect(facts.font).toMatch(/Hanken Grotesk/);
    expect(facts.linkColors.length).toBeGreaterThan(0);
    for (const color of facts.linkColors) {
      expect(facts.neutral, `footer link colour ${color} is a neutral --fg token`).toContain(color);
    }
    expect(facts.iconFont, "no PrimeIcons in the footer").toBe(0);
    expect(facts.text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

test.describe("404 page", { tag: "@science" }, () => {
  test("offers a way home", async ({ page }) => {
    await gotoApp(page, "/#/no-such-page");
    await expect(page.locator("#main h1")).toBeVisible();
    const home = page.locator("#main").getByRole("link", { name: /home/i });
    await expect(home).toHaveAttribute("href", "#/");
    await home.click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator("#main h1")).toContainText("Dark themes");
  });

  test("uses the display face and no gradient text", async ({ page }) => {
    await gotoApp(page, "/#/no-such-page");
    const heading = page.locator("#main h1");
    await expect(heading).toBeVisible();
    const style = await heading.evaluate(el => {
      const s = getComputedStyle(el);
      return { font: s.fontFamily, clip: s.webkitBackgroundClip || s.backgroundClip };
    });
    expect(style.font).toMatch(/Martian Mono/);
    expect(style.clip).not.toBe("text");
  });
});

test.describe("Accessibility: axe-core finds no serious or critical violations", () => {
  // Phase 2 pages: their own content and the footer, so a failure points at a Phase 2 file.
  for (const { name, path, ready, owner } of PAGES.filter(p => p.name !== "Home")) {
    test(`${name} page content and footer`, { tag: owner }, async ({ page }) => {
      await openPage(page, path, ready);
      const results = await new AxeBuilder({ page })
        .include("#main")
        .include("footer")
        .withTags(AXE_TAGS)
        .analyze();
      expect(seriousViolations(results)).toEqual([]);
    });
  }

  // The whole document on Home and on one Phase 2 page: covers the Phase 1 nav,
  // palette and Home content, which no Phase 2 work area owns (tag @phase1).
  for (const { name, path, ready } of PAGES.filter(p => ["Home", "Themes"].includes(p.name))) {
    test(`whole document on ${name} (app shell included)`, {
      tag: ["@shell", "@phase1"],
    }, async ({ page }) => {
      await openPage(page, path, ready);
      // Syntax-token spans in Home's editor sample render the theme's own colours,
      // translucent ones included. Theme colour contrast is gated by the theme
      // generator's pair registry (scripts/test-contrast.ts), not by the site;
      // the sample's gutter, tabs and status bar stay in scope here.
      const results = await new AxeBuilder({ page })
        .exclude('.editor__code [class^="t-"]')
        .withTags(AXE_TAGS)
        .analyze();
      expect(seriousViolations(results)).toEqual([]);
    });
  }
});

test.describe("Layout: no horizontal scroll at 375px", () => {
  const phonePages = [
    ...PAGES,
    { name: "404", path: "/#/no-such-page", ready: "#main h1", owner: "@science" },
  ];
  for (const { name, path, ready, owner } of phonePages) {
    test(`${name} fits a 375px screen`, { tag: owner }, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await openPage(page, path, ready);
      const box = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        htmlOverflow: getComputedStyle(document.documentElement).overflowX,
        bodyOverflow: getComputedStyle(document.body).overflowX,
      }));
      expect(["hidden", "clip"], "overflow must not be masked on html/body").not.toContain(
        box.htmlOverflow
      );
      expect(["hidden", "clip"]).not.toContain(box.bodyOverflow);
      expect(box.scrollWidth, JSON.stringify(box)).toBeLessThanOrEqual(box.clientWidth);
    });
  }
});
