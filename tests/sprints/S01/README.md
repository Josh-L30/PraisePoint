# S01 acceptance-to-test map

Current coverage: auth-service.test.ts and auth-shell.test.tsx pass 13 unit/component tests; Playwright passes 6 browser checks against the production build. Live anonymous API checks in tests/integration/S01_identity.test.ts pass 2 tests. Hosted SQL source is supabase/tests/S01_identity.connector.sql, executed with synthetic fixtures rolled back. CLI pgTAP is not passing evidence; hosted assertions are the documented substitute.

| Acceptance | Planned evidence | Gap |
| --- | --- | --- |
| A01 success/idempotence | Unit, hosted SQL, and real Google initialization/reload/repeat login pass | No S01 gap |
| A01 failure/recovery | Real Google Cancel/logout, provider/network and expired-server-identity UI checks pass | Expiry/network browser cases are fixtures |
| A02 isolation | Live SQL verifies two-user isolation; 2 anonymous API checks pass | Later church access tests in S02 |
| A10 navigation/accessibility | Collapse/drawer/solid-surface unit checks; phone reflow and drawer focus browser regression pass | Physical devices and full release accessibility remain S10 |
| Sign-out | Device marker cleanup and real logout/protected navigation verified | Real media cleanup remains S08 |
| Configuration safety | Elevated secrets absent from authored app/config; .env.local ignored | Full release-bundle review remains S10 |

Executed: npm test; npm run test:integration -- tests/integration/S01_identity.test.ts (network permission required here); npm run typecheck; npm run lint; npm run build. Hosted SQL used the connected SQL tool. Current full acceptance and blocker are in docs/sprints/S01.md.
