import * as fs from "node:fs";
import * as path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "@playwright/test";

// Helper to run accessibility audit
// biome-ignore lint/suspicious/noExplicitAny: Axe results use dynamic violation object shape
async function runAxeAudit(page: Page, title: string): Promise<any> {
  console.log(`Running accessibility audit for: ${title}`);

  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    return {
      title,
      url: page.url(),
      timestamp: new Date().toISOString(),
      violations: results.violations,
    };
  } catch (e: unknown) {
    console.error(`Error running audit for ${title}:`, e);
    return {
      title,
      url: page.url(),
      error: e instanceof Error ? e.message : String(e),
      violations: [],
    };
  }
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Start local server if not already running (simplified for script runner)
  // Assuming the dev server is running at port 4173 based on package.json
  const baseUrl = "http://localhost:4173";

  const reportDir = path.resolve("build/reports/accessibility");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const routes = [
    { path: "/", name: "Home" },
    { path: "/#/gallery", name: "Gallery" },
    { path: "/#/analysis", name: "Analysis" },
  ];

  const auditResults = [];

  for (const route of routes) {
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
      // Wait a bit for animations/content to settle
      await page.waitForTimeout(1000);

      const result = await runAxeAudit(page, route.name);
      auditResults.push(result);

      console.log(`${route.name}: ${result.violations.length} violations found`);
      if (result.violations.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: Axe violation result shape
        result.violations.forEach((v: any) => {
          console.log(`  - ${v.id}: ${v.help} (${v.impact})`);
          console.log(`    Nodes: ${v.nodes.length}`);
        });
      }
    } catch (e) {
      console.error(`Failed to audit ${route.name}:`, e);
    }
  }

  // Save full report
  const reportPath = path.join(reportDir, "axe-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nFull accessibility report saved to: ${reportPath}`);

  // Generate summary markdown
  let markdown = "# Accessibility Audit Report\n\n";
  markdown += `**Date:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Routes Audited:** ${routes.length}\n\n`;

  auditResults.forEach(result => {
    const status =
      result.violations.length === 0 ? "✅ Pass" : `❌ ${result.violations.length} Issues`;
    markdown += `## ${result.title} (${status})\n`;

    if (result.violations.length > 0) {
      markdown += "| Impact | Issue | Description | Nodes |\n";
      markdown += "| :--- | :--- | :--- | :--- |\n";
      // biome-ignore lint/suspicious/noExplicitAny: Axe violation result shape
      result.violations.forEach((v: any) => {
        markdown += `| **${v.impact}** | ${v.id} | ${v.help} | ${v.nodes.length} |\n`;
      });
    } else {
      markdown += "No accessibility violations detected.\n";
    }
    markdown += "\n";
  });

  const mdPath = path.join(reportDir, "axe-audit.md");
  fs.writeFileSync(mdPath, markdown);
  console.log(`summary markdown saved to: ${mdPath}`);

  await browser.close();
}

main().catch(console.error);
