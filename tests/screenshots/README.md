# Theme Screenshot Tests

This directory contains automation notes and sample assets for Caligo screenshots.

## Architecture

We capture real VS Code rendering via the reuse-first automation script in `scripts/capture-vscode-screenshots-reuse.ts` (recommended for CI and local smoke runs).

## Running Tests

```bash
# Generate screenshots for VS Code (real rendering)
# Legacy per-theme script (kept for compatibility):
npm run screenshots:vscode

# New reuse-first script (recommended):
# Runs a single Electron instance and iterates themes for much faster CI runs
npx tsx scripts/capture-vscode-screenshots-reuse.ts --full --lang typescript

# Local fast smoke run (3-5 themes, TypeScript-only):
# Useful for quick local validation
npx tsx scripts/capture-vscode-screenshots-reuse.ts --aurora-demo --lang typescript --output ./tmp-screenshots-reuse

# Docker (headless) — example
# Run inside the localbuilt image (xvfb-run required for headless display):
#
# docker run --rm --cap-add=SYS_ADMIN --ipc=host -v "$PWD:/work" -w /work -e CODE_EXECUTABLE="/usr/share/code/code" -e CODE_ARGS="--no-sandbox --user-data-dir /tmp/vscode-user-data --disable-gpu --disable-dev-shm-usage" caligo-vscode-playwright:local /bin/bash -lc "chown -R pwuser:pwuser /work || true; mkdir -p /tmp/vscode-user-data; chown -R pwuser:pwuser /tmp/vscode-user-data || true; su -s /bin/bash pwuser -c \"xvfb-run --auto-servernum --server-args=' -screen 0 1920x1080x24' npm run screenshots:vscode:smoke-local\""


# Screenshots will be saved to docs/images/themes (or to your --output)
```

## Screenshot Types

### 1. Overview Screenshot
- `caligo-all-themes-overview.png` - Full-page view of all 50 themes

### 2. Individual Theme Cards
- `{ThemeName}-card.png` - Complete theme card with code samples

### 3. Language-Specific Samples
- `{ThemeName}-{language}.png` - Specific language highlighting

### 4. Palette Comparisons
- `{ThemeName}-palette.png` - Color palette swatches

## Test Samples

Test files in `test-samples/` demonstrate language-specific features:

- `python-decorators.py` - Python decorators (@dataclass, @property)
- `rust-macros.rs` - Rust macros (vec!, println!) and attributes (#[derive])
- `java-annotations.java` - Java annotations (@Service, @Override)
- `typescript-types.ts` - TypeScript readonly modifiers and types

## CI/CD Integration

You can run the script in CI if the runner supports VS Code + Playwright/Electron.

## Benefits vs Manual Simulation

| Aspect                   | Manual Shiki Simulation        | Real VS Code Screenshots      |
| ------------------------ | ------------------------------ | ----------------------------- |
| **Accuracy**             | ~70% (missing semantic tokens) | **100%** (real rendering)     |
| **@dataclass splitting** | Complex regex hacks            | **Native Pylance behavior**   |
| **Maintenance**          | High (per-language rules)      | **Low (automatic)**           |
| **Language Support**     | Manual per language            | **Automatic with extensions** |

## Next Steps

1. ✅ Set up test infrastructure
2. ⏭️ Implement actual screenshot capture (via extension or API)
3. ⏭️ Add CI/CD workflow with xvfb
4. ⏭️ Compare screenshots across theme variants
