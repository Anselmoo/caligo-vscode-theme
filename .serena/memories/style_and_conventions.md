# Code Style & Conventions

## TypeScript
- Strict mode enabled
- ES2020 target, NodeNext module resolution
- `.js` extensions in imports (NodeNext requirement)
- JSDoc comments for exported functions/interfaces
- No default exports; use named exports

## Formatting (Biome)
- Indent: 2 spaces
- Line width: 100
- Line endings: LF
- No trailing commas preference
- Public directory excluded from linting

## Naming
- camelCase for variables, functions, files
- PascalCase for types, interfaces, Vue components
- kebab-case for CSS classes, file names with dashes
- Seed names are PascalCase (AuroraNoir, DeepSable, etc.)

## Wallpaper Conventions
- Motif functions: `switch(params.harmonyMode)` with 5 branches
- Brick IDs: `{motif-prefix}-{mode-letter}-{element}` (e.g., `an-s-sky`)
- All coordinates as fractions 0..1, scale = Math.max(width, height)
- SVG filter opacity ≤ 0.25 for atmospheric layers
- Max 2 filter elements per scene
