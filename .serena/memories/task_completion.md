# Task Completion Checklist

When completing a task:
1. Run `npm run build` to verify TypeScript compiles (strict mode)
2. Run `npm run lint` to check Biome formatting/linting
3. Run `npm run test:unit` to verify unit tests pass
4. For wallpaper changes: `npm run wallpapers:generate:svg-only` for quick SVG check
5. For Vue changes: `npm run pages:dev` to verify dev server works
6. Do NOT commit generated artifacts (themes/, build/, public/wallpapers/)
7. Keep changes small and well-scoped per CONTRIBUTING.md
