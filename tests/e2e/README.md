# Visual Regression Tests

This directory contains visual regression tests for the Caligo Vue app using Playwright.

## Overview

Visual regression tests capture screenshots of UI components and compare them against baseline images to detect unintended visual changes.

## Running Tests

### Prerequisites

1. Start the development server:
   ```bash
   npm run pages:preview
   ```

2. In a separate terminal, run the tests:
   ```bash
   npm run test:e2e
   ```

### Updating Baselines

When you intentionally change the UI, update the baseline screenshots:

```bash
npx playwright test tests/e2e --update-snapshots
```

### Interactive Mode

Run tests in interactive UI mode:

```bash
npm run test:e2e:ui
```

## Test Structure

### Test Suites

- **Home Page**: Tests hero section, philosophy cards, navigation, footer
- **Theme Selector**: Tests theme switching UI components
- **Analysis Components**: Tests canvas-based visualizations
- **Gallery**: Tests screenshot grid and cards
- **Theme Switching**: Verifies themes change visual appearance
- **Responsive Design**: Tests mobile and tablet viewports
- **Color Consistency**: Validates no hardcoded colors are rendered

### Screenshot Naming

Screenshots are stored in `tests/e2e/visual-regression.spec.ts-snapshots/` with the following naming pattern:

```
{test-name}-{browser}.png
```

Example: `hero-section-chromium.png`

## Configuration

Visual regression tests use Playwright's built-in screenshot comparison with:

- **maxDiffPixels**: Tolerance for pixel differences (50-200 depending on component)
- **threshold**: Perceptual difference threshold (default: 0.2)

## Best Practices

1. **Keep baselines updated**: Regenerate after intentional UI changes
2. **Use appropriate tolerances**: Canvas elements need higher `maxDiffPixels`
3. **Test across viewports**: Include mobile, tablet, and desktop
4. **Test theme switching**: Verify themes properly update visuals
5. **Avoid flaky tests**: Use `waitForLoadState` and appropriate timeouts

## Troubleshooting

### Tests failing after theme updates

Regenerate baselines:
```bash
npx playwright test tests/e2e --update-snapshots
```

### Server not running

Ensure the preview server is running on port 4173:
```bash
npm run pages:preview
```

### Canvas rendering differences

Canvas elements may have minor pixel differences due to font rendering. Increase `maxDiffPixels` if needed.

## CI/CD Integration

Visual regression tests currently run in CI and **will fail the build** on screenshot differences by default, as Playwright's screenshot comparison is enabled. 

However, due to potential rendering differences across environments, you may want to make visual tests informational-only in CI. To do this, you can:

1. **Option 1**: Update the test configuration to skip visual tests in CI:
   ```typescript
   // In test files
   test.skip(process.env.CI, 'skipping visual regression in CI');
   ```

2. **Option 2**: Adjust the diff threshold to be more lenient:
   ```typescript
   // playwright.config.ts
   expect: {
     toHaveScreenshot: {
       maxDiffPixels: 200,  // Increase tolerance
       threshold: 0.3,       // Increase perceptual threshold
     },
   },
   ```
