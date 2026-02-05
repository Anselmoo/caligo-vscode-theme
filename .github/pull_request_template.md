## Summary

This PR adds a tag-based release workflow using `standard-version`, updates `.gitignore` to avoid committing generated artifacts, and adds a `release` job to the existing `ci.yml` workflow that packages the extension (.vsix), creates a GitHub Release, uploads the .vsix, and publishes to the Visual Studio Marketplace using the `VSCE_TOKEN` secret.

## Changes
- Add `standard-version` dev dependency
- Add `release` and `release:ci` npm scripts
- Update `.github/workflows/ci.yml` to trigger releases on tag push and add `release` job
- Add README publishing instructions and CI/Release badges
- Remove generated public seeds from repo index

## How to test
1. Locally: run `npm run release -- --dry-run` to preview changelog and tagging.
2. Create a tag `vX.Y.Z` and push: `git push --follow-tags` — the release job should run and publish the `.vsix` (requires `VSCE_TOKEN`).

## Notes
- Add `VSCE_TOKEN` to repository secrets with Marketplace publish rights.
