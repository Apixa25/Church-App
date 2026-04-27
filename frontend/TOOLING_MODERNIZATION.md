# Frontend Tooling Modernization

## Why This Exists

The frontend still uses Create React App through `react-scripts`. The app builds and tests successfully, but many remaining dependency audit advisories are transitive dependencies owned by CRA's older build/test stack. Running `npm audit fix --force` is not safe here because npm proposes breaking tooling changes instead of a controlled migration.

## Current Safe Baseline

- `npm run build` completes successfully.
- `npm run test:ci` runs the frontend test suite in CI mode.
- `npm run audit:prod` shows production dependency advisories without forcing breaking changes.
- Direct dependencies have been updated where they were compatible with the current app.

## Recommended Upgrade Path

1. Create a short-lived branch dedicated only to tooling.
2. Add Vite alongside the current app entry points.
3. Port CRA environment variable usage from `REACT_APP_*` to Vite's `VITE_*` naming.
4. Move Jest smoke tests to Vitest or configure Jest separately from `react-scripts`.
5. Verify browser support, service worker behavior, Capacitor builds, and production asset paths.
6. Remove `react-scripts` only after the Vite build and CI tests match current behavior.

## Guardrails

- Do not run `npm audit fix --force` on the main app branch.
- Keep dependency changes small and verify with `npm run build` and `npm run test:ci`.
- Preserve Capacitor Android/iOS behavior when changing build output paths.
- Treat service worker and PWA behavior as production-critical.
