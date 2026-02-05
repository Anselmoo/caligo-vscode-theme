# Clean Screenshot Architecture

## Problem

You have two types of screenshot results:
- ✅ **Working**: `caligo-void-ember-analogous-typescript.png` - Clean code with theme background
- ❌ **Failed**: `caligo-aurora-noir-analogous-python.png` - Has external page/container background

## Solution: Playwright `omitBackground` + Element-Level Screenshots

### Key Techniques

#### 1. Screenshot Only the Code Preview Pane (Not the Whole Card)

```typescript
// ❌ Wrong - captures entire card with container styling
await card.screenshot({ path: 'screenshot.png' });

// ✅ Correct - captures only the code preview area
const codePreview = card.locator('.code-preview.active');
await codePreview.screenshot({ path: 'screenshot.png' });
```

#### 2. Use `omitBackground: true` for Transparent PNGs

```typescript
// Makes surrounding areas transparent instead of white/gray
await codePreview.screenshot({
  path: 'screenshot.png',
  omitBackground: true  // KEY: Transparent background
});
```

#### 3. Inject CSS to Ensure Clean Boundaries

```typescript
await page.addStyleTag({
  content: `
    body.screenshot-mode {
      background: transparent !important;
    }
    body.screenshot-mode .card {
      background: transparent !important;
      box-shadow: none !important;
    }
  `
});
```

### Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Load Preview HTML                                           │
│     file:///path/to/build/preview/index.html                    │
├─────────────────────────────────────────────────────────────────┤
│  2. Inject Screenshot-Mode CSS                                  │
│     - Make body/containers transparent                          │
│     - Keep code preview background (theme's bg0)                │
├─────────────────────────────────────────────────────────────────┤
│  3. For Each Theme Card (50 variants):                          │
│     a. Locate by [data-theme-id="ThemeName"]                    │
│     b. Click language tab: .tab[data-lang="python"]             │
│     c. Wait for: .code-preview[data-preview="python"].active    │
├─────────────────────────────────────────────────────────────────┤
│  4. Capture Element Screenshot                                  │
│     codePreview.screenshot({                                    │
│       path: 'caligo-themename-language.png',                  │
│       omitBackground: true  // For transparent                  │
│     });                                                         │
├─────────────────────────────────────────────────────────────────┤
│  5. Output: Clean PNG with theme background or transparency     │
└─────────────────────────────────────────────────────────────────┘
```

## Usage

### Quick Test (Smoke Test)

```bash
npx playwright test tests/screenshots/clean-code-screenshots.spec.ts -g "smoke test"
```

### Generate All TypeScript Screenshots

```bash
npx playwright test tests/screenshots/clean-code-screenshots.spec.ts -g "capture all themes"
```

### Generate Transparent PNGs

```bash
npx playwright test tests/screenshots/clean-code-screenshots.spec.ts -g "transparent"
```

### Full Suite

```bash
npm run test:screenshots:clean
```

## Output Structure

```
tests/screenshots/output/clean/
├── caligo-voidemberanalogous-typescript.png    # With theme bg
├── caligo-auroranoir-python.png                # With theme bg
├── caligo-auroranoir-python-transparent.png    # Transparent bg
└── transparent/
    └── (showcase screenshots)
```

## Two Capture Modes

### Mode 1: Theme Background (Default)
Best for documentation and theme showcases - shows the code with its natural theme background.

```typescript
await captureCodeScreenshot(page, card, themeId, "typescript");
```

### Mode 2: Transparent Background
Best for overlays, marketing materials, or compositing - code floats on transparent background.

```typescript
await captureCodeScreenshot(page, card, themeId, "typescript", { 
  transparent: true 
});
```

## Why This Works

1. **Shiki Preview** generates HTML with accurate VS Code syntax highlighting
2. **Playwright** can screenshot specific elements (not just full page)
3. **omitBackground** tells Chromium to render transparent pixels instead of white
4. **Element isolation** means we capture only `.code-preview`, not parent containers

## CI Integration

The tests run in headless Chromium, compatible with GitHub Actions:

```yaml
- name: Generate Clean Screenshots
  run: npm run test:screenshots:clean
  
- name: Upload Screenshots
  uses: actions/upload-artifact@v4
  with:
    name: theme-screenshots
    path: tests/screenshots/output/clean/
```

## Comparison with Other Approaches

| Approach                             | Pros                     | Cons                                |
| ------------------------------------ | ------------------------ | ----------------------------------- |
| **VS Code Extension (dom-to-image)** | Real VS Code rendering   | Complex, slow, flaky                |
| **CodeSnap-style**                   | Beautiful output         | Requires VS Code session            |
| **Playwright + Shiki (this)**        | Fast, reliable, CI-ready | Uses preview HTML, not live VS Code |

The Playwright approach gives us the best balance of accuracy (Shiki matches VS Code highlighting) and reliability (runs anywhere, headless).
