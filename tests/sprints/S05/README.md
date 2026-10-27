# S05 acceptance map

Passing: 19 dedicated S05 unit/component checks; combined 117 checks in 22 files, 26 production Chromium cases, ten live anonymous API checks, all five hosted rollback suites, lint and build/typecheck. Local unit verification used `--testTimeout=15000`; see the sprint record for the observed cold-start limitation.

Unit/component: lyric preservation, explicit stanza/line breaks, CRLF, repeated chorus, long/non-Latin/literal words, invalid input, font failure, manual slide corrections, explicit master revisions, response validation, conflict retention, atomic copy arguments, stable item order, calendar dates and frozen snapshot validation.

Browser: typed/pasted review, explicit master save, service creation, reviewed independent copy, shared-renderer service review, editor changes independent of the master, conflict retention and visible dependency descriptions. API fixtures prove UI behavior only.

Hosted rollback SQL separately proves current database authorization, strict field checks, master/copy independence, service/digest revisions, deterministic repeated-deck sections, foreign workspace rejection, raw-write denial, owner-only shared deletion and restrictive dependency lifecycle. Anonymous HTTP probes cover all song/service table and RPC surfaces. Docker/pgTAP was not used; the existing hosted rollback assertion workflow is retained.

See [verification and current limitations](../../../docs/sprints/S05.md). Offline readiness, real media, live presentation and physical equipment remain later milestones.
