# Sprint plan and status ledger

Roadmap for the accepted first-release design and implementation plan. S01 foundation is verified, including real Google OAuth and automated browser checks. Later sprints remain Planned until activated. IDs describe dependency-ordered slices, not calendar periods.

| ID | Usable outcome and acceptance | Depends on | Status | Record/evidence |
| --- | --- | --- | --- | --- |
| S01 | Google/profile/private workspace and approved glass shell; login recovery, collapsing navigation A01/A10 | Accepted design and user-owned provider setup | Done | [Record](sprints/S01.md), [test map](../tests/sprints/S01/README.md) |
| S02 | Church creation/invitations/shared access with tenant/role enforcement A02 | S01 | Done | [Record](sprints/S02.md), [test map](../tests/sprints/S02/README.md) |
| S03 | All five template slide categories save/reopen; shared renderer/revision conflicts A03/A05 | S01; ownership contract | Done | [Record](sprints/S03.md), [test map](../tests/sprints/S03/README.md) |
| S04 | Freeform text, resize/layers/alignment/undo/reorder/overflow A03/A04; image hook awaits S06 | S03 | Done | [Record](sprints/S04.md), [test map](../tests/sprints/S04/README.md) |
| S05 | Reusable songs, both entry methods, service copies and ordering A04/A05 | S02–S04 | Done | [Record](sprints/S05.md), [test map](../tests/sprints/S05/README.md) |
| S06 | Limited cloud stills, persistent local videos, decode validation/quota enforcement/media controls A06/A12 | S03–S05 | Done | [Record](sprints/S06.md), [test map](../tests/sprints/S06/README.md) |
| S07 | Operator/projector, manual controls, continuous backgrounds/audio/blackout/reconnect A07/A09 | S05–S06 | Planned | Create when activated |
| S08 | Complete offline preparation, disconnected restart, safe app updates A08 | S07; offline preflight | Planned | Create when activated |
| S09 | Metadata backup/import/media relink and second-laptop recovery A11 | S06–S08 | Planned | Create when activated |
| S10 | Physical rehearsal, accessibility/performance, capacity/recovery review and release acceptance A01–A12 | S01–S09 | Planned | Create when activated |

## Early feasibility

Before investing fully in high-risk slices, run bounded disposable checks for shared rendering at projector sizes, persistent video reopen/decoding, operator/audience audio/messages, disconnected app restart, and service-worker update deferral. Put each check in its owning slice or a small preflight; revise architecture if it fails before promising dates.

## Current handoff

- Discovery gathered; visual direction approved 2026-10-26.
- Full scope/operating defaults accepted by the user on 2026-10-26; independent builder check complete and its deletion-lifecycle ambiguity resolved.
- Native execution authorized and started. S01 has 13 passing unit/component checks, 6 passing browser checks, 2 passing live anonymous API checks, passing hosted SQL assertions, and real Google success/cancel/logout evidence; typecheck/lint/build passed.
- S02 complete: shared workspaces, invitations and atomic ownership operations; 43 unit/component, 12 browser and five live API checks including S01 regressions. Hosted authorization and overlapping concurrency assertions passed.
- S03 complete: editable templates/shared renderer, protected preview and safe revisions/drafts. Combined checks: 80 unit/component, 21 browser and eight live API tests; actual overlapping save conflict and hosted authorization/capacity checks passed.
- S04 complete within its scope: freeform text positioning/resizing, labels/layers/order, keyboard alternatives and undo/redo. Combined checks: 98 unit/component, 24 browser, eight live API; all four hosted rollback suites passed. Real image insertion remains S06.
- S05 complete: song masters, typed/pasted lyric review, independent service copies, ordering, frozen snapshots and dependency deletion. Combined checks: 117 unit/component (local 15-second assertion allowance), 26 browser, ten live API and all five hosted rollback suites. [Evidence and timing limitation](sprints/S05.md).
- S06 complete: private still uploads, local media persistence/decode, independent copies, image editor/review, quota races and safe recovery. Combined 173 unit/component, 29 browser, 13 live API and six hosted rollback suites; twelve real media checks passed against backend v2 and their fixtures were removed. [Evidence](sprints/S06.md).
- [Detailed implementation plan](superpowers/plans/2026-10-26-church-presentations.md) accepted. Next: S07 presenter. Reuse the existing project and credential.
- Before S01: user-owned provider accounts/redirects, safe test environment, repository destination.
- Before S10: actual laptop/projector/browser, final branding, account/backup owner, rehearsal.

Statuses: Planned → Ready → In progress → Implemented → Done. Blocked requires a concrete obstacle and next action. Done requires acceptance evidence/review. Keep one active implementation sprint and add later detailed records/tests only when activated.
