# Church presentation workspace

Website under development for volunteers to prepare attractive slides and present from a laptop to a projector, online or offline. “Gather” is a working name.

**Current state:** Native implementation continues on feat/church-workspace. The React/Vite/Tailwind glass interface, Google sign-in, private/shared workspaces, team invitations and five-template slide editor are implemented and verified. Google is the only enabled provider. The website is not deployed; freeform editing, songs/services, real media, presenter windows and offline preparation remain later work.

## Start here

- [Written design and review checkpoint](docs/superpowers/specs/2026-10-26-church-presentations-design.md)
- [Product scope, permissions, and acceptance](PRODUCT.md)
- [Approved visual direction](DESIGN.md)
- [Proposed architecture and collaboration](PROJECT.md)
- [Sprint ledger](docs/sprint-plan.md)
- [Detailed implementation plan](docs/superpowers/plans/2026-10-26-church-presentations.md)
- [Verification strategy](docs/testing.md)
- [Research and sources](docs/discovery/2026-10-26-research.md)
- [Visual exploration and limitations](docs/discovery/2026-10-26-visual-preview.md)

## Preview and setup

Use Vite to open this React/TypeScript project. VSCode's Live Server / Go Live serves raw source files and cannot compile the app, so it can show a blank screen.

1. Open the project folder in VSCode.
2. Open Terminal → New Terminal and run `npm run dev`.
3. Open http://127.0.0.1:5173 in Chrome and keep the terminal running. Use this exact address for the configured Google login callbacks.

Disposable HTML mockups are local files under the ignored .superpowers/brainstorm/ folder. They are design evidence, not application source. The companion's active state/server-info contains its local access URL; never publish session keys. Figtree's OFL license is stored with the preview.

Dependencies are pinned in package.json/package-lock.json; Node 24.x is required. Run npm run dev for http://127.0.0.1:5173. If port 5173 is already in use by this app, open the address instead of starting a second server. Verified checks: npm test (13 passed), browser checks (6 passed), npm run lint, npm run build including typecheck, and live anonymous API checks (2 passed). Hosted SQL assertions also passed with fixtures rolled back. Tests use one worker to limit development memory usage. The production build currently reports a large main chunk; feature splitting remains before release. See [setup and current connection state](docs/setup.md).

S01–S03 are verified: Google/private and shared workspaces, invitations/team management, five editable slide templates, cloud save/reopen/copy/delete, safe revision conflicts, draft guards and fixed-layout preview. Open Presentations → New presentation to begin. Current combined checks: 80 unit/component, 21 production browser and eight live anonymous API tests, plus hosted authorization/capacity and overlapping concurrency checks. See [S03 evidence and limitations](docs/sprints/S03.md). Next: freeform positioning/layers/undo in S04. Videos, service plans, two-window presentation and offline preparation are still being built. Do not recreate the saved Google credential or Supabase project.
