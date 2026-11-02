# Direct login and sidebar icon release

User cancelled all entrance-video work and requested removal of the desktop entrance plus deployment of the local sidebar icon adjustment.

## Released behavior

- Login opens directly on every viewport. SignInPage no longer imports the entrance component/policy, so the entrance MP4 is not emitted in the production build or requested by login. Approved login design is unchanged.
- Original 19px sidebar panel icon remains. Its hover/focus chevron is now 14px with 2.2 stroke and balanced inset (left 4.75px, top 2.5px in a 19px wrapper). Existing collapse/expand behavior and reduced-motion handling remain.
- No portrait video concepts were integrated. Historical source media and ignored previews remain local; no further Flow work is planned.

## Verification

- Production build passed, including Firebase's predeploy rebuild. No MP4 present in dist/assets; no entrance/video reference in production JS.
- Focused unit checks: 2 files, 7 tests passed (auth shell and UI foundation).
- Lint: 0 errors, 1 existing Modal.tsx Fast Refresh warning. Build emits existing inlineDynamicImports deprecation warning.
- Local browser checks: 9 login/layout/OAuth/error cases passed plus 1 sidebar hover/focus/light/dark/collapse case passed.
- Published browser checks: same 9 login cases passed at 1440/834/390/320 widths, no video requests, existing Google OAuth route intercepted safely; no real login or church-data write. Deployed sidebar case passed (10.8s) after increasing expectation timeout from 5s to 30s to accommodate hosted workspace loading. Initial short-timeout run stopped on Preparing PraisePoint; no product change needed.
- Phone/tablet checks used Chromium viewport emulation, not physical devices.
- git diff --check passed.

## Deployment

`npm run firebase:deploy` completed successfully for Hosting only, project `gather-ccf-presentations`, publishing 50 files. Live URL: https://gather-ccf-presentations.web.app/auth

After deployment verification, the user requested committing and pushing this release to the existing GitHub repository and branch.
