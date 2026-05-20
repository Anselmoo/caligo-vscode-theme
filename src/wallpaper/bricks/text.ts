/**
 * Text brick — optional theme name label, rendered in a minimal pill.
 * Positioned at the bottom-left by default (developer-tool aesthetic).
 */
import type { BrickOutput, BrickParams } from "../types.js";

export interface TextBrickOptions {
  line1: string;
  line2: string;
  position?: "bottom-left" | "bottom-right" | "bottom-center" | "center";
  id?: string;
}

export function textBrick(params: BrickParams, options: TextBrickOptions): BrickOutput {
  const { viewBox, colors } = params;
  const { width, height } = viewBox;
  const { line1, line2, position = "bottom-left", id = "text-label" } = options;

  // Scale font size proportionally to monitor resolution baseline
  const scale = Math.max(width, height) / 2160;
  const fontSize1 = Math.round(28 * scale);
  const fontSize2 = Math.round(52 * scale);
  const pad = Math.round(40 * scale);
  const lineGap = Math.round(14 * scale);
  const pillPadH = Math.round(28 * scale);
  const pillPadV = Math.round(20 * scale);
  const pillRadius = Math.round(12 * scale);

  // JetBrains Mono advances ≈ 0.600 em per glyph; use 0.62 for a safety margin
  // so long harmony-mode names like "Split Complementary" never clip the pill edge.
  const maxChars = Math.max(line1.length, line2.length);
  const rawPillW = Math.round(maxChars * fontSize2 * 0.62 + pillPadH * 2);
  // Never wider than 90% of the canvas so the pill always fits.
  const pillW = Math.min(rawPillW, Math.round(width * 0.9));
  const pillH = Math.round(fontSize1 + fontSize2 + lineGap + pillPadV * 2);

  let x: number;
  let y: number;

  if (position === "bottom-left") {
    x = pad;
    y = height - pad - pillH;
  } else if (position === "bottom-right") {
    x = width - pad - pillW;
    y = height - pad - pillH;
  } else if (position === "bottom-center") {
    x = (width - pillW) / 2;
    y = height - pad - pillH;
  } else {
    x = (width - pillW) / 2;
    y = (height - pillH) / 2;
  }

  const textX = x + pillPadH;
  const text1Y = y + pillPadV + fontSize1;
  const text2Y = text1Y + lineGap + fontSize2;

  return {
    elements: `<g id="${id}">
  <rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${pillW}" height="${pillH}" rx="${pillRadius}" ry="${pillRadius}" fill="${colors.bg}" opacity="0.65"/>
  <text x="${textX.toFixed(0)}" y="${text1Y.toFixed(0)}" font-family="'JetBrains Mono','SF Mono','Fira Code','Cascadia Code',monospace" font-size="${fontSize1}" fill="${colors.accentMuted}" opacity="0.9" letter-spacing="3">${escSvg(line1.toUpperCase())}</text>
  <text x="${textX.toFixed(0)}" y="${text2Y.toFixed(0)}" font-family="'JetBrains Mono','SF Mono','Fira Code','Cascadia Code',monospace" font-size="${fontSize2}" font-weight="600" fill="${colors.accentSoft}" opacity="0.95">${escSvg(line2)}</text>
</g>`,
  };
}

function escSvg(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
