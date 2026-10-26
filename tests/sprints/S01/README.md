# S01 acceptance-to-test map

Planned coverage only. No executable tests/runner exist.

| Acceptance | Planned evidence | Gap |
| --- | --- | --- |
| A01 success/idempotence | Repeated auth callback initializes one profile/workspace | Provider/configuration pending |
| A01 failure/recovery | Browser checks for denial/cancel/expiry/network plus real OAuth smoke | Not implemented |
| A02 isolation | Two identities; database denies foreign personal records | Schema/fixtures pending |
| A10 navigation/accessibility | Keyboard/focus, collapse, reduced motion/transparency, narrow-screen drawer | Not implemented |
| Sign-out | Session removed; offline cleanup boundary tested in S08 | No product cache exists |
| Configuration safety | Production bundle excludes elevated secrets | No build exists |

Commands: pending scaffolding. Add real test paths, verify discovery, and record outcomes in docs/sprints/S01.md. This README is not passing coverage.
