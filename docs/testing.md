# Verification strategy

S01 evidence: npm test passed 13 unit/component tests; Playwright passed 6 production-build browser checks; live anonymous API checks passed 2 tests; typecheck/lint/build passed. Hosted SQL assertions passed with synthetic fixtures rolled back. Real Google success, cancellation, reload and logout were verified separately. Browser expiry/mobile workspace cases use controlled server fixtures and prove UI behavior only. Physical devices and later-sprint acceptance remain unverified. See docs/sprints/S01.md. [Preview checks](discovery/2026-10-26-visual-preview.md) remain separate evidence. Use one test worker on this development machine; build/preview separately if cold startup exceeds the browser runner timeout.

## Planned layers

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
