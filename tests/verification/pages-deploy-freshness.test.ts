import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// Regression guard for the stale-site incident of 2026-10-21: pushing the old
// v0.7.0 tag re-ran the release pipeline on September code, and its
// release-pages job deployed that old site over the current one. Pages is a
// single global slot, so a tag build may only deploy when the tagged commit is
// still main's head — otherwise the main pipeline owns the site.

const workflow = readFileSync(resolve(process.cwd(), ".github", "workflows", "cicd.yml"), "utf-8");

/** Text of one top-level job, from its `  name:` key to the next job key. */
function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  if (start === -1) return "";
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

test("a pages-freshness job compares the tagged commit with main's head", () => {
  const job = jobBlock("pages-freshness");
  expect(job).not.toBe("");
  expect(job).toContain("refs/heads/main");
  expect(job).toContain("GITHUB_SHA");
  expect(job).toMatch(/outputs:\s*\n\s+current:/);
});

test("release-pages only deploys when the tag is main's current head", () => {
  const job = jobBlock("release-pages");
  expect(job).not.toBe("");
  expect(job).toMatch(/needs:\s*\[[^\]]*pages-freshness[^\]]*\]/);
  expect(job).toMatch(/if:.*needs\.pages-freshness\.outputs\.current == 'true'/);
});
