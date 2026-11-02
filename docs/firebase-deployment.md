# Firebase Hosting deployment

Status: published on 2026-10-29 with explicit user approval. Primary site: https://gather-ccf-presentations.web.app. Initial console release hash: 901647. The S17 photo-backed login from source 7e0869e is now published; current build and post-release checks are in docs/evidence/S17-release.json. CLI authorization and exact Supabase production callbacks are configured. Project: Gather CCF Presentations, ID gather-ccf-presentations. Spark was verified in the console on 2026-10-29. Keep Spark; do not attach billing, start a trial or enable Blaze.

## Configuration

The committed firebase.json publishes only dist. It applies the approved CSP/capability headers, no-cache for entry pages/service worker, immutable caching for hashed assets, and SPA fallback only for app/auth/offline/audience/present/setup/invite routes. Missing assets and private/config paths return 404. The obsolete Cloudflare public/_headers file was removed. Header rules use supported regular expressions so the official Windows emulator and URL paths both match. Hosting policy changes are included in the app build identity.

The pinned firebase-tools 15.34.1 is a development tool, not a browser SDK. Supabase Auth, database and private stills remain in tnrmotwiarlpknamxoyp; videos remain local. No Firebase Auth, Firestore, Storage, functions or App Hosting is required.

## Local verification

Use Node 24 and npm ci. Run npm run firebase:emulate to build and start classic Hosting at http://127.0.0.1:5000 with isolated demo-gather-ccf. This does not deploy to the real project. The emulator's origin has its own browser storage and is not a configured Google-login callback.

The automated S10_firebase-hosting browser cases use the actual Firebase Hosting emulator. They check routes, 404s, cache/security headers, then a complete browser close/restart disconnected with prepared image/video output and zero cloud requests. This is local emulator evidence, not public CDN or physical projector evidence.

## Authorization and publication sequence

1. Obtain explicit authorization for Firebase CLI Google access and frontend publication. The official CLI requests Firebase/Google Cloud management permissions across the signed-in account and stores a refresh credential in the user's private local configuration. Commands here must always name only gather-ccf-presentations. Keep credentials, auth codes and debug logs out of Git/chat. Optional Gemini and CLI telemetry can be declined.
2. Sign in with the official local CLI: npx firebase login. Complete any password/verification or legal steps personally. Check npx firebase login:list and npx firebase hosting:sites:list --project gather-ccf-presentations without printing credential files.
3. The console setup flow provisioned the default site gather-ccf-presentations on 2026-10-29; its dashboard now shows both expected domains and current release 901647. Recheck that site with the CLI before publication. Firebase changed new-project site provisioning in October 2026: the project ID alone no longer proves the site exists. If needed, create the dedicated site gather-ccf-presentations within the approved project. If that ID is unavailable, agree a different address before publishing or editing redirects. Do not rerun firebase init over the tested configuration.
4. For the verified site ID gather-ccf-presentations, intended primary address is https://gather-ccf-presentations.web.app with Firebase alias https://gather-ccf-presentations.firebaseapp.com. Add only their exact /auth/callback URLs to Supabase Auth URL Configuration while retaining localhost callbacks. Set the primary Site URL to the verified web.app origin. Keep the existing Google-to-Supabase callback and existing Google credential unchanged. Google OAuth Testing still restricts pilot access; hosting does not remove that restriction.
5. After approval and final checks, run npm run firebase:deploy. Its explicit --only hosting --project gather-ccf-presentations and predeploy build publish the frontend only. Review output and actual public response before calling deployment complete. If missing-site provisioning requires a choice, handle that explicitly; do not switch project or add paid products.
6. Verify public HTTPS, deep links, missing assets, CSP/cache/font/service-worker headers, Google success/cancel/logout, stills/video and a full disconnected prepared-service restart on the final origin. Record the deployed release/build identity and remaining user acceptance.

## Storage and recovery

Local development and the new HTTPS site have separate sessions, videos and prepared copies. Sign in on the hosted site, reselect original videos and prepare services again there. Choose one primary address consistently; the firebaseapp.com alias also has separate local storage. Never clear the known-good local presentation copy until the hosted copy is verified.

Keep the recorded Git commit/build manifest and local production archive. Firebase release rollback is a separate authorized action; verify compatibility with prepared services before using it. Original media and metadata backups remain the requester's responsibility. Physical rehearsal was skipped by user choice and remains unverified.

Runtime npm audit: zero findings. Full development-tool audit: four low and six moderate advisories, no high/critical, as checked during this setup. No compatible published fix for the CLI's pinned optional re2 chain was installed; no forced downgrade or unsupported overrides. These tools are not shipped in dist. Restrict the emulator to loopback and deploy trusted files only.

Sources: [Hosting configuration](https://firebase.google.com/docs/hosting/full-config), [CLI reference](https://firebase.google.com/docs/cli), [deferred site provisioning](https://firebase.google.com/docs/hosting/faq-and-troubleshooting#changes-for-deferred-creation), [Spark usage](https://firebase.google.com/docs/hosting/usage-quotas-pricing).

## Earlier live-auth verification

Initial release 901647 was published on Spark from source checkpoint ed7f8a1. The current PraisePoint update is source 2e53feb, verified on 2026-10-30; see [S11 release evidence](evidence/S11-release.json). Public HTTP/header checks and actual Google login/reload/sign-out/back-cancellation passed. A focused isolated public-origin offline image/video restart passed; synthetic cloud setup does not certify fresh hosted Storage writes. Two prior automated startup attempts failed runtime protection and were not reproduced with diagnostics; no startup fix is claimed. See [full S10 evidence and limits](sprints/S10.md#public-release-verification--2026-10-29). Physical/backup/pilot acceptance and Google volunteer test-user access remain open.

## S13 release — 2026-11-01

Source `bb8fdf8ac4b35e3c3b5d6c5a5a8b22b105040b54` is published on the existing Hosting site and GitHub branch `feat/church-workspace`. Production build and publication succeeded. All 47 public artifacts matched their local hashes; seven route/header checks, HTTP-to-HTTPS redirect and alias checks passed. Public browser smoke passed with synthetic auth/API fixtures, including persistent themes, workspace glass menu, worship previews and immediate Add slide/save/reopen. See [S13 release receipt](evidence/S13-release.json). Real Google sign-in, actual church-data writes and physical equipment rehearsal were not repeated. No billing upgrade or backend change was performed.

## S14 release — 2026-11-02

Source `5d5aef86bed103e75b45c3627d7b066f752f7f59` is published at the same Firebase site and GitHub branch. It includes the approved V4 CCF-door entrance, simpler light login, theme transition, compact sidebar, clearer slide layouts, mobile song title, worship backgrounds and scroll improvements. The welcome video is served by Hosting, outside the offline precache and Supabase Storage.

Fresh validation: 290 unit tests across 77 files; 23 release browser checks; 9 final auth/entrance checks; build passed; lint 0 errors with 1 existing warning. All 48 deployed artifacts matched their local SHA-256 hashes. Seven route checks, HTTPS redirect and alias checks passed. Six public-origin browser checks passed, including a complete disconnected browser restart with prepared image/video playback, no cloud requests and no CSP violations. See [S14 receipt](evidence/S14-release.json).

No backend/schema, billing or Google credential changes were made. Real Google OAuth, physical phone/projector rehearsal and actual church-data writes were not repeated. Existing installations can use the app's safe Update app flow when prompted.

## S15 release — 2026-11-02

Source `6cf1e277643ac68e244d91002ca584847f02ef48` is published on the existing Firebase Hosting site and GitHub branch. Login design is unchanged; the welcome video plays at 1.6× without a visible Skip button, and themes switch immediately without the circle. Fresh checks: 17 unit tests across 6 files; build passed; lint 0 errors / 1 existing warning. All 48 hosted files matched local hashes; seven route checks and HTTPS redirect/alias checks passed. All six public browser cases passed, including no theme view-transition calls and a disconnected full-browser restart with prepared image/video playback, zero cloud requests and no CSP violations. See [S15 receipt](evidence/S15-release.json). No billing, backend, credential or actual church-data changes. Existing installations can use Update app when prompted.

## S16 login correction — 2026-11-02

Restored the user-preferred earlier glass-card login from S13, retaining the S15 faster video and instant theme switching. Source `0d4a412b705ed23c8a6d300d326f430d5d2f6105` is published and saved to the existing GitHub branch. Build, 17 focused unit tests, 3 local browser cases and all 6 live browser checks passed. All 48 hosted files match the tested build; route/header/redirect/alias and offline image/video restart checks passed. No backend, credential or billing changes. See [S16 receipt](evidence/S16-release.json).

## S17 supplied photo — 2026-11-02

Published source `7e0869e6881ebb08503018ed9798277a417f4da5` with the user-supplied worship photo behind the login headline and one left-side CCF mark. Build passed; lint 0 errors / 1 existing warning. All 49 hosted artifacts match the build, including an exact hash match to the supplied photo. Seven public browser cases passed across desktop/tablet/mobile, missing-photo recovery, workspace smoke and an offline full-browser image/video restart. No backend/auth/billing changes. See [S17 receipt](evidence/S17-release.json).
