# Integration Tests

Integration tests validate the complete theme generation pipeline from seeds to final VSCode theme JSON output.

## Test Structure

### 1. theme-generation.test.ts
Tests the full pipeline: seed → palette → theme
- Palette derivation from seeds
- All harmony modes (Balanced, Analogous, Monochromatic, Triadic, SplitComplementary)
- Theme generation from palette
- Multi-theme distinctness

### 2. output-validation.test.ts
Validates theme output structure and format
- JSON serialization
- Required VSCode theme properties
- Color format validation (hex codes)
- Forbidden color checks (no pure black)
- Token colors and scopes
- Semantic token mapping

### 3. contrast-validation.test.ts  
Ensures accessibility through contrast requirements
- Editor foreground/background contrast (APCA Lc 75+)
- UI element readability
- Semantic colors (errors, warnings, success)
- Terminal colors
- Consistency across harmony modes

### 4. seed-processing.test.ts
Tests seed validation and error handling
- Valid seed acceptance
- Invalid seed rejection (pure black, out-of-range values)
- Edge cases (boundary values, grayscale)
- Batch processing

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## What's Tested

✅ Theme generation pipeline  
✅ Color transformations (OKLCH → hex)  
✅ Contrast requirements (APCA)  
✅ VSCode theme structure  
✅ Semantic token mapping  
✅ Error handling  
✅ Batch processing  

## Coverage Goal

Target: 80%+ coverage of theme generation logic in `src/lib/`
