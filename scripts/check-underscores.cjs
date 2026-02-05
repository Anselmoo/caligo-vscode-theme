#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const src = path.join(root, "src/vue-app");

function findFiles(dir, list = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    if (it.isDirectory()) {
      findFiles(path.join(dir, it.name), list);
    } else if (it.name.endsWith(".vue")) {
      list.push(path.join(dir, it.name));
    }
  }
  return list;
}

function extractBlocks(content, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = content.match(re);
  return m ? m[1] : "";
}

const files = findFiles(src);
const issues = [];
for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const script = extractBlocks(content, "script");
  const template = extractBlocks(content, "template");
  if (!script || !template) continue;

  // find declarations (const name, function name)
  const decls = new Set();
  const reConst = /const\s+([a-zA-Z_$][\w$]*)/g;
  const reFunc = /function\s+([a-zA-Z_$][\w$]*)/g;
  let m = reConst.exec(script);
  while (m) {
    decls.add(m[1]);
    m = reConst.exec(script);
  }
  m = reFunc.exec(script);
  while (m) {
    decls.add(m[1]);
    m = reFunc.exec(script);
  }

  for (const name of Array.from(decls)) {
    const usedInTemplate = new RegExp(`\\b${name}\\b`).test(template);
    const nameNoUnderscore = name.replace(/^_+/, "");
    const usedNoUnderscore = new RegExp(`\\b${nameNoUnderscore}\\b`).test(template);

    if (name.startsWith("_") && usedNoUnderscore) {
      issues.push({
        file: file,
        message: `Declaration "${name}" has leading underscore but template uses "${nameNoUnderscore}". Remove underscore from the declaration.`,
      });
    } else if (
      !name.startsWith("_") &&
      usedInTemplate &&
      name !== nameNoUnderscore &&
      nameNoUnderscore !== name
    ) {
      // noop
    } else if (name.startsWith("_") && usedInTemplate) {
      issues.push({
        file: file,
        message: `Declaration "${name}" is used in template; remove leading underscore.`,
      });
    }
  }
}

if (issues.length) {
  console.error("Underscore consistency check failed:");
  for (const it of issues) {
    console.error(`- ${it.file}: ${it.message}`);
  }
  process.exit(1);
}
console.log("Underscore consistency check passed.");
process.exit(0);
