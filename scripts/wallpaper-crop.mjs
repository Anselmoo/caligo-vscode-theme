/**
 * wallpaper-crop.mjs — zoom-crop a rendered scene SVG in Chromium.
 *
 * Usage: node scripts/wallpaper-crop.mjs <svg in spike/wallpapers> <out.png> <x> <y> <w> <h> [scale=3]
 * x/y/w/h are in the 1920×1080 frame. Uses a private page per run, so
 * parallel builders never screenshot each other's scenes.
 */
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const [svg, out, x, y, w, h, scale = "3"] = process.argv.slice(2);
if (!svg || !out || h === undefined) {
  console.error("usage: node scripts/wallpaper-crop.mjs <svg> <out.png> <x> <y> <w> <h> [scale]");
  process.exit(2);
}
const dir = resolve("spike/wallpapers");
const page = `${dir}/${out}.crop-${process.pid}.html`;
writeFileSync(
  page,
  `<html><body style="margin:0"><img src="${svg}" style="width:1920px;height:1080px;display:block"></body></html>`
);
const browser = await chromium.launch();
const pg = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: Number(scale),
});
await pg.goto(`file://${page}`);
await pg.waitForTimeout(300);
await pg.screenshot({ path: `${dir}/${out}`, clip: { x: +x, y: +y, width: +w, height: +h } });
await browser.close();
rmSync(page);
