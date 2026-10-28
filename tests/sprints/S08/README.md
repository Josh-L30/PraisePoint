# S08 acceptance map

Run: npm run test:unit -- tests/sprints/S08 --testTimeout=15000 --pool=vmThreads

28 unit checks across seven files; full regression has 215 checks across fifty files.

| Requirement | Evidence |
| --- | --- |
| Safe navigation fallback, strict app manifest, exclusive update ownership proof | cache-policy.test.ts |
| Atomic replacement/quota rollback, reference counts, profile lock and cleanup failures | prepared-store.test.ts |
| Missing/corrupt media, app/font/decode failures, unknown formats, stale version opt-in | readiness.test.ts |
| Partial preparation, final source revision check, prior complete copy retention | prepare-transaction.test.ts |
| Explicit cloud recheck, known newer revision, unavailable connection, edits during check | cloud-revision.test.ts |
| Shared verified read with per-consumer URL cleanup | prepared-resolver.test.ts |
| IndexedDB v2 to v3 preserves device session and original media bytes | database-upgrade.test.ts |

Production browser cases: S08_offline-restart.spec.ts closes and relaunches the full persistent browser disconnected with expired cloud session and real PNG/MP4 decoding. S08_update-safety.spec.ts builds two actual versions and checks active/unknown-window deferral, idle activation and retained compatible package. S08_recovery.spec.ts covers quota/partial refresh retention, prepared video/font damage and two-profile purge. API responses are controlled fixtures; cache, storage, decoders, media clocks and browser lifecycle are real. Physical equipment remains S10.
