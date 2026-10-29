# Operating PraisePoint on the free pilot

## Responsibility and account inventory

Supabase project: CCF Church Presentations, tnrmotwiarlpknamxoyp, organization Josh-L30's CCF. Google OAuth credential: Gather CCF Web. The frontend is live at https://gather-ccf-presentations.web.app. The user selected Firebase Hosting Spark on 2026-10-29; dedicated project Gather CCF Presentations (gather-ccf-presentations) was created and its Spark badge verified. Hosting configuration, CLI authorization and frontend publication are complete; Spark was reverified after release. See [Firebase deployment](firebase-deployment.md). The project requester confirmed on 2026-10-28 that they will maintain both provider accounts and original-media backups for now. A substitute operator still needs to be named before release. Store recovery methods/passwords in the owner's password manager, never this repository or chat. Use the existing project and OAuth credential; do not recreate them.

Keep three separate responsibilities: the church workspace owner manages invitations/members; the Supabase/Google/hosting account owner controls infrastructure; the backup custodian keeps metadata and original files. A church ownership transfer does not transfer provider accounts. Use Church workspace → Make owner for an existing volunteer and review the confirmation. Keep a second trusted account recovery method; provider-account transfers require a separate explicit operation.

## Before each service

1. Use the agreed laptop, exact production origin and browser profile. Plug in power; use current desktop Chrome/Edge and the projector's extended-display mode.
2. Save all songs/presentations/service ordering and review the service. Check long lyrics/overflow warnings and native video playback, including audio tracks where needed.
3. Prepare for offline and Verify prepared copy while online. Check for known changes and keep the verified previous version if refresh fails. Ready is a point-in-time local check; recheck after device/browser storage changes.
4. Close unrelated PraisePoint tabs before applying an app update. Apply updates and reverify before the service, while the operator is idle. Do not clear application storage or sign out during service.
5. Disconnect the network, fully close/reopen the browser to the bookmarked /offline page and rehearse. Open projector, move it, enter fullscreen with F, then Send current slide. Check actual room-distance readability and audible speaker routing.
6. Keep the original image/video files and exported service JSON on a second storage device. A prepared browser cache is not your portable backup.

During service, advance manually with buttons/arrows/Space, ignoring shortcuts while editing inputs. Blackout hides the output; moving backgrounds continue muted unless Pause backgrounds was chosen. Pause/Resume backgrounds preserves its element/time within a song. Standalone video audio comes only from the projector window; blackout pauses/mutes it and restore stays paused. A reopened output starts black until another explicit send. If audio is blocked, focus the audience window and use Space after requesting Play, or retry Play. Keep an offline fallback service available on the agreed device; browser support is not a guarantee of projector/speaker behavior.

## Recovery

| Situation | Action |
| --- | --- |
| Refresh/download/quota/decode failed | Keep the prior complete copy. Free device space or reselect the exact original, then prepare again. Never remove a good copy until a replacement verifies. |
| Ready copy becomes stale | Review online changes. Reprepare, or deliberately choose Present saved version after its files verify. A failed online check does not erase the saved copy. |
| Font/app cache missing or damaged | Reconnect and reopen the current production app, then verify. Clear/reinstall site data only when originals/metadata are backed up and time permits; this can remove prepared copies. |
| Video unsupported | Keep the original, convert a separate copy with a trusted local tool to browser-decodable H.264/AAC MP4 or supported WebM, import that new file and update references. There is no server transcoding. |
| Projector closed/disconnected | Reopen, move/fullscreen it and explicitly Send current slide. Missing local bytes/font/playback failures keep output black; verify/reopen rather than guessing. |
| Sign-out cleanup failed | Retry cleanup before changing accounts. Device access stays locked; do not bypass it by editing browser storage. |
| Supabase paused/unavailable | Use the existing complete prepared copy. The account owner restores the project through its dashboard, then checks Google sign-in and saved data online. Do not create a replacement project or a paid upgrade as a quick fix. |

## Capacity and zero-cost policy

App limits are shared application budgets: 5 MiB/4 megapixels per cloud still, 50 MiB cloud stills per workspace, 500 MiB globally including pending reservations; video originals are local, at most 128 MiB each. Document budgets are 25 MiB per workspace and 100 MiB globally; metadata counts toward those budgets. Rate limits and pagination apply. These caps do not measure physical Postgres/index/bloat overhead or cap every kind of provider bandwidth.

The Media library displays verified used and reserved cloud image bytes. Reclaim only expired unfinished uploads through its control; never manually subtract quota or delete private objects behind the application's accounting. Referenced media/decks/songs must be removed from their dependencies before deletion. A cloud file deletion is permanent; keep an original first. The owner reviews actual database size, storage, egress, function calls and Auth usage in Supabase's dashboard before the pilot and at least weekly while active. Recheck any alert before importing more media.

Official limits checked 2026-10-28: Supabase Free lists 500 MB database, 1 GB files, 5 GB egress, 5 GB cached egress and 50,000 monthly active users; inactive Free projects may pause after one week. These are provider quotas, not a promise of unlimited church use or uptime. [Current Supabase pricing](https://supabase.com/pricing). Cloudflare Pages Free documents 500 builds/month, 20,000 files and 25 MiB per static file. Videos remain local, outside the deployment. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

Keep Supabase on Free and use a free provider address. Do not attach paid add-ons, buy a domain, start billing trials, enable paid compute/backups or upgrade to resolve a limit without new user authorization. No automatic upgrade is implemented. The account billing/spend settings must be reviewed by the owner before release; this software review does not certify every external account setting. Do not schedule artificial keep-alive traffic to evade inactivity pausing.

## Backups and restore drill

Volunteers: export metadata after meaningful service changes and keep exact original media separately. Follow [backup/transfer instructions](backup-restore.md). Keep a second copy off the presentation laptop. Prepared copies are tied to an origin/profile and can be evicted or removed by sign-out.

Infrastructure owner: Free-plan data needs an independent logical backup; do not rely on paid daily backups or point-in-time recovery. Use the supported Supabase CLI export workflow into an access-restricted folder outside Git and outside public hosting. Export roles, schema and data separately with db dump (--role-only, normal schema dump, then --data-only --use-copy). Supply the connection securely through the owner's session/password manager; never paste it in source or evidence. Docker is required for the CLI dump environment. Back up private Storage file bytes separately as well: database dumps contain object metadata, not the actual image files. Retain the Git source/migrations and the backend function source alongside the logical backup inventory. [Free-plan backup guidance](https://supabase.com/docs/guides/platform/backups), [supported CLI restore workflow](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

A backup is not verified until the owner rehearses restoring it to an isolated empty project with compatible Postgres/extensions, roles, Auth identities, app/private schemas and quota rows. Restore roles/schema/data in the supported order, copy Storage bytes with their correct ownership/accounting, configure secrets privately, and run authorization/capacity/media/sign-in tests. Never restore a dump over the live church project as a rehearsal. Recovery writes/role changes/destructive restores require a concrete separate review and authorization. No production dump or restore was performed in this build session; real-data restore remains an external release check.

## App releases and rollback

Keep the previous Git commit, production dist artifact/build ID, compatible schema version and one verified offline service. A frontend rollback does not automatically roll back database migrations. Applied migration files are immutable; use forward compatible corrections. Additive schema changes must preserve the previous app while its offline copies are in use. Update prompts wait for every window to confirm idle; unknown windows defer. Verify a saved service after changing app builds.

Publish only after explicit approval using the [release checklist](release-checklist.md). The committed firebase.json Hosting policy allows only this app/Supabase/Google-avatar/Blob capabilities; inline style is required for freeform geometry, while inline/eval scripts and frames are blocked. The local rehearsal applies these actual headers and tests app/font/media restart; public CDN delivery, OAuth origin and SPA fallback were verified on 2026-10-29; native startup/update limitations and physical acceptance remain open. Do not upload .env files, credentials, SQL dumps, test profiles or original videos to the static host.

No analytics, advertising or third-party tracking was added. The app keeps account/workspace content and profile-bound browser media for its core workflow; the owner must approve the pilot's privacy notice, retention expectations and final church branding before public rollout.

Update handoff detail: protocol 2 writes a small persistent app-only guard before releasing the update lock, because native held locks can delay worker activation. New presentation/preparation is refused during the handoff; the new worker clears the guard after claiming windows and cleaning old app caches. Older/unknown windows cannot approve this protocol and should be closed before retrying. Prepared service/media stores are independent and retained.

Account and edit safety after the software review: deck editors and full-window previews hold runtime protection from before content loads until they close. Close these windows before requesting an app update or replacing prepared copies. Account transitions share a per-origin native lock and recheck the current identity before device-profile changes. Sign-out also retains a persistent access block if cleanup or token removal fails; choose Continue with Google to retry cleanup before starting a new sign-in. Reloading is not a bypass. Keep original files because a completed sign-out deliberately removes local copies.

Native update recovery: a Chromium session can delay activation after window/lock activity. An accepted update now stops waiting after 20 seconds and tells the operator to close all PraisePoint windows and reopen. The durable guard continues to refuse new presentation/preparation until the new worker completes. Close operator/projector/editor windows, fully quit the browser, reopen the same profile/origin and verify the saved copy. Do this before the service while updates are idle; do not clear prepared data as an update remedy. Normal automatic handoff and full-process recovery have separate browser checks.

Hosting choice supersedes the earlier Cloudflare proposal. Firebase project console: https://console.firebase.google.com/project/gather-ccf-presentations/overview. Spark was verified on 2026-10-29; no billing was linked in setup. Check the selected project’s actual Hosting quotas before publication, retain Spark and never enable Blaze/billing without new authorization. Firebase account/project administration is now included in the requester’s provider ownership. The earlier Cloudflare limits above are historical research, not this deployment’s allowance.

## PraisePoint workspace deletion

Only the church owner can delete a church workspace from Church workspace. Type its exact name in the centered confirmation. This permanently removes its presentations, songs, service plans, invitations, memberships and cloud images. Personal content and original files on the filesystem remain separate. Finish or reclaim pending uploads/copies first.

The server authorizes and freezes the workspace before this browser removes local workspace copies. Cloud bytes are removed through Storage before metadata/quota and the workspace are finalized. A failure leaves a locked, resumable workspace; use Resume workspace deletion. Do not manually delete Storage metadata or quota rows. Copies on other disconnected devices cannot be remotely erased. Retain independent originals/backups before confirming.
