# Setup and connection status

Updated 2026-10-26. Do not put passwords, Google secrets, elevated Supabase keys, or tokens into chat or source control.

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

The project is not deployed. Creating a backend project does not publish the website.
