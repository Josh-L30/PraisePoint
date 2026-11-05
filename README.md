# PraisePoint

Church presentation workspace for volunteers to prepare readable slides and present from a laptop to a projector, online or offline.

**Live website:** [PraisePoint](https://gather-ccf-presentations.web.app). **Private source repository:** [Josh-L30/PraisePoint](https://github.com/Josh-L30/PraisePoint).

Latest UI release: login opens directly without an entrance video, and the original sidebar toggle has a larger, better-spaced hover arrow. See [S35 release verification](docs/evidence/S35-direct-login-sidebar-release.md). Earlier alternatives are retained as [design and QA history](docs/evidence/README.md).

Repository workflow: the owner requests committing and pushing completed, verified project changes to the existing GitHub branch as part of future work. Keep environment secrets, CLI credentials, dependencies, build output, browser profiles and temporary preview files excluded. Website deployment remains a separate action requiring the owner's request.

The S11 release includes CCF branding, compact glass navigation, centered confirmation dialogs, direct canvas text editing, song-break imports, fullscreen preview and resumable owner workspace deletion. Verification: 281 unit tests and 52 browser cases across runs, plus public offline restart and ten isolated cold starts. See the [current release and remaining limits](docs/sprints/S11.md).

**Current state:** Native implementation continues on feat/church-workspace. The React/Vite/Tailwind glass interface, Google sign-in, private/shared workspaces, team invitations, template/freeform text editor, song library, service plans, media library and operator/projector presenter are implemented and verified. Google is the only enabled provider. The frontend is published at [gather-ccf-presentations.web.app](https://gather-ccf-presentations.web.app) on Firebase Spark; the authenticated media-upload backend remains in Supabase. Complete offline preparation and disconnected restart are implemented; portable metadata backups and exact-file recovery are implemented; physical rehearsal and release acceptance remain.

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

Code formatting uses pinned Prettier with two-space indentation and a 100-column wrapping target. Run `npm run format` to format application code, styles, tests, scripts, local Edge Function source and root configuration; run `npm run format:check` to verify it. `.prettierrc.json` also supplies the settings to a compatible VSCode formatter. Generated output, secrets, historical evidence, dependencies and SQL migrations are excluded from the format commands.

Use Vite to open this React/TypeScript project. VSCode's Live Server / Go Live serves raw source files and cannot compile the app, so it can show a blank screen.

1. Open the project folder in VSCode.
2. Open Terminal → New Terminal and run `npm run dev`.
3. Open http://127.0.0.1:5173 in Chrome and keep the terminal running. Use this exact address for the configured Google login callbacks.

For a fresh checkout, install Node 24, run `npm ci`, copy `.env.example` to `.env.local`, and supply the existing project's public Supabase URL and publishable key before starting Vite. Follow [setup](docs/setup.md); do not recreate the Supabase project or Google credential.

Git preserves source, migrations, tests, documentation and commit history. Local environment files, dependencies, build output, browser profiles and CLI credentials are ignored. Church database records, cloud images and original videos need their separate [backup workflow](docs/backup-restore.md).

Disposable HTML mockups are local files under the ignored .superpowers/brainstorm/ folder. They are design evidence, not application source. The companion's active state/server-info contains its local access URL; never publish session keys. Figtree's OFL license is stored with the preview.

Dependencies are pinned in package.json/package-lock.json; Node 24.x is required. Run npm run dev for http://127.0.0.1:5173. If port 5173 is already in use by this app, open the address instead of starting a second server. Pre-Firebase software-review checks: 251 unit/component tests (local `--testTimeout=15000 --pool=vmThreads`), 45 production Chromium checks, 15 live anonymous API checks, lint and build including TypeScript. All seven hosted SQL suites passed with fixtures rolled back. Tests use one worker to limit memory usage. The presenter/offline entry is split from online authentication; physical performance remains unverified after the user skipped rehearsal. See [setup and connection state](docs/setup.md).

S01–S03 established Google/private and shared workspaces, invitations/team management, five editable slide templates, cloud save/reopen/copy/delete, safe revision conflicts, draft guards and fixed-layout preview. Open Presentations → New presentation to begin. See [S03 evidence and limitations](docs/sprints/S03.md). Do not recreate the saved Google credential or Supabase project.

S05 adds Song library → New song for typed/pasted lyrics and break review, then Service plans → New service for ordering and independent song copies. Existing service copies keep their words when a song master changes. [S05 verification and limitations](docs/sprints/S05.md).

S04 adds freeform text dragging/resizing, position fields, keyboard alternatives, alignment/layers, thumbnail ordering and gesture undo/redo. The wide desktop inspector scrolls independently. Current combined checks: 98 unit/component, 24 browser, eight live API and all four hosted SQL suites. See [S04 evidence and limits](docs/sprints/S04.md). Image insertion is now connected through S06.

S06 adds Media library imports, private cloud stills, persistent local videos, file verification/reselect, independent copies, safe storage limits and real image/background selection in the editor and service review. [S06 evidence and limitations](docs/sprints/S06.md). Local videos are limited to 128 MiB; retain originals. S07 now connects the operator/projector presenter.

S07 adds Service plans → Review service slides → Present service. Open projector, move its black output window to the projector, then Send current slide. Manual controls, current/next previews, thumbnails, blackout and audience-only standalone video transport are available. Reopened output requires another explicit send. [S07 operation and hardware limitations](docs/sprints/S07.md). S08 connects complete offline preparation.

S08 adds Review service slides → Prepare for offline, then Prepared services → Verify prepared copy → Open prepared service. It caches the app/font, immutable slides and every verified file on the same browser profile and origin. Complete copies survive an offline browser restart and expired cloud session. Failed refreshes preserve the previous copy; known edits request review and app updates defer during presentation. Use the production build/preview for this flow; development mode does not claim offline readiness. [S08 operation, evidence and limits](docs/sprints/S08.md).

S09 adds metadata downloads from service review/prepared copies and Service plans → Import service metadata. Import makes independent records in the chosen workspace; transfer originals separately and reselect exact files in Media library before preparing. [Backup and restore instructions](docs/backup-restore.md), [S09 evidence](docs/sprints/S09.md).

S10 adds explicit Pause/Resume backgrounds, measured glass-interface refinements, durable idle-only app update handoff and a representative production-header service rehearsal. [Operations](docs/operations.md) and the [release/rehearsal checklist](docs/release-checklist.md) explain account ownership, backups and remaining physical/provider/hosting acceptance. The requester maintains accounts and original-media backups for now. The Firebase frontend was published with explicit user approval on 2026-10-29.

For the later church-equipment check, follow the [step-by-step rehearsal guide](docs/rehearsal-guide.md) and fill in its result sheet.

Firebase Hosting Spark setup: [deployment instructions](docs/firebase-deployment.md). The site is live on Spark. Real Google login/reload/sign-out, public headers/routing and a focused disconnected image/video restart passed; startup/update limits are recorded in S10.
