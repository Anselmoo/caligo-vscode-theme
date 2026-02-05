# Copilot / Contributor Instructions — Caligo Theme

**Purpose:** This file documents the expected local workflow and release discipline for contributors and Copilot agents. Follow this process before pushing anything to the remote repository.

## Principles
- Source of truth: All generation logic lives in TypeScript under `src/` (generator, validators, mapping). Palettes/seeds are designer-friendly JSON or optional TS modules under `src/seeds/`.
- No generated artifacts in the main branch: Do NOT commit generated theme JSON files (`build/themes/*`). Generation runs locally and in CI; generated artifacts are uploaded by CI for review and release.
- Use tools for architecture and research responsibly: `mcp_ai-agent-guid_architecture-design-prompt-builder`, `mcp_ai-agent-guid_l9-distinguished-engineer-prompt-builder`, and `vscode-websearchforcopilot_webSearch` are permitted for research and design; keep findings in repo memory and link to them in PRs.

## Local workflow (mandatory) ✅
1. Create a local branch for your work.
2. Implement changes in TypeScript under `src/` (add tests and, if applicable, seed JSON under `src/seeds/`).
3. Run generation locally and validate: `npm run build` → `npm run generate` (or `npm run generate:dev`).
4. Run the test suite and linting: `npm test`.
5. Iterate locally (multiple commits are fine while developing). Keep changes small and well-scoped.
6. When the work is ready for review and you have validated outputs locally, **squash your local commits into a single commit** with the message:

   `Initial Commit`

   This repository policy ensures a single clean commit is published to the remote for review and release.
7. Push the single squashed commit and open a Pull Request for review.

> Note: CI will run generation and validation (forbidden black checks, per-token contrast rules, and seed schema validation). If CI fails, fix the seed/source and re-run locally before updating the PR.

## Release guidance
- Releases are performed from CI after PR approval; CI regenerates themes and uploads `build/reports/*` and `build/themes/*` as artifacts.
- Do not push generated artifacts manually.

## Quick checklist before squashing & pushing 🚦
- [ ] All unit tests pass locally
- [ ] Palettes/seeds validated against schema
- [ ] No forbidden-black colors produced by generation
- [ ] `build/reports` contains suggested palette deltas (if autofix was applied)

If you have any questions about this process, add a comment to the issue or open a short RFC PR describing the change.
