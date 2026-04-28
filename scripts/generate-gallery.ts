/**
 * Quick local gallery generator — produces public/gallery.html
 * showing all monitor.svg wallpapers in a responsive grid.
 * Temporary dev tool; not part of CI.
 */
import fs from "node:fs";
import path from "node:path";

const base = "./public/wallpapers";
const motifs = fs
  .readdirSync(base)
  .filter(d => fs.statSync(path.join(base, d)).isDirectory())
  .sort();

let cards = "";
for (const m of motifs) {
  const harmonies = fs
    .readdirSync(path.join(base, m))
    .filter(h => fs.statSync(path.join(base, m, h)).isDirectory())
    .sort();
  for (const h of harmonies) {
    const rel = `/wallpapers/${m}/${h}/monitor.svg`;
    cards += `<figure>
  <img src="${rel}" loading="lazy" alt="${m} / ${h}">
  <figcaption>${m}<br><small>${h}</small></figcaption>
</figure>\n`;
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Caligo Wallpaper Gallery</title>
  <style>
    *{box-sizing:border-box}
    body{background:#050508;color:#ccc;font-family:system-ui,sans-serif;margin:0;padding:16px}
    h1{text-align:center;color:#a0b4d0;margin:0 0 24px;font-size:1.4rem;letter-spacing:.04em}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}
    figure{margin:0;border:1px solid #1a1d26;border-radius:8px;overflow:hidden;background:#0a0c14}
    img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
    figcaption{padding:8px 10px;font-size:13px;color:#8899aa;line-height:1.4}
    small{color:#556677;font-size:11px;display:block;margin-top:2px;text-transform:capitalize}
  </style>
</head>
<body>
<h1>Caligo Wallpaper Gallery — ${motifs.length} motifs × 5 harmonies</h1>
<div class="grid">
${cards}
</div>
</body>
</html>`;

fs.writeFileSync("./public/gallery.html", html);
console.log(`Written public/gallery.html — ${motifs.length * 5} wallpapers`);
