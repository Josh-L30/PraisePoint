# Whole-branch software review

Reviewed range: c77ade87d1475c6de04921d6e70fc7b0941130f0..0cce509b0417205fa53344e91e4f4dcdd9bf1166. One fresh-context read-only reviewer inspected UI, services, authentication, persistence, worker/channel, media/import and database/function boundaries. Its first attempt hit a usage limit; the same review seat resumed. It did not execute tests or modify code. The original verdict was not ready to merge.

## Findings and fix pass

| Grade | Observed effect | Change under validation |
| --- | --- | --- |
| Critical | A delayed sign-in completion could replace the newer device profile and purge its media/prepared copies, or restore a marker after sign-out | Native per-origin account-transition lock; current identity and request generation checked inside it before destructive device writes |
| Important | Dirty/saving editors were acknowledged idle; an update could activate and request reload while a memory-only draft existed | Editor and full-window preview each obtain a shared runtime lease before loading content and retain it until they close |
| Important | Update reload could interrupt cleanup/token removal during sign-out | Entire transition holds runtime protection; persistent sign-out intent blocks automatic access after failure/reload; explicit Google continuation retries cleanup first |
| Important | A pending local media read briefly projected missing-file instructions | Explicit pending/failed/ready media states; audience suppresses diagnostic text while operator previews distinguish loading and recovery |

Regression evidence before fixes: nine auth/audience tests, two editor tests and two additional preview tests failed. The final unit/component suite passed 251/251 across 63 files; TypeScript, lint and all 45 production-browser cases passed. Native cross-tab checks cover dirty editor/preview, delayed save, delayed database cleanup and delayed token removal. A separate accepted-update timeout regression passed RED→GREEN; fault-injected native activation is recovered by closing/reopening the persistent browser offline, with the saved service still verified. See the S10 record for their eventual results.

No minor findings were reported. There is one implementation fix pass; no second review is claimed.

## Behaviors the reviewer declined to certify

- Physical projector readability, sound, phone behavior and second-laptop recovery remain user equipment checks.
- A real database restore and execution of original-media backups remain operational rehearsals.
- External billing dashboard state and volunteer OAuth Testing access need account-owner confirmation.
- Publication and production-origin behavior remain separately authorized and verified steps.
- Later rehearsal/documentation edits were outside the supplied source commit range; their instructions are checked by the implementer and do not count as independent code review.

These are retained as release gates, not silently treated as passed. The user chose equipment rehearsal later; use [the practical guide](../rehearsal-guide.md) and [acceptance checklist](../release-checklist.md).

Current implementer assessment: the reported code findings are addressed and verified for the local rehearsal candidate. Physical/provider/hosting acceptance remains open; this does not assert a second independent approval or production readiness. Native update stalls use the documented 20-second close-and-reopen recovery while the guard keeps presentation blocked.
