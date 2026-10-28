# S06 acceptance map

Run: npm run test:unit -- tests/sprints/S06 --testTimeout=15000 --pool=vmThreads

56 checks in 15 files passed 2026-10-28. Full S01–S06 regression: 173 checks in 37 files. Browser: all 29 cases passed, with three S06 flows in tests/e2e/S06_media.spec.ts. Live anonymous API: 13 checks, including three media cases. Hosted assertions: supabase/tests/S06_media.connector.sql (outer rollback).

| Coverage | Files |
| --- | --- |
| Descriptor/profile-scoped persistence, relink, URL release and purge | media.test.ts, media-service.test.ts |
| Bounded decode, MIME/container mismatch, corrupt files, video cleanup | client-decode.test.ts, image-policy.test.ts, server-decode.test.ts |
| Authenticated bounded proxy, retry/finalize/abort and single writer | upload-handler.test.ts, media-backend.test.ts, upstream-deadline.test.ts |
| Library recovery, local/cloud distinction, owner operations | media-library.test.tsx |
| Media insertion/fit/resize/undo and numeric input synchronization | editor-media.test.ts, editor-number-sync.test.tsx |
| Shared resolution, serialized hashing and paused video thumbnails | media-renderer.test.tsx, media-memory.test.ts |
| Exact snapshot descriptors and destination-bound copies | snapshot-media.test.ts, deck-media-copy.test.ts |

Hosted SQL verifies service-only claims, direct-write denial, exact reservations and counters, expired/aborted write refusal, safe release, membership/owner/dependency enforcement, reviewed presentation copies, derived references and operation/capacity limits. Global/workspace races use separate SQL connections; see docs/evidence/S06-concurrency.md. Metadata-only SQL fixtures are distinct from real object-byte checks.

Real native playback/persistence and twelve real upload/copy/denial/cleanup checks are documented in docs/sprints/S06.md with JSON evidence. Mocked tests are not used as proof of real Google, projector audio or disconnected app readiness.
