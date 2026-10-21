/**
 * Phase 2 acceptance: the app shell and cross-page guarantees.
 *
 * Navigation, legacy redirects, the ⌘K palette, Export (now a section of the Themes
 * page), the footer, the 404 page, Home's wallpaper budget, accessibility (axe-core)
 * and phone-width layout on every page.
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
import { serveWallpapers } from "./support/wallpapers";

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
  { name: "Themes", path: "/#/themes", ready: "#main [data-chip]", owner: "@themes" },
  { name: "Wallpapers", path: "/#/wallpapers", ready: "#main h1", owner: "@wallpapers" },
  {
    name: "Science",
    path: "/#/science",
    ready: '#main [data-science-view="oklch"]',
    owner: "@science",
  },
  // No "Export" entry: /#/export redirects into the Themes page (section #export), so the
  // Themes entries below already cover it (axe scans all of #main; the 375px check is
  // page-wide). The Export tests further down check that section directly.
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
  test("nav has exactly Themes, Wallpapers, Science, two icon links and the theme chip", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const nav = page.getByRole("navigation", { name: "Main" });

    const links = await nav
      .getByRole("link")
      .evaluateAll(as =>
        as
          .filter(a => a.getAttribute("aria-label") !== "Caligo home")
          .map(a => a.getAttribute("href"))
      );
    expect(links).toEqual([
      "#/themes",
      "#/wallpapers",
      "#/science",
      "https://marketplace.visualstudio.com/items?itemName=AnselmHahn.caligo-vscode-theme",
      "https://github.com/Anselmoo/caligo-vscode-theme",
    ]);

    for (const name of ["Themes", "Wallpapers", "Science"]) {
      await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
    }
    for (const name of ["Caligo on the VS Code Marketplace", "Caligo on GitHub"]) {
      const icon = nav.getByRole("link", { name, exact: true });
      await expect(icon).toBeVisible();
      await expect(icon).toHaveAttribute("target", "_blank");
      await expect(icon).toHaveAttribute("rel", /noopener/);
      await expect(icon.locator("svg")).toHaveCount(1);
    }

    await expect(nav.getByRole("button")).toHaveCount(1);
    await expect(themeChip(page)).toHaveAccessibleName(new RegExp(defaultTheme.seedLabel));
  });

  test("/#/gallery redirects to the Themes page", { tag: "@themes" }, async ({ page }) => {
    await gotoApp(page, "/#/gallery");
    await expect(page).toHaveURL(/#\/themes$/);
    await expect(page.locator("#main [data-chip]").first()).toBeVisible();
  });

  test("/#/analysis redirects to the Science page", { tag: "@science" }, async ({ page }) => {
    await gotoApp(page, "/#/analysis");
    await expect(page).toHaveURL(/#\/science$/);
    await expect(page.locator('#main [data-science-view="oklch"]')).toBeVisible();
  });

  test("/#/export redirects to the export section of the Themes page", { tag: "@science" }, async ({
    page,
  }) => {
    await gotoApp(page, "/#/export");
    await expect(page).toHaveURL(/#\/themes#export$/);
    await expect(page.locator("#main h1")).toHaveText("Themes");
    await expect(page.locator("#main section#export")).toBeVisible();
    await expect(page.locator('#main [data-export-action="download"]')).toBeVisible();
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

test.describe("Export (a section of the Themes page)", { tag: "@science" }, () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page, "/#/export");
    await expect(page.locator("#main section#export")).toBeVisible();
    await applyThemeViaPalette(page, "eclipse triadic");
    await expectThemeApplied(page, eclipseTriadic);
  });

  test("names the current theme", async ({ page }) => {
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
    await expect(page.locator("#export").getByRole("status")).toContainText(/copied/i);
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain(eclipseTriadic.seedLabel);
  });
});

test.describe("Footer", { tag: "@science" }, () => {
  test("links to Themes, Wallpapers, Science and the project, never to the old gallery", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    const links = footer.getByRole("navigation", { name: "Footer" }).getByRole("link");
    // innerText leaves out the icons' SVG <title>s: this is the visible link text.
    await expect(links).toHaveText(
      ["Themes", "Wallpapers", "Science", "Marketplace", "GitHub", "Contributing", "License"],
      { useInnerText: true }
    );
    for (const [name, href] of [
      ["Themes", "#/themes"],
      ["Wallpapers", "#/wallpapers"],
      ["Science", "#/science"],
    ] as const) {
      await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
    }
    for (const name of ["Marketplace", "GitHub", "Contributing", "License"]) {
      const link = footer.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }

    await expect(footer.getByRole("link", { name: /gallery/i })).toHaveCount(0);
    const hrefs = await footer
      .getByRole("link")
      .evaluateAll(as => as.map(a => a.getAttribute("href") ?? ""));
    for (const href of hrefs) expect(href).not.toMatch(/gallery/i);
  });

  test("uses the design tokens: body font and neutral ink", async ({ page }) => {
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
      };
    });

    expect(facts.font).toMatch(/Hanken Grotesk/);
    expect(facts.linkColors.length).toBeGreaterThan(0);
    for (const color of facts.linkColors) {
      expect(facts.neutral, `footer link colour ${color} is a neutral --fg token`).toContain(color);
    }
  });

  test("icons are inline SVG, never an icon font", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", request => requests.push(request.url()));
    await gotoApp(page, "/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(
      await page.evaluate(
        () => document.querySelectorAll(".pi, [class^='pi-'], [class*=' pi-']").length
      ),
      "no PrimeIcons class anywhere on the page"
    ).toBe(0);
    expect(
      requests.filter(url => /primeicons/i.test(url)),
      "no icon font is requested"
    ).toEqual([]);

    // The four external links each carry an inline SVG that is hidden from assistive tech.
    for (const name of ["Marketplace", "GitHub", "Contributing", "License"]) {
      const icon = footer.getByRole("link", { name, exact: true }).locator("svg");
      await expect(icon, `${name} has one inline icon`).toHaveCount(1);
      await expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(
        await icon.locator("path").count(),
        `${name} icon is drawn with a path`
      ).toBeGreaterThan(0);
    }
    // The internal links are text only.
    for (const name of ["Themes", "Wallpapers", "Science"]) {
      await expect(footer.getByRole("link", { name, exact: true }).locator("svg")).toHaveCount(0);
    }
  });

  test("carries the slogan: heart and moon drawn, 'love' spoken", async ({ page }) => {
    await gotoApp(page, "/");
    const slogan = page.getByRole("contentinfo").locator(".footer__slogan");
    await expect(slogan).toBeVisible();

    // innerText leaves out the SVG <title>s, so this is what a reader hears or sees,
    // with the hidden word "love" standing in for the heart.
    await expect(slogan).toHaveText("Built with love for developers who code after dark", {
      useInnerText: true,
    });

    const decoration = slogan.locator("svg");
    await expect(decoration, "a heart and a moon").toHaveCount(2);
    for (const icon of await decoration.all())
      await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(slogan.locator(".footer__heart")).toBeVisible();
    await expect(slogan.locator(".footer__moon")).toBeVisible();
    await expect(slogan.locator(".visually-hidden")).toHaveText("love");

    const visible = await slogan.evaluate(el => {
      const clone = el.cloneNode(true) as HTMLElement;
      for (const node of clone.querySelectorAll(".visually-hidden, svg")) node.remove();
      return clone.textContent?.replace(/\s+/g, " ").trim();
    });
    expect(visible, "the visible words around the two glyphs").toBe(
      "Built with for developers who code after dark"
    );
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

test.describe("Home: no wallpaper SVG", { tag: "@shell" }, () => {
  /** Paths of every wallpaper SVG the page has fetched, per the Resource Timing API. */
  const wallpaperSvgs = (page: Page) =>
    page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map(entry => entry.name)
        .filter(name => /wallpapers\/.*\.svg/.test(name))
    );

  test("requests no wallpaper SVG; the hero image, if any, is a WebP", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.locator("#main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(await wallpaperSvgs(page), "Home never fetches a multi-MB wallpaper SVG").toEqual([]);

    const hero = page.locator("img.scene__image");
    for (const src of await hero.evaluateAll(imgs => imgs.map(img => img.getAttribute("src")))) {
      expect(src, "hero image source").toMatch(/\.webp$/);
    }
  });

  test("uses the 1920 px hero WebP when the build made one", async ({ page }) => {
    const requested = await serveWallpapers(page, { hero: true });
    await gotoApp(page, "/");
    const hero = page.locator("img.scene__image");
    await expect(hero).toHaveAttribute("src", /\/monitor\.hero\.webp$/);
    await page.waitForLoadState("networkidle");

    expect(await wallpaperSvgs(page)).toEqual([]);
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
    expect(requested.some(url => url.endsWith(".hero.webp"))).toBe(true);
  });

  test("falls back to the 640 px thumbnail, still never the SVG", async ({ page }) => {
    const requested = await serveWallpapers(page);
    await gotoApp(page, "/");
    const hero = page.locator("img.scene__image");
    await expect(hero).toHaveAttribute("src", /\/monitor\.webp$/);
    await expect(hero).not.toHaveAttribute("src", /hero/);
    await page.waitForLoadState("networkidle");

    expect(await wallpaperSvgs(page)).toEqual([]);
    expect(requested.filter(url => url.endsWith(".svg"))).toEqual([]);
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
