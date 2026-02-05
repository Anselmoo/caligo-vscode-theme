# 🚀 Quick Start Guide

Developer quick start for the Caligo theme project.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
# Clone and install
git clone https://github.com/Anselmoo/caligo-vscode-theme.git
cd caligo-vscode-theme
npm install

# Build TypeScript + generate themes
npm run prepare
```

## Development

### Theme Development

```bash
# Generate themes
npm run generate

# Test in VS Code
# Press F5 to launch Extension Development Host
```

### Vue Landing Page

```bash
# Start dev server (http://localhost:4173)
npm run vue:dev

# Build for production
npm run vue:build
```

### Testing

```bash
npm test                    # Unit tests
npm run test:e2e           # E2E tests (Playwright)
npm run lint               # Lint check
```

## Common Commands

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run build`    | Compile TypeScript               |
| `npm run generate` | Generate all 50 themes           |
| `npm run prepare`  | Build + generate (full pipeline) |
| `npm run vue:dev`  | Start Vue dev server             |
| `npm test`         | Run unit tests                   |
| `npm run lint`     | Run Biome linter                 |

## Project Structure

```
src/
├── seeds/           # Theme seed definitions (JSON)
├── lib/             # Generator logic (TypeScript)
└── vue-app/         # Vue landing page
themes/              # Generated theme JSON (git-ignored)
build/               # Build artifacts (git-ignored)
```

## Adding a New Theme Seed

1. Create `src/seeds/YourSeed.json`:
```json
{
  "id": "YourSeed",
  "displayName": "Your Seed",
  "baseHue": 270,
  "baseChroma": 0.12,
  "bgLightness": 0.15,
  "fgLightness": 0.88,
  "accentChroma": 0.15,
  "intentMode": true
}
```

2. Run `npm run prepare` — generates 5 harmony variants automatically

3. Test with F5 in VS Code

## Troubleshooting

**"Cannot find module"** → Run `npm install`

**"No themes found"** → Run `npm run generate`

**Lint errors** → Run `npm run lint:fix`

## More Info

- [CONTRIBUTING.md](CONTRIBUTING.md) — Full contribution guidelines
- [docs/vue-development.md](docs/vue-development.md) — Vue color usage rules
