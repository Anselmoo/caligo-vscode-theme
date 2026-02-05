import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const vueAppDir = join(rootDir, "src", "vue-app");

// Pattern to match hex colors (e.g., #fff, #ffffff, #ffffffff)
const HEX_COLOR_PATTERN = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

// Allowed contexts where hardcoded colors are acceptable
const ALLOWED_CONTEXTS: RegExp[] = [
  /\|\|\s*["'](#[0-9a-fA-F]{3,8})["']/,
  /formatHex\s*\([^)]*\)\s*\|\|\s*["'](#[0-9a-fA-F]{3,8})["']/,
  /\b\w*(?:Fallback(?:Color)?)\s*:\s*string\s*=\s*["']#[0-9a-fA-F]{3,8}["']/,
];

// Files/directories to exclude
const EXCLUDE_PATTERNS = ["node_modules", "dist", "build", ".git"] as string[];

// Regex to detect test files (e.g., foo.test.ts, foo.spec.js, foo.test.vue)
const TEST_FILE_REGEX = /(?:^|[\\/])[^\\/]+\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|vue)$/i;

// Regex to detect __tests__ directories as full path segments
const TESTS_DIR_REGEX = /(?:^|[\\/])__tests__(?:[\\/]|$)/;

function shouldExclude(filePath: string): boolean {
  if (EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))) return true;
  if (TESTS_DIR_REGEX.test(filePath)) return true;
  if (TEST_FILE_REGEX.test(filePath)) return true;
  return false;
}

function isAllowedContext(line: string): boolean {
  if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
    return true;
  }

  return ALLOWED_CONTEXTS.some(pattern => pattern.test(line));
}

function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);

    if (shouldExclude(filePath)) continue;

    const stat = statSync(filePath);

    if (stat.isDirectory()) findFiles(filePath, fileList);
    else if (/\.(vue|ts|js|tsx|jsx)$/.test(file)) fileList.push(filePath);
  }

  return fileList;
}

function lintFile(filePath: string) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Array<{ line: number; column: number; color: string; text: string }> = [];

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(HEX_COLOR_PATTERN)];

    for (const match of matches) {
      if (!isAllowedContext(line)) {
        violations.push({
          line: index + 1,
          column: (match.index ?? 0) + 1,
          color: match[0],
          text: line.trim(),
        });
      }
    }
  });

  return violations;
}

function main(): number {
  console.log("🔍 Scanning for hardcoded hex colors in Vue app...\n");

  const files = findFiles(vueAppDir);
  let totalViolations = 0;
  const violationsByFile = new Map<
    string,
    Array<{ line: number; column: number; color: string; text: string }>
  >();

  for (const file of files) {
    const violations = lintFile(file);

    if (violations.length > 0) {
      const relativePath = relative(rootDir, file);
      violationsByFile.set(relativePath, violations);
      totalViolations += violations.length;
    }
  }

  if (totalViolations === 0) {
    console.log("✅ No hardcoded hex colors found!\n");
    return 0;
  }

  console.log(`❌ Found ${totalViolations} hardcoded hex color(s):\n`);

  for (const [file, violations] of violationsByFile) {
    console.log(`📄 ${file}`);
    for (const violation of violations) {
      console.log(`   Line ${violation.line}:${violation.column} - ${violation.color}`);
      console.log(`   ${violation.text}`);
      console.log("");
    }
  }

  console.log("💡 Recommended fixes:");
  console.log("   1. Use CSS custom properties: var(--color-name)");
  console.log("   2. Use the useColors() composable for programmatic access");
  console.log("   3. For fallbacks in || operators, ensure you're using theme colors first\n");

  return totalViolations > 0 ? 1 : 0;
}

const exitCode = main();
process.exit(exitCode);
