# Setup and connection status

Updated 2026-10-28. Do not put passwords, Google secrets, elevated Supabase keys, or tokens into chat or source control.

## Created and connected

- Supabase organization: Josh-L30's CCF, Free plan.
- Project: CCF Church Presentations, ref tnrmotwiarlpknamxoyp, Singapore (ap-southeast-1).
- Quoted project price at creation: $0/month. No billing upgrade activated.
- [Supabase project](https://supabase.com/dashboard/project/tnrmotwiarlpknamxoyp).
- API URL: https://tnrmotwiarlpknamxoyp.supabase.co.
- Browser publishable configuration is in ignored .env.local. Only the publishable key is used; no service-role key is in the app.
- Identity/private-workspace migration applied. Hosted transaction assertions passed and rolled back all synthetic identities. Real Google verification later created one owner profile and personal workspace.

## Google provider — enabled and live login verified

A dedicated Google Cloud project, ccf-presentations, was created without enabling a billing trial. The owner personally completed the Google User Data Policy/configuration step, then explicitly approved creating/configuring “Gather CCF Web.” The client credential was created and transferred directly into Supabase's Google provider settings. No credential JSON, client secret, or elevated key was saved to source files. The UI showed Google ENABLED, and the public settings API independently returned google=true.

Existing Web application client configuration (reuse it; do not create a duplicate):

- Authorized JavaScript origins: http://127.0.0.1:5173, http://localhost:5173, and http://127.0.0.1:4173.
- Authorized Google redirect URI: https://tnrmotwiarlpknamxoyp.supabase.co/auth/v1/callback.
- Scopes: basic identity only (openid, email, profile).
- Google Client ID/Secret belong in Supabase's Google provider settings, not Vite variables or frontend code.
- Supabase Site URL for development: http://127.0.0.1:5173.
- Supabase allowed app redirects: http://127.0.0.1:5173/auth/callback, http://localhost:5173/auth/callback, http://127.0.0.1:4173/auth/callback.
- In Google testing mode, add the intended test identities explicitly. Publishing to unrestricted Google users is a later release action.

Google's email/profile/OpenID scopes, Supabase Site URL, and all three exact callback addresses were verified saved. The owner is a Google test user; the Google application remains in testing mode. Email, phone, anonymous and other providers are disabled; Google remains enabled.

Real Google sign-in reached the private dashboard; reload restored the session. Sign-out blocked protected navigation, and repeat login reused the same workspace. A real Google Cancel action returned to Gather's recovery page. See [S01 evidence](sprints/S01.md). Browser input sometimes reports a timeout even after applying the action: inspect the current state before repeating any mutation. The authorized Windows fallback exposed the browser panel and helped recover control. Existing backend/credentials must not be recreated.

## Local commands

Node 24.x; installed versions are pinned in package.json and package-lock.json.

- npm ci: restore dependencies from lockfile.
- npm run dev: development at http://127.0.0.1:5173.
- npm run typecheck and npm run lint.
- npm test: local unit/component tests.
- npm run test:integration: live public-key/anonymous API-denial checks; requires .env.local and network access.
- npm run build and npm run preview: production build at http://127.0.0.1:4173.
- npm run test:e2e: automated Playwright checks; requires its Chromium test browser.
- npm run test:db: reserved for a configured local Supabase/pgTAP runner; Docker is not installed/configured here, so it is not current passing evidence.

Hosted database assertions are in supabase/tests/S01_identity.connector.sql. Run through the connected SQL tool; it uses a transaction and rollback, with synthetic identities only. It is deliberately not a pgTAP script. No test fixtures remain in the live project.

The frontend is not published. The authenticated media-upload Edge Function v2 is deployed in this existing Free project; creating or updating the backend does not publish the website.

## Media backend

Use the existing private gather-images bucket and applied migration history through 20261028065536. The Edge Function reads the platform-provided server keys only; do not copy those keys into Vite or browser storage. Built-in gateway JWT verification is disabled for this function because its handler verifies each bearer token with auth.getUser and requires a confirmed Google identity; anonymous calls return 401. The public key alone does not authorize writes.

Uploads are bounded and decoded by the proxy, reserved atomically, claimed once, and finalized only after stored metadata verification. A request shares a 90-second upstream deadline; failed started writes stay charged until the 15-minute lease expires and cleanup verifies object removal. Media library → Unfinished uploads exposes recovery. Keep local originals; local catalog records do not transfer video bytes to another laptop. Native local-file playback and complete prepared offline services are separate milestones.

Hosted rollback regression files now cover S01–S06. Real v2 media verification and zero-fixture cleanup are recorded in [S06](sprints/S06.md). No billing upgrade, new OAuth credential or unrestricted Google publishing was performed.

## Presenter windows

S07 uses same-origin BroadcastChannel and profile-bound IndexedDB on the presentation laptop. The audience entry has no AuthProvider or Supabase client and never downloads from cloud independently. Sign in and open a saved service through the operator; it verifies/caches required media before sending. Allow this website's projector popup. Move output to the projector and use F or the browser fullscreen command manually. New/reopened output starts black until Send current slide.

Only audience standalone video can produce audio. If autoplay is blocked, request Play, focus the projector window and press Space, or retry Play. Blackout pauses/mutes the standalone clip and restore stays paused. Physical audio routing, fullscreen and projector placement still need the actual equipment rehearsal. This online startup is not a prepared offline package.

## Offline production rehearsal (S08)

Offline preparation is enabled only in a production build. Run `npm run build` then `npm run preview`; open http://127.0.0.1:4173 online, sign in and prepare a reviewed saved service. Use that exact origin and browser profile for `/offline` after disconnecting. The dev server on 5173 and preview on 4173 have separate storage and sessions. Localhost production rehearsal is not publication. Keep original files: browser clearing/sign-out can remove prepared data. See [S08 operation and evidence](sprints/S08.md).
