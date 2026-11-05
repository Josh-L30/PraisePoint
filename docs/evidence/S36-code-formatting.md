# Readable code formatting

2026-11-05. User requested readable source layout in VSCode while preserving website behavior.

## Scope

Expanded compressed TypeScript/JavaScript, TSX, CSS, HTML and root configuration using pinned development-only Prettier 3.9.10. Added two-space indentation, a 100-column wrapping target, shared configuration, ignore rules and `npm run format` / `npm run format:check`. Existing SQL migrations, media, secrets and generated output were excluded. No application feature, database, authentication or hosting-policy change was intended. No website or Edge Function deployment was performed.

## Behavior preservation

An ignored local snapshot retained all 261 original target files before formatting; 257 were reformatted. TypeScript-transpiled executable syntax trees were compared for 249 JS/TS/TSX files: zero differences after normalizing equivalent property-key spelling, redundant parentheses and adjacent literal React children. One existing eight-space JSX text node was made explicit to retain its original value rather than accepting the formatter's shortened text node.

Prettier's correctness/idempotence check passes on the settled output. Initial formatting needed a second pass for 18 files; no code logic was changed to accommodate it. HTML formatting uses normal CSS whitespace sensitivity so `<head>`/`<body>` markers stay intact for the existing PWA tooling. The production build, including service-worker precaching, passes. Lint passes with the existing Modal Fast Refresh warning only. `format:check` and `git diff --check` pass.

## Tests

- Focused component checks: 15 tests passed, including editor draft guards, auth shell, modal and file-input behavior. Original unformatted editor baseline: all 8 tests passed as well. An earlier editor timeout under concurrent load did not reproduce in isolation.
- Browser regression: 20 cases passed directly using installed Chrome, covering navigation, workspaces, songs, text movement/editing, slide creation/strip, themes, responsive screens and login. The remaining responsive case passed with test-only local image fixtures and eager image loading; its original wait included offscreen lazy external previews and timed out. No production code or committed test assertions were changed for this environment workaround.
- Browser checks used viewport emulation, not physical devices. The original bundled Playwright browser was missing, so an ignored local config selected installed Chrome.
- Full unit suite: all 293 tests in 78 files passed (174.98s), using `npm run test:unit -- --pool=forks --maxWorkers=2 --reporter=verbose --testTimeout=15000 --hookTimeout=15000`. Thread-based full runs stalled; process-based workers completed without changing the committed test configuration.

Regenerated historical screenshots/reports are restored before committing; only this verification record is added. Source equivalence snapshot, baseline copy and temporary runner configuration remain under ignored `.superpowers/`.
