# S39 Login side-spacing and tablet breakpoint fix

User requested tablet/iPad and mobile login responsiveness fixes and deployment.

## Cause and change

At 701px the previous layout switched abruptly into two columns, leaving the sign-in panel about 275px wide and wrapping the Google button label. At 600-700px the stacked panel stretched to almost the full screen width. The compact composition now stays stacked through 900px and is capped at 520px, centered with the story, brand and footer aligned. Minimum phone gutters remain 23px with safe-area padding. Wider columns use minmax(0, ...) to avoid intrinsic track expansion. Sanctuary's image, palette, copy and authentication are unchanged.

## Evidence

- Reproduced on published S38; regression at 701x1000 failed with a 34px two-line button label versus a 23.4px one-line allowance before the fix.
- Production build and Firebase Hosting predeploy build passed; deployment completed for gather-ccf-presentations (Hosting only, 50 files).
- Local and published Chrome suite: 24 passed each. Includes 19 frame sizes (320 through 1440px widths, portrait iPads, split-view sizes, phone landscape), balanced side gutters, no horizontal overflow, centered maximum panel width and single-line sign-in action; plus keyboard OAuth route, error/retry, reduced transparency and direct light-mode login checks.
- Local and published screenshots reviewed for phone and iPad; live 390px and 768px screenshots retained. Screenshot runs reported zero page errors.
- Formatting and git diff --check passed. Lint: no errors, one existing Modal.tsx Fast Refresh warning. Existing build deprecation warning remains.
- Viewport emulation only. Physical iPad/iPhone Safari and safe-area hardware behavior not verified; WebKit browser is not installed in this environment. No real OAuth sign-in or cloud data writes were needed for this CSS correction.

Live: https://gather-ccf-presentations.web.app/auth
