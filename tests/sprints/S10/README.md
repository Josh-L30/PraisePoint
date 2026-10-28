# S10 acceptance map

| Check | Evidence |
| --- | --- |
| Native background pause/resume/failed playback | background-video.test.tsx, background-pause.test.ts |
| Build identity includes HTML/config/public env, excludes private env | build-fingerprint.test.ts |
| Static-host CSP/capability/cache policy | hosting-policy.test.ts, actual S10 service rehearsal |
| Durable update guard / malformed entry / quota refusal | update-fence.test.ts, S08_update-safety.spec.ts stock and delayed-cleanup variants |
| Whole service / both lyric methods / five categories / native media / offline restart | S10_service-rehearsal.spec.ts |
| Test-only worst-case states / reflow / opacity / motion / measured contrast / touch targets | S10_ui-resilience.spec.ts |

Final counts and outstanding physical/provider/hosting gates are in docs/sprints/S10.md and docs/release-checklist.md. No physical equipment or publication success is claimed by browser emulation.
