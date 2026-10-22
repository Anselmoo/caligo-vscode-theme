/**
 * A mocked wallpapers manifest and tiny wallpaper assets.
 *
 * Wallpapers are built in CI and never committed, so specs that need a known grid
 * serve their own manifest with `page.route` instead of depending on what is on disk.
 * The mock holds two palettes: the manifest's default theme's seed (what the page
 * shows by default) and one other, each in two modes.
 */

import type { Page, Route } from "@playwright/test";
import { loadThemeManifest, themeByKey } from "./app";

const manifest = loadThemeManifest();
const defaultTheme = themeByKey(manifest, manifest.defaultThemeKey);

/** The palette the site wears on arrival, and a second one to switch to. */
export const DEFAULT_SEED = { id: defaultTheme.seedId, name: defaultTheme.seedLabel };
export const OTHER_SEED =
  defaultTheme.seedId === "Eclipse"
    ? { id: "AuroraNoir", name: "Aurora Noir" }
    : { id: "Eclipse", name: "Eclipse" };

export const SEEDS = [DEFAULT_SEED, OTHER_SEED];
export const MODES = [
  { id: "none", folder: "balanced", label: "Balanced", topic: "Balanced" },
  { id: "triadic", folder: "triadic", label: "Triadic", topic: "Triadic" },
];
const PLATFORMS = ["monitor", "tablet", "mobile"] as const;
const TEXT_VARIANTS = ["no-text", "text"] as const;

/** 1x1 transparent PNG; browsers sniff the bytes, so it also serves .webp requests. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

export type MockOptions = {
  /** `<seedId>|<modeId>`: leave out `thumbPath` (and `heroPath`) for that scene. */
  dropThumbFor?: string;
  /** Give the monitor scenes a 1920 px `heroPath`, as the build does. */
  hero?: boolean;
};

export function mockManifest({ dropThumbFor, hero }: MockOptions = {}) {
  const entries = SEEDS.flatMap(seed =>
    MODES.flatMap(mode =>
      PLATFORMS.flatMap(platform =>
        TEXT_VARIANTS.map(textVariant => {
          const stem = `wallpapers/${seed.id}/${mode.folder}/${platform}${textVariant === "text" ? "-text" : ""}`;
          const entry: Record<string, string> = {
            seedId: seed.id,
            seedDisplayName: seed.name,
            harmonyMode: mode.id,
            harmonyLabel: mode.label,
            topic: mode.topic,
            platform,
            textVariant,
            displayName: `${seed.name} · ${mode.topic}`,
            svgPath: `${stem}.svg`,
            pngPath: `${stem}.png`,
            thumbPath: `${stem}.webp`,
          };
          if (hero && platform === "monitor") entry.heroPath = `${stem}.hero.webp`;
          if (dropThumbFor === `${seed.id}|${mode.id}`) {
            delete entry.thumbPath;
            delete entry.heroPath;
          }
          return entry;
        })
      )
    )
  );
  return { total: entries.length, entries };
}

/** Serve a mocked manifest and tiny wallpaper assets; returns every wallpaper asset URL requested. */
export async function serveWallpapers(page: Page, options: MockOptions = {}): Promise<string[]> {
  const requested: string[] = [];
  await page.route("**/wallpapers-manifest.json", route =>
    route.fulfill({ json: mockManifest(options) })
  );
  // Match on the pathname only: Vite module URLs such as
  // /src/vue-app/components/wallpapers/... must pass through untouched.
  await page.route(
    url => url.pathname.startsWith("/wallpapers/"),
    (route: Route) => {
      const url = route.request().url();
      requested.push(url);
      if (url.endsWith(".svg")) {
        return route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
        });
      }
      return route.fulfill({ contentType: "image/png", body: PIXEL });
    }
  );
  return requested;
}
