# S02 acceptance map

Passing evidence: 30 S02 unit/component tests, six S02 production browser tests, three S02 live anonymous API tests, full hosted rollback assertions, and two real overlapping database races. S01 regressions also pass (13 unit, six browser, two API). See [sprint record](../../../docs/sprints/S02.md).

Database assertions cover create/role restrictions, outsider isolation, wrong email, exact seven-day expiry, revocation/replay, ownership/removal/leave, token hashing, safe display projection, and rate limits. The separate concurrency evidence proves exactly one successful acceptance and ownership transfer. UI/service tests cover validation, switching, explicit acceptance, sign-in handoff, owner controls and failures; mocks do not prove authorization.

Fixture IDs/emails are synthetic and scoped; rollback tests do not persist fixtures. The separate concurrency setup has a paired cleanup script, and cleanup was verified. Never reset existing church/account data for tests.
