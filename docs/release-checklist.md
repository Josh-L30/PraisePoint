# Release candidate acceptance

Status: software verification is complete and independent-review findings are addressed. On 2026-10-29 the user chose to skip the physical rehearsal and proceed toward deployment. Hardware checks remain unverified; rehearsal is no longer a prerequisite at the user's request. The user later explicitly approved CLI access, exact Supabase live redirects and frontend publication; deployment completed on 2026-10-29. Latest app build identity is in docs/evidence/S10-service-rehearsal.json. The user-selected frontend host is Firebase Hosting Spark. Dedicated project gather-ccf-presentations was created on 2026-10-29 and Spark verified; Firebase Hosting configuration and local emulator checks are prepared; CLI authorization, site provisioning, publication and the public checks below are complete; physical/recovery and volunteer acceptance remain open. See [deployment guide](firebase-deployment.md).

## Evidence matrix

| ID | Software evidence | External acceptance still needed |
| --- | --- | --- |
| A01 Google sign-in | S01 actual success/cancel/reload/logout, current auth/identity regressions | Recheck final hosted origin; Google OAuth is still Testing/owner-only until volunteer access is configured |
| A02 Tenant/role isolation | All seven actual hosted rollback suites; anonymous HTTP denial; invitation/concurrency cases | Account owner reviews pilot membership and disconnected-copy expectations |
| A03 Five slide categories/layout | S03 save/reopen/shared renderer; S04 geometry; whole-service S10 rehearsal | Actual projector fit and congregation-distance readability |
| A04 Both lyric methods/words | S05 typed/pasted breaks/master copies; S10 non-Latin words reach audience | Volunteer usability check with actual service words |
| A05 Copies/conflicts | S03/S05 revision/concurrent write and independent master/service tests | Operator follows save/review workflow |
| A06 Media/capacity | S06 actual upload/decode/quota races and cleanup; S08/S09 persistence/recovery | Church laptop's actual media codecs and storage headroom |
| A07 Manual presentation | S07 current/next/thumbnails/send/reconnect and native continuity; S10 whole service | Projector extended display, focus, fullscreen and real-time volunteer operation |
| A08 Offline restart | S08 complete persistent Chrome shutdown/relaunch offline; corrupt/font/quota refusal; safe two-build updates | Repeat on presentation laptop with network physically removed |
| A09 Blackout/audio | S07/S10 native video clock/mute/pause/restore and audience-only transport | Audible speakers, correct output device and volume from the room |
| A10 Accessible glass UI | Worst-case/reflow/keyboard, motion/opacity, measured primary contrast and touch emulation | Actual phone browsing, OS zoom, full contrast audit and church-laptop performance |
| A11 Transfer/recovery | S09 two isolated persistent profiles, missing/wrong/correct files, disconnected restart | A second physical laptop/USB transfer and a real backup restore drill |
| A12 Free operations | Server global/workspace caps, current official provider limits and operations guide | Owner verifies actual Free/billing settings, recovery access and named backup custodian |

Passing browser fixtures are not live database proof; hosted rollback/API tests are recorded separately. Headless media flags are not physically audible sound. These rows do not certify WCAG conformance, projector hardware, unlimited free usage or a published service.

The project requester confirmed responsibility for both provider accounts and original-media backups on 2026-10-28. No account transfer was performed.

## Physical rehearsal sheet

Record the date, operator, laptop model/OS, installed Chrome or Edge version, projector model/native resolution, connection type and speaker output. Use a representative complete service, not an empty slide.

- [ ] Save/review all five slide types, manual and pasted lyrics, image layout and actual video files.
- [ ] Prepare and verify on the presentation laptop. Physically disconnect Wi-Fi/network, fully close/reopen the browser to /offline, then open/send output.
- [ ] Move output to the projector, enter fullscreen and inspect words from the back of the room, at normal lighting. Check line breaks/safe margins and long/non-Latin words.
- [ ] Advance manually with singers; test buttons/arrows/Space, section jumps, blackout and explicit resend after closing/reopening output.
- [ ] Confirm muted continuous backgrounds; Pause/Resume backgrounds keeps time within a song. Test standalone play/volume/seek/restart, real audible speakers, blackout pause/mute and paused restore.
- [ ] Rehearse a realistic full-service duration on power, watching heat, frame drops and memory/storage. Reduce transparency if useful; keep original files and a verified fallback service.
- [ ] On a second physical laptop, initial online sign-in/import, relink originals, prepare, then restart disconnected. Record how long recovery takes.
- [ ] Test mobile browsing/drawer/inputs on one actual phone. Editing/presentation requires desktop. Verify OS/browser zoom and keyboard focus on the real laptop.
- [ ] Confirm the provider-account owner, backup custodian, substitute volunteer and safe off-laptop backup location. Perform an isolated logical database/Storage restore drill before relying on it.

## Publication gate

- [x] User explicitly authorizes frontend publication and selects the free hosting account/address. No paid domain/trial/add-on or push/merge is implied by this checklist.
- [x] User selected PraisePoint and the official recolored CCF mark on 2026-10-29.
- [ ] Pilot privacy/retention expectations accepted.
- [ ] Provider dashboard confirms Free plans, usage and billing settings. Record human owner and recovery methods privately.
- [ ] Google consent/test-user configuration permits the intended pilot volunteers. Publishing the frontend alone does not change Google Testing restrictions.
- [x] Keep the known-good Git commit/dist artifact/build ID, migration list and a verified offline service. Preserve original files/metadata backups.
- [x] Build with Node 24 and only the two public Supabase frontend variables; upload dist only. Exclude .env, SQL dumps, browser profiles, credentials and original videos.
- [x] After hosting exists, configure its exact Google/Supabase callback/site origin without recreating credentials. Verify real Google success/cancel/logout, protected deep links and SPA fallback.
- [x] Verify CDN response headers from firebase.json, actual fonts/Blob images/video, no CSP errors, correct service-worker scope and cache update prompting on the hosted origin.
- [x] Repeat complete offline preparation/full browser restart on that exact hosted origin. Local 5173/4173 storage does not move to a new domain.
- [ ] Record pilot user acceptance and unresolved limits before calling S10 Done. Apply no destructive database rollback or restore as part of frontend publication.

See [operations](operations.md), [backup/restore](backup-restore.md) and [S10 evidence](sprints/S10.md).

The user will rehearse equipment later. Follow the [plain-language rehearsal guide and results sheet](rehearsal-guide.md), including stopping the local preview server before the disconnected browser restart.

Firebase preparation: project Gather CCF Presentations (gather-ccf-presentations) exists on Spark. [Console](https://console.firebase.google.com/project/gather-ccf-presentations/overview), [evidence](evidence/S10-firebase-project.png). Do not assume Cloudflare public/_headers is applied by Firebase; create and verify equivalent firebase.json headers and SPA rewrites first. Creating the Firebase project did not publish the frontend or change existing Google/Supabase credentials.

Publication completed 2026-10-29 on Firebase Spark, release 901647. Exact callbacks, actual Google auth/reload/logout/back-return, public routing/headers and a focused public-origin prepared media restart are recorded in [S10](sprints/S10.md#public-release-verification--2026-10-29). Offline setup used isolated synthetic cloud records. Two initial runtime-startup failures remain an observed limitation, not a claimed fix; real equipment/backup restore and volunteer acceptance remain open.
