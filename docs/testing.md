# Verification strategy

S01 evidence: npm test passed 13 unit/component tests; Playwright passed 6 production-build browser checks; live anonymous API checks passed 2 tests; typecheck/lint/build passed. Hosted SQL assertions passed with synthetic fixtures rolled back. Real Google success, cancellation, reload and logout were verified separately. Browser expiry/mobile workspace cases use controlled server fixtures and prove UI behavior only. Physical devices and later-sprint acceptance remain unverified. See docs/sprints/S01.md. [Preview checks](discovery/2026-10-26-visual-preview.md) remain separate evidence. Use one test worker on this development machine; build/preview separately if cold startup exceeds the browser runner timeout.

S06 evidence: 173 unit/component checks in 37 files (56 S06 checks), all 29 production Chromium cases, 13 live anonymous API checks and all six hosted rollback suites passed. Lint/build/TypeScript passed. Twelve actual media integration cases passed against deployed upload function v2, with all six authorized synthetic files removed and zero usage/reservations restored. Bounded IndexedDB restart/decode and true overlapping global/workspace quota races are recorded separately. [S06 evidence and limits](sprints/S06.md). Tests used --testTimeout=15000 --pool=vmThreads; earlier timeout runs are not counted as passing.

S07 evidence: 187 unit/component checks in 43 files, including fourteen S07 checks, and all 33 production Chromium cases passed with lint/build/TypeScript. Actual two-window workflows cover manual navigation/thumbnails, black-until-send/reopen, stale/foreign/changed-message rejection, no audience cloud requests, real video instance/time continuity, standalone audio flags, blackout/restore/restart, popup/fullscreen recovery and exit/cross-tab sign-out. Physical projector and audible speaker proof remain S10. [S07 record](sprints/S07.md). The existing thirteen live API checks and six hosted rollback suites are unchanged; this slice adds no backend migration.

## Planned layers

S05 evidence: 117 unit/component checks (explicit local `--testTimeout=15000`), 26 production Chromium cases, ten live anonymous API tests and all five hosted rollback suites passed. Song/manual/paste review, literal word preservation, service copy independence, ordering, snapshots/digest/sections, capacity, dependency deletion and foreign-workspace rejection are covered. Real signed-in empty libraries loaded separately from browser fixtures. Lint/build/typecheck passed. See [S05 record and the cold-run timing limitation](sprints/S05.md).

S04 evidence: combined suites passed 98 unit/component, 24 Chromium production browser and eight live anonymous API checks, plus lint/typecheck/build. Hosted S01–S04 rollback assertions passed with the current label validator and retained one real account/workspace, no test content. Real pointer capture/scaling, resizing, gesture undo, keyboard alternatives, persistent labels/layers/order, cancellation and overflow were checked in the browser. Image placement remains S06 and physical rehearsal remains S10. See [S04 record](sprints/S04.md).

S03 evidence: combined S01–S03 checks passed 80 unit/component, 21 production Chromium and eight live anonymous API tests, plus lint/typecheck/build. Hosted rollback assertions cover document validation, every category, permissions/revocation, revisions, explicit copies and capacity. A true two-connection race produced one successful save and one CONFLICT, followed by verified cleanup. Browser layout checks match logical positions/line breaks at 1080p and letterboxed 1024×768 and reject missing Figtree. Draft failure/recovery/sign-out/navigation cases pass. UI mocks, live anonymous API, hosted authorization and real logged-in browsing remain distinct evidence. See [S03 record](sprints/S03.md).

S02 evidence: combined S01/S02 checks passed 43 unit/component tests, 12 Chromium production browser tests and five live anonymous API tests, plus lint/typecheck/build. Full hosted rollback assertions and true overlapping invitation/ownership races passed with test fixtures cleaned up. Team UI browser tests use controlled API fixtures; the real logged-in profile separately loaded the membership-backed personal setup page. No two-account Google invitation rehearsal or physical phone test is claimed. See [S02 record](sprints/S02.md).

Unit checks: document validation, lyric breaking/content preservation, revisions, manifests/readiness. Component/browser checks: navigation/input states, freeform keyboard movement, consistent rendering, presenter/blackout/audio/popup recovery. Database/Storage integration: tenant isolation, roles, invitation expiry/replay, cross-workspace references, atomic quotas.

Offline browser checks must use the production build/service worker, not Vite dev: prepare/disconnect/restart/play; missing/corrupt files; quota denial; update deferral. Real laptop/projector rehearsal covers extended display/fullscreen, room-distance readability, smooth video, single audio source, and internet loss. Viewport emulation is not real-device evidence.

Check keyboard/focus, glass contrast, reduced motion/transparency, unsupported-blur fallback, and responsive reflow. Vitest/Testing Library/Playwright are proposed, subject to compatibility checks and version pinning. Add commands only after verified runner discovery.

## Risk map

| Condition | Expected result | Owner |
| --- | --- | --- |
| Foreign resource/asset ID | Server/database denies access | S02 |
| Concurrent invitation/save | No duplicate grant or silent overwrite | S02/S03 |
| Long/unbroken/non-Latin lyrics | Content preserved; explicit overflow warning | S04/S05 |
| Different stage sizes | Matching line breaks/positions/background | S03/S07 |
| Large/bad/unsupported video | Useful error; no accidental cloud upload | S06 |
| Concurrent cloud uploads | Global/workspace caps enforced atomically | S06 |
| Repeated lyrics/song changes | Same-song background continues; new song changes it | S07 |
| Blackout/audio/popup closure | Safe output, no doubled audio, explicit resume | S07 |
| Interrupted prepare/quota failure | No false ready; previous complete snapshot retained | S08 |
| Disconnected restart | Prepared service opens without Google round trip | S08 |
| Update mid-service | No takeover or renderer/package mismatch | S08 |
| Second laptop/missing media | Safe import; relink required before ready | S09 |
| Provider pause/capacity | Honest degraded state; prepared offline playback works | S08/S10 |
| Sign-out/account switch | Previous profile's prepared content removed/inaccessible | S01/S08 |

At sprint start update its acceptance map; record actual commands/counts/outcomes, build/browser/environment, and manual evidence in the sprint record. Preserve regression tests. Use disposable fixtures, never reset church data for tests.

Release requires meaningful evidence for PRODUCT A01–A12, physical rehearsal, no unresolved access/data/readiness defects, backup/relink exercise, free-plan review, user acceptance, and separately authorized deployment with deployed verification. Mocks cannot prove Google OAuth, actual video, a physical projector, or disconnected restart.

S08 evidence: 215 unit/component checks in fifty files (28 S08 checks), all 38 distinct production Chromium cases, lint/build/TypeScript passed. The combined browser run passed 37/38; a native dropdown left open after successful keyboard navigation caused teardown failure. Trace inspection led to explicit Escape in test cleanup, passing two focused repetitions. All five S08 cases passed together: persistent browser close/relaunch disconnected with expired cloud session and zero cloud requests; actual two-build update deferral/activation; quota/partial refresh retaining a complete copy; damaged video/font blocking; second-profile purge. [S08 evidence and limits](sprints/S08.md). Physical hardware and a published host remain unverified.
