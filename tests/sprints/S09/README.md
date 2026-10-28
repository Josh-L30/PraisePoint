# S09 acceptance map

Run: npm run test:unit -- tests/sprints/S09 --testTimeout=15000 --pool=vmThreads

Fifteen checks across four files; full unit regression 230 checks across 54 files.

| Requirement | Evidence |
| --- | --- |
| Strict bounded envelope, future/malformed/duplicate/URL/credential refusal, literal hostile content, hash/size inconsistency, metadata-only round trip | transfer.test.ts |
| Chosen destination, captured token, account changes and complete fresh-ID response | import-service.test.ts |
| Actual exact-file hash requirement, geometry confirmation and unconfirmed-write refusal | relink.test.ts |
| File review before explicit import, escaped words and independent service link | transfer-ui.test.tsx |

S09_import.connector.sql runs actual hosted rollback-only permission/atomicity tests. S09_import.test.ts denies anonymous import/geometry over the live HTTP API. S09_laptop-transfer.spec.ts uses two separate persistent Chromium profiles, native JSON download/file inputs, missing/wrong/correct original recovery, preparation, full disconnected browser restart and projector image/video. API responses in browser tests are fixtures; see docs/sprints/S09.md for live versus simulated evidence and remaining physical checks.
