#!/usr/bin/env tsx
/**
 * Generate GitHub social card (1280×640) from SVG with 40pt safe margin
 *
 * This script generates a social card following GitHub's Repo Card Template guidance:
 * - Size: 1280×640 pixels (GitHub's recommended social card size)
 * - Safe margin: 40pt (~53px at 96 DPI) around important content
 *
 * The script attempts to use available system tools in order of preference:
 * 1. rsvg-convert - librsvg2 tool, best gradient/color support
 * 2. ImageMagick (convert) - common on Linux/macOS via Homebrew
 * 3. Inkscape - full-featured SVG editor with CLI
 * 4. sips - macOS built-in tool (for compatibility with existing workflow)
 *
 * Reference: GitHub Repo Card Template
 * "We recommend leaving a 40pt border around the important details of your
 *  social card to make sure nothing gets cropped."
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT_DIR = process.cwd();
const IMAGES_DIR = join(ROOT_DIR, "images");
const INPUT_SVG = join(IMAGES_DIR, "social-card.svg");
const OUTPUT_PNG = join(IMAGES_DIR, "social-card.png");

// Target dimensions for GitHub social card
const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 640;

/**
 * Check if a command exists on the system (cross-platform)
 */
function commandExists(cmd: string): boolean {
  try {
    const isWindows = process.platform === "win32";
    const checkCmd = isWindows ? `where ${cmd}` : `command -v ${cmd}`;
    execSync(checkCmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate social card using ImageMagick (convert)
 */
function generateWithImageMagick(): boolean {
  console.log("📦 Using ImageMagick (convert)...");
  try {
    execSync(
      `convert -background none -density 192 -resize ${TARGET_WIDTH}x${TARGET_HEIGHT} "${INPUT_SVG}" "${OUTPUT_PNG}"`,
      { stdio: "inherit" }
    );
    console.log("✅ Social card generated with ImageMagick");
    return true;
  } catch (error) {
    console.error("❌ ImageMagick conversion failed:", error);
    return false;
  }
}

/**
 * Generate social card using rsvg-convert
 */
function generateWithRsvg(): boolean {
  console.log("📦 Using rsvg-convert...");
  try {
    execSync(
      `rsvg-convert -w ${TARGET_WIDTH} -h ${TARGET_HEIGHT} -o "${OUTPUT_PNG}" "${INPUT_SVG}"`,
      { stdio: "inherit" }
    );
    console.log("✅ Social card generated with rsvg-convert");
    return true;
  } catch (error) {
    console.error("❌ rsvg-convert failed:", error);
    return false;
  }
}

/**
 * Generate social card using Inkscape
 */
function generateWithInkscape(): boolean {
  console.log("📦 Using Inkscape...");
  try {
    execSync(
      `inkscape "${INPUT_SVG}" --export-type=png --export-filename="${OUTPUT_PNG}" --export-width=${TARGET_WIDTH} --export-height=${TARGET_HEIGHT}`,
      { stdio: "inherit" }
    );
    console.log("✅ Social card generated with Inkscape");
    return true;
  } catch (error) {
    console.error("❌ Inkscape conversion failed:", error);
    return false;
  }
}

/**
 * Generate social card using sips (macOS only)
 */
function generateWithSips(): boolean {
  console.log("📦 Using sips (macOS)...");
  try {
    execSync(
      `sips -s format png --resampleWidth ${TARGET_WIDTH} "${INPUT_SVG}" --out "${OUTPUT_PNG}"`,
      { stdio: "inherit" }
    );
    console.log("✅ Social card generated with sips");
    return true;
  } catch (error) {
    console.error("❌ sips conversion failed:", error);
    return false;
  }
}

/**
 * Main generation function
 */
function generateSocialCard(): void {
  console.log("🎨 Generating GitHub social card with 40pt safe margin...");
  console.log(`   Input:  ${INPUT_SVG}`);
  console.log(`   Output: ${OUTPUT_PNG}`);
  console.log(`   Size:   ${TARGET_WIDTH}×${TARGET_HEIGHT}px\n`);

  // Check if input file exists
  if (!existsSync(INPUT_SVG)) {
    console.error(`❌ Error: Input file not found: ${INPUT_SVG}`);
    process.exit(1);
  }

  // Try available tools in order of preference
  // rsvg-convert is preferred for better gradient/color support
  let success = false;

  if (commandExists("rsvg-convert")) {
    success = generateWithRsvg();
  } else if (commandExists("convert")) {
    success = generateWithImageMagick();
  } else if (commandExists("inkscape")) {
    success = generateWithInkscape();
  } else if (commandExists("sips")) {
    success = generateWithSips();
  } else {
    console.error("❌ Error: No suitable SVG conversion tool found!");
    console.error("\nPlease install one of the following:");
    console.error(
      "  • ImageMagick: brew install imagemagick (macOS) or apt install imagemagick (Linux)"
    );
    console.error("  • librsvg: brew install librsvg (macOS) or apt install librsvg2-bin (Linux)");
    console.error("  • Inkscape: brew install inkscape (macOS) or apt install inkscape (Linux)");
    console.error("  • sips: Built-in on macOS");
    process.exit(1);
  }

  if (success && existsSync(OUTPUT_PNG)) {
    console.log(`\n✅ Social card successfully generated: ${OUTPUT_PNG}`);
    console.log(`\n📝 Note: The 40pt safe margin ensures important content won't be cropped`);
    console.log("   when used as a GitHub repository social card.");
  } else {
    console.error("\n❌ Failed to generate social card");
    process.exit(1);
  }
}

// Run the script
generateSocialCard();
