# S38 Sanctuary login release

The user selected option 1 from the S37 comparison for desktop and mobile and requested application and Firebase deployment. Implementation follows the approved photograph/open-headline/pale-panel composition, with compact stacked phone layout and a teal Google button. No entrance video, new dependency, backend change or data migration.

## Verification

- Production build and Firebase Hosting predeploy build passed. Final deploy completed for gather-ccf-presentations, Hosting only, 50 files.
- Auth shell/service unit checks: 13 passed across 2 files, rerun after final punctuation correction.
- Local browser checks: 11 passed (auth routing/recovery, mobile drawer, direct entrance, Sanctuary composition, reduced transparency, keyboard OAuth route and retry).
- Published browser checks: 5 passed; actual Google OAuth redirect intercepted to verify provider, callback and account chooser without signing in or changing church data.
- Local and published Chrome layout checks passed at 1440x900, 834x1112, 390x844, 320x700 and 844x390. No horizontal overflow; primary button 50-54px high, one CCF logo, no video, no page errors. Desktop and mobile screenshots saved alongside this record.
- Screenshot review confirmed the approved Sanctuary composition. Original punctuation and busy-state ellipsis preserved after fixing a shell-encoding issue caught in final review.
- Formatting and git diff --check passed. Lint: no errors, one existing Modal.tsx Fast Refresh warning. Existing build inlineDynamicImports deprecation remains.
- Tablet/phone checks used viewport emulation, not physical hardware. Real Google account sign-in was not repeated; auth service behavior is unchanged.

## Release

Live: https://gather-ccf-presentations.web.app/auth

DESIGN.md records Sanctuary as the current login design, superseding Evening Calm/Open Horizon. The approved five-option preview remains local and ignored.
