# Church presentation workspace

Website under development for volunteers to prepare attractive slides and present from a laptop to a projector, online or offline. “Gather” is a working name.

**Current state:** Native implementation continues on feat/church-workspace. The React/Vite/Tailwind glass interface, Google sign-in, private/shared workspaces, team invitations, template/freeform text editor, song library, service plans and media library are implemented and verified. Google is the only enabled provider. The frontend is not published; the authenticated media-upload backend is deployed. Presenter windows and complete offline preparation remain later work.

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

Dependencies are pinned in package.json/package-lock.json; Node 24.x is required. Run npm run dev for http://127.0.0.1:5173. If port 5173 is already in use by this app, open the address instead of starting a second server. Current verified checks: 173 unit/component tests (local `--testTimeout=15000 --pool=vmThreads`), 29 production Chromium checks, 13 live anonymous API checks, lint and build including TypeScript. All six hosted SQL suites passed with fixtures rolled back. Tests use one worker to limit memory usage. The production build still reports a large initial chunk; broader performance work remains before release. See [setup and connection state](docs/setup.md).

S01–S03 established Google/private and shared workspaces, invitations/team management, five editable slide templates, cloud save/reopen/copy/delete, safe revision conflicts, draft guards and fixed-layout preview. Open Presentations → New presentation to begin. See [S03 evidence and limitations](docs/sprints/S03.md). Do not recreate the saved Google credential or Supabase project.

S05 adds Song library → New song for typed/pasted lyrics and break review, then Service plans → New service for ordering and independent song copies. Existing service copies keep their words when a song master changes. [S05 verification and limitations](docs/sprints/S05.md).

S04 adds freeform text dragging/resizing, position fields, keyboard alternatives, alignment/layers, thumbnail ordering and gesture undo/redo. The wide desktop inspector scrolls independently. Current combined checks: 98 unit/component, 24 browser, eight live API and all four hosted SQL suites. See [S04 evidence and limits](docs/sprints/S04.md). Image insertion is now connected through S06.

S06 adds Media library imports, private cloud stills, persistent local videos, file verification/reselect, independent copies, safe storage limits and real image/background selection in the editor and service review. [S06 evidence and limitations](docs/sprints/S06.md). Local videos are limited to 128 MiB; retain originals. Next: the operator/projector presenter in S07.
