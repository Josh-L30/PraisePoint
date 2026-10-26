# Overlapping save evidence

Run the setup once, the first query in the hosted SQL editor, and the second on a separate connector connection while the first sleeps. The connector serializes its own requests, so two connector calls alone do not prove overlap. Then inspect the saved row and run the paired cleanup.

Verified 2026-10-27: backend 45235 saved revision 2 while backend 45239 overlapped for 7.031816 seconds and received CONFLICT. Only the first writer’s title persisted. [Timings and cleanup](../../docs/evidence/S03-concurrency-results.json), [SQL editor result](../../docs/evidence/S03-save-race.png).

The SQL buffer was cleared, populated, copied back and compared ignoring Monaco’s automatic indentation; exactly one DO, save call and COMMIT were verified. The result table is temporary and connection-local, containing only synthetic test timings; its RLS warning does not concern an exposed application table. No application protection was disabled. The fixture account was explicitly marked and cleanup verified: one real account/workspace retained, zero decks, zero document-budget bytes. No real slides were created or removed.
