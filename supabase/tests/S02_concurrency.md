# Hosted concurrency test

Run setup once, then the two acceptance calls concurrently through separate connected SQL calls. Each request records clock_timestamp before calling the RPC and sleeps one second after it before commit. Require different pg_backend_pid values and overlapping recorded request intervals; sequential requests are not concurrency evidence. Exactly one acceptance succeeds, and the other must receive insufficient_privilege (used invitation), rather than a duplicate membership or unhandled unique violation.

In this environment the connector serializes tool calls even when dispatched with Promise.all. Actual verification used the SQL editor for the first transaction, holding its lock for 30 seconds after the RPC, and the connector for the second. The browser query returned its metrics after commit using test-only session settings. Compare numeric epoch timestamps and backend PIDs. See docs/evidence/S02-concurrency-results.json and the two screenshots. Serial connector-only attempts are not counted as passing concurrency evidence.

When replacing Monaco editor content, first select all and Backspace; verify it is empty, then enter the next query. Selecting all and copying the authored test code verified exactly one DO block, RPC call and COMMIT before the successful ownership rerun. Setting the editor value alone had retained the preceding query. No real data was involved, and the final clean rerun is the recorded evidence.

Next run two owner-transfer requests concurrently from the original owner, targeting the two current members. Exactly one succeeds, the other is forbidden after its row lock is acquired. Verify one owner membership matching workspaces.owner_id, and three total members.

Always run S02_concurrency.cleanup.sql in a finally block, including on failed assertions. Cleanup refuses any unmarked identity and only removes the three fixed test IDs carrying test_fixture=S02_concurrency. These temporary synthetic accounts cannot sign in with Google (.invalid email domains); no emails or real access tokens are issued. Existing real profiles are preserved.

The setup returns only a workspace UUID. The two known synthetic tokens are used solely by direct database calls against this test workspace. They are not production invite links or credentials.
