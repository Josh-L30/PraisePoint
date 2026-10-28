# S07 acceptance map

Run: npm run test:unit -- tests/sprints/S07 --testTimeout=15000 --pool=vmThreads

Fourteen checks in six files passed 2026-10-28. Full regression: 187 unit/component checks in 43 files and all 33 production Chromium cases. Lint/build/TypeScript passed.

| Requirement | Evidence |
| --- | --- |
| Manual bounded slides, repeated jumps, blackout/restore and section identity | presenter-state.test.ts |
| Explicit send, audience targeting, immutable snapshots and stale/foreign refusal | channel.test.ts |
| Exact local descriptors/current-profile gate; no cloud fallback | local-media.test.ts |
| Audience-only transport, cleanup, rejected play, repeated seek/volume behavior | video-layer.test.tsx |
| Missing font reported for black-output recovery | font-status.test.tsx |
| Arrow keys after clicking buttons; editable descendants ignored | keyboard.test.ts |

Production browser workflows: tests/e2e/S07_projector.spec.ts. These open two actual Chromium windows, verify black initial/reopened output, manual navigation/thumbnails, no audience shell or Supabase requests, stale/misdirected/changed payload refusal, popup recovery, real MP4 clocks and video identity, standalone audio flags, blackout/restore/restart, exit and cross-tab sign-out, plus controlled fullscreen rejection. API responses are fixtures; the media decoder and local IndexedDB bytes are real. Physical audio/fullscreen/projector proof remains pending. See docs/sprints/S07.md.
