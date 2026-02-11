# Contributing to Caligo

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork and clone** the repository
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Build and generate themes:**
   ```bash
   npm run build && npm run generate
   ```
4. **Run tests:**
   ```bash
   npm test
   ```

### Troubleshooting: Biome (linting)

If `npm run lint` or the pre-commit hook fails with an error like `Cannot find module '@biomejs/cli-.../biome'`, we pin the CLI for consistent behavior across platforms. Use the npm scripts which run Biome via `npx` non-interactively:

```bash
npm run lint         # uses npx --yes @biomejs/biome@2.3.10 check .
npm run lint:fix     # uses npx --yes @biomejs/biome@2.3.10 check . --write
```

This avoids local lockfile/platform mismatches that can cause CI failures. If you still encounter issues, try running the commands directly with `npx --yes @biomejs/biome@2.3.10` or open an issue.

## Making Changes

### Seeds and Color Palettes

All theme colors are derived from JSON seeds in `src/seeds/*.json`. Each seed defines:
- `background`: OKLCH base surface color
- `accent`: OKLCH primary accent color
- `harmony`: Base harmony mode (e.g., `triadic`)
- `intentMode`: Enable intent-based semantic coloring
- `intentEmphasis`: Emphasis mode for intent colors (e.g., `balanced`)

**To add a new seed:**
1. Create `src/seeds/YourSeedName.json` following the existing structure
2. Run `npm run generate` to produce all harmony variants
3. Test in VS Code with `F5` (Extension Development Host)

**To modify existing seeds:**
1. Edit the seed JSON file
2. Regenerate with `npm run build && npm run generate`
3. Validate contrast and colors in `build/palettes/*` and preview

### Code Changes

- **Generator logic:** `src/lib/palette.ts`, `src/lib/vscode-theme.ts`
- **Intent/semantic mappings:** `src/lib/intent-layers.ts`, `src/lib/semantic-tokens.ts`
- **Preview template:** `src/templates/preview.ts`

Always run `npm run build` after TypeScript changes and `npm run generate` to regenerate themes.

### Social Card Assets

The repository includes a GitHub social card with a 40pt safe margin following GitHub's Repo Card Template guidance. To regenerate the social card PNG from the SVG source:

```bash
npm run images:social-card
```

See `images/SOCIAL_CARD.md` for details about the safe margin specification and usage instructions.

## Testing

- **Unit tests:** `npm test` (schema coverage, constraint validation)
- **Visual testing:** Press `F5` in VS Code to launch Extension Development Host
- **Preview validation:** Open `build/preview/index.html` after regenerating

## Code Style

- Follow the existing TypeScript conventions
- Use `npm run build` to ensure no compilation errors
- Keep functions small and focused; add comments for complex color math
- Prefer OKLCH color manipulation over direct hex editing

### Underscore naming convention ⚠️

- Use a leading underscore only for intentionally unused variables (e.g., `_unused`).
- **Do not** use a leading underscore for variables or functions that are referenced in Vue templates.
- Enforced via `npm run check:underscores` (runs in CI and pre-push hooks).

### Vue App Development

For Vue landing page development, see [docs/vue-development.md](docs/vue-development.md) for:
- CSS custom property usage
- Color theming guidelines
- Canvas rendering patterns

## Commit Guidelines

- **Branch naming:** Use descriptive names (e.g., `add-new-seed-moonlight`, `fix-intent-toggle`)
- **Commit messages:** Clear, imperative mood (e.g., "Add Moonlight seed", "Fix intent toggle persistence")
- **Before publishing:** Squash to a single commit titled `Initial Commit` (project policy for release branches)

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes and test locally
3. Run `npm run build && npm run generate && npm test`
4. **Do NOT commit** generated artifacts (`build/*`, `themes/*`)—CI regenerates them
5. Push your branch and open a PR with a clear description
6. Wait for review and CI checks

## Extension Packaging (VSIX)

The published extension should stay lean. The VSIX is expected to include only:

- `themes/*.json` (generated theme files)
- `build/extension.js` (+ source map)
- `images/icon.png` and `images/banner.png` (extension icon + README banner)
- `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`

Everything else (Vue app, reports, screenshots, social cards, SVG sources, tests) should remain excluded via `.vscodeignore`.

## Release-Based Pages Publication

- **Development mode (preview):** Pushes to `main` build and deploy the Vue app to GitHub Pages.
- **Release mode (production):** Publishing a GitHub Release with a `vX.Y.Z` tag triggers the release workflow to build screenshots, publish Pages, and upload the VSIX to the release.
- **Note:** Tag pushes alone no longer deploy Pages; the release must be published.

**Release steps:**
1. Create and push the `vX.Y.Z` tag from the `main` branch.
2. Publish the GitHub Release (draft → publish or `gh release create`).
3. CI builds and deploys the production Pages site and publishes the VSIX.

## Publication Checklist

- [ ] All changes are in `src/` (no generated artifacts tracked)
- [ ] `npm run build` completed successfully
- [ ] `npm run generate` completed successfully
- [ ] `npm test` completed successfully
- [ ] No `build/*` or `themes/*` files are staged
- [ ] Local commits squashed to a single `Initial Commit`

## What NOT to Commit

- `build/` — regenerated by CI
- `themes/` — regenerated theme JSON files
- `node_modules/` — dependencies
- `*.log` — log files

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating duplicates
- For color science questions, reference `contrast-and-oklch-analysis.md` in `.serena/memories/`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
