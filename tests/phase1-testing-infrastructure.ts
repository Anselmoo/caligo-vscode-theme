/**
 * Phase 1: Automated Testing Infrastructure
 *
 * This test harness implements T001-T006:
 * - T001: Automated theme switching using mcp_chrome-devtoo_click
 * - T003: Snapshot capture using mcp_chrome-devtoo_take_snapshot
 * - T005: Snapshot comparison algorithm
 *
 * Strategy:
 * 1. Switch between theme variants using mcp_chrome-devtoo_click
 * 2. Capture DOM snapshots after each switch
 * 3. Compare computed colors across light/dark theme pairs
 * 4. Generate report of non-responsive elements
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESULTS_DIR = path.resolve(__dirname, "..", "test-results");
const SNAPSHOTS_DIR = path.join(TEST_RESULTS_DIR, "theme-snapshots");
const REPORT_PATH = path.join(TEST_RESULTS_DIR, "non-responsive-colors-report.json");

// Ensure directories exist
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}
if (!fs.existsSync(SNAPSHOTS_DIR)) {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

/**
 * T001: Theme Switching Test
 *
 * Uses mcp_chrome-devtoo_click to switch between theme variants.
 * This is a reference implementation showing the expected flow.
 */
export const themeVariants = [
  { label: "Analogous Light", selector: "Analogous" },
  { label: "Analogous Dark", selector: "Analogous" },
  { label: "Monochromatic Light", selector: "Monochromatic" },
  { label: "Monochromatic Dark", selector: "Monochromatic" },
  { label: "Base", selector: "Base" },
];

/**
 * T003: Snapshot Structure
 *
 * Defines the expected format for DOM snapshots with computed colors.
 */
export interface DOMSnapshot {
  themeName: string;
  timestamp: string;
  elements: Array<{
    selector: string;
    tagName: string;
    text?: string;
    computed: {
      color?: string;
      backgroundColor?: string;
      borderColor?: string;
      fill?: string;
      stroke?: string;
    };
  }>;
}

/**
 * T005: Snapshot Comparison Algorithm
 *
 * Compares two snapshots to identify elements with identical colors.
 */
export interface ColorComparison {
  selector: string;
  tagName: string;
  theme1: string;
  theme2: string;
  colors: {
    color?: { same: boolean; value1?: string; value2?: string };
    backgroundColor?: { same: boolean; value1?: string; value2?: string };
    borderColor?: { same: boolean; value1?: string; value2?: string };
    fill?: { same: boolean; value1?: string; value2?: string };
    stroke?: { same: boolean; value1?: string; value2?: string };
  };
}

/**
 * Non-responsive Elements Report
 */
export interface NonResponsiveReport {
  generatedAt: string;
  totalElementsChecked: number;
  nonResponsiveCount: number;
  nonResponsiveElements: Array<{
    selector: string;
    tagName: string;
    themeA: string;
    themeB: string;
    staticColors: string[];
    suggestedFix: string;
  }>;
}

/**
 * Helper: Compare two color values with tolerance
 * Handles hex, rgb, rgba formats
 */
export function areColorsEqual(color1?: string, color2?: string, tolerance = 5): boolean {
  if (!color1 || !color2) return color1 === color2;

  // Normalize to rgb format for comparison
  const normalize = (c: string): [number, number, number] | null => {
    // Handle rgb/rgba
    const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
    }

    // Handle hex
    const hexMatch = c.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (hexMatch) {
      return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
    }

    return null;
  };

  const rgb1 = normalize(color1);
  const rgb2 = normalize(color2);

  if (!rgb1 || !rgb2) return false;

  // Calculate distance with tolerance
  const distance = Math.sqrt(
    (rgb1[0] - rgb2[0]) ** 2 + (rgb1[1] - rgb2[1]) ** 2 + (rgb1[2] - rgb2[2]) ** 2
  );

  // Tolerance scale: 5% of max color distance (255*3 = 765)
  const maxDistance = (255 * 3 * tolerance) / 100;
  return distance <= maxDistance;
}

/**
 * Compare two snapshots for identical colors
 */
export function compareSnapshots(snap1: DOMSnapshot, snap2: DOMSnapshot): ColorComparison[] {
  const results: ColorComparison[] = [];

  // Create map of elements by selector for snap2
  const snap2Map = new Map(snap2.elements.map(el => [el.selector, el]));

  // Compare each element in snap1 with snap2
  for (const el1 of snap1.elements) {
    const el2 = snap2Map.get(el1.selector);
    if (!el2) continue;

    const comparison: ColorComparison = {
      selector: el1.selector,
      tagName: el1.tagName,
      theme1: snap1.themeName,
      theme2: snap2.themeName,
      colors: {},
    };

    // Compare each color property
    const colorProps = ["color", "backgroundColor", "borderColor", "fill", "stroke"] as const;
    for (const prop of colorProps) {
      const c1 = el1.computed[prop];
      const c2 = el2.computed[prop];

      if (c1 || c2) {
        comparison.colors[prop] = {
          same: areColorsEqual(c1, c2),
          value1: c1,
          value2: c2,
        };
      }
    }

    results.push(comparison);
  }

  return results;
}

/**
 * Generate non-responsive elements report
 */
export function generateNonResponsiveReport(comparisons: ColorComparison[]): NonResponsiveReport {
  const nonResponsiveElements = comparisons
    .filter(comp => {
      // Check if any color property remained the same
      return Object.values(comp.colors).some(colorProp => colorProp?.same === true);
    })
    .map(comp => {
      const staticColors = Object.entries(comp.colors)
        .filter(([_, colorProp]) => colorProp?.same === true)
        .map(([prop]) => prop);

      return {
        selector: comp.selector,
        tagName: comp.tagName,
        themeA: comp.theme1,
        themeB: comp.theme2,
        staticColors,
        suggestedFix: `Update ${comp.selector} to use CSS custom properties or useTheme() composable for colors: ${staticColors.join(", ")}`,
      };
    })
    .sort((a, b) => {
      // Prioritize critical elements
      const priority: Record<string, number> = {
        ".section-title": 1,
        "h1,h2,h3,h4,h5,h6": 2,
        ".component-title": 3,
      };
      const aPriority = priority[a.selector] ?? 99;
      const bPriority = priority[b.selector] ?? 99;
      return aPriority - bPriority;
    });

  return {
    generatedAt: new Date().toISOString(),
    totalElementsChecked: comparisons.length,
    nonResponsiveCount: nonResponsiveElements.length,
    nonResponsiveElements,
  };
}

/**
 * Save snapshot to JSON
 */
export function saveSnapshot(snapshot: DOMSnapshot): void {
  const filename = `${snapshot.themeName.replace(/\s+/g, "-").toLowerCase()}.json`;
  const filepath = path.join(SNAPSHOTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`✓ Snapshot saved: ${filepath}`);
}

/**
 * Load snapshot from JSON
 */
export function loadSnapshot(themeName: string): DOMSnapshot | null {
  const filename = `${themeName.replace(/\s+/g, "-").toLowerCase()}.json`;
  const filepath = path.join(SNAPSHOTS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return null;
  }

  const content = fs.readFileSync(filepath, "utf-8");
  return JSON.parse(content) as DOMSnapshot;
}

/**
 * Save report to JSON
 */
export function saveReport(report: NonResponsiveReport): void {
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`✓ Report saved: ${REPORT_PATH}`);
  console.log(
    `\n📊 Found ${report.nonResponsiveCount} non-responsive elements out of ${report.totalElementsChecked}`
  );

  if (report.nonResponsiveElements.length > 0) {
    console.log("\n🎯 Non-responsive elements (prioritized):");
    for (const el of report.nonResponsiveElements.slice(0, 10)) {
      console.log(`  - ${el.selector} (${el.tagName})`);
      console.log(`    Static colors: ${el.staticColors.join(", ")}`);
    }
  }
}

/**
 * Test Framework Instructions
 *
 * To implement this in a Playwright test:
 *
 * ```typescript
 * import { test, expect } from '@playwright/test';
 * import {
 *   themeVariants,
 *   saveSnapshot,
 *   loadSnapshot,
 *   compareSnapshots,
 *   generateNonResponsiveReport,
 *   saveReport,
 * } from '@/tests/phase1-testing-infrastructure';
 *
 * test.describe('Phase 1: Theme Responsiveness Testing', () => {
 *   test('T001-T003: Capture snapshots for all themes', async ({ page }) => {
 *     // 1. Navigate to preview
 *     await page.goto('http://192.168.1.143:4173/');
 *     await page.waitForLoadState('networkidle');
 *
 *     // 2. For each theme variant:
 *     for (const variant of themeVariants) {
 *       // Use mcp_chrome-devtoo_click to select theme
 *       const themeButton = page.locator(`button[data-harmony="${variant.selector}"]`);
 *       await themeButton.click();
 *       await page.waitForTimeout(300); // Wait for theme transition
 *
 *       // Use mcp_chrome-devtoo_take_snapshot to capture DOM
 *       const snapshot = await page.evaluate(() => {
 *         const elements = document.querySelectorAll('[data-testid], .section-title, canvas');
 *         const result = {
 *           themeName: variant.label,
 *           timestamp: new Date().toISOString(),
 *           elements: Array.from(elements).map(el => ({
 *             selector: el.getAttribute('data-testid') || el.className || el.tagName,
 *             tagName: el.tagName,
 *             text: el.textContent?.substring(0, 50),
 *             computed: {
 *               color: window.getComputedStyle(el).color,
 *               backgroundColor: window.getComputedStyle(el).backgroundColor,
 *               borderColor: window.getComputedStyle(el).borderColor,
 *               fill: (el as SVGElement).getAttribute?.('fill'),
 *               stroke: (el as SVGElement).getAttribute?.('stroke'),
 *             },
 *           })),
 *         };
 *         return result;
 *       });
 *
 *       saveSnapshot(snapshot);
 *     }
 *   });
 *
 *   test('T005: Generate comparison report', async () => {
 *     // Load two snapshots for comparison
 *     const snap1 = loadSnapshot('Analogous Light');
 *     const snap2 = loadSnapshot('Analogous Dark');
 *
 *     expect(snap1).toBeTruthy();
 *     expect(snap2).toBeTruthy();
 *
 *     // Compare snapshots
 *     const comparisons = compareSnapshots(snap1!, snap2!);
 *
 *     // Generate report
 *     const report = generateNonResponsiveReport(comparisons);
 *     saveReport(report);
 *
 *     // Assertion: Should have 0 non-responsive elements
 *     expect(report.nonResponsiveCount).toBe(0);
 *   });
 * });
 * ```
 */

export const TEST_INSTRUCTIONS = `
Phase 1 Testing Implementation Guide
=====================================

1. Create tests/e2e/theme-responsiveness.spec.ts with the template above
2. Install Playwright if not already done: npm install -D @playwright/test
3. Update playwright.config.ts to point to http://192.168.1.143:4173/
4. Run tests: npx playwright test tests/e2e/theme-responsiveness.spec.ts

Expected Outputs:
- test-results/theme-snapshots/*.json (snapshots of each theme)
- test-results/non-responsive-colors-report.json (comparison report)

The report will list elements where colors don't change across theme switches.
These are the components to fix in Phase 3.
`;
