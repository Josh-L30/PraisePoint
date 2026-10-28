# S10 acceptance map

| Check | Evidence |
| --- | --- |
| Native background pause/resume/failed playback | background-motion.test.tsx, background-state.test.ts |
| Stale auth completions / cross-tab device transitions / failed logout recovery | auth-transitions.test.ts; native update-transition-checks.ts |
| Editor/preview entry and full-session update protection | editor-update.test.tsx; native update-transition-checks.ts |
| Pending/successful/failed media keep diagnostics off audience | audience-media.test.tsx |
| Accepted activation timeout / close-all recovery | update-timeout.test.ts; S08_update-safety.spec.ts recovery variant |
| Build identity includes HTML/config/public env, excludes private env | build-fingerprint.test.ts |
| Static-host CSP/capability/cache policy | hosting.test.ts, actual S10 service rehearsal |
| Durable update guard / malformed entry / quota refusal | update-fence.test.ts, S08_update-safety.spec.ts stock and delayed-cleanup variants |
| Whole service / both lyric methods / five categories / native media / offline restart | S10_service-rehearsal.spec.ts |
| Test-only worst-case states / reflow / opacity / motion / measured contrast / touch targets | S10_ui-resilience.spec.ts |

Final counts and outstanding physical/provider/hosting gates are in docs/sprints/S10.md and docs/release-checklist.md. No physical equipment or publication success is claimed by browser emulation.

Final regression: 251/251 unit/component checks in 63 files (21 S10 checks across nine files), 45/45 production Chromium cases together, lint/build/TypeScript passed. Native normal update, delayed cleanup and explicit full-restart recovery are separate cases. The independent-review fix record is docs/reviews/2026-10-29-software-review.md.
