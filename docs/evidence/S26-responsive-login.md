# Evening Calm and Open Horizon release

User approved S25 mobile option 1 (Open Horizon) and authorized deployment with the refined Evening Calm desktop/tablet treatment.

At 700px and wider, use a shared dark teal frame at 58% fill opacity with 6px backdrop blur, solid white text, a fine divider and compact inline feature symbols. Smaller tablet spacing keeps both sections side by side. Below 700px, the headline is open over the photo with 16px inline feature symbols; a separate translucent sign-in panel sits 26px below it. Phone headlines are 25–27px, Google touch target 48px, and the extra story paragraph is hidden. Sign-in description and privacy copy remain. Reduced transparency uses solid teal and disables backdrop blur.

The same Firebase-hosted auditorium image, Google authentication, light login boundary and faster S23 video/handoff are preserved. No Supabase or backend changes and no new image uploads.

Local checks: production build/typecheck passed; lint zero errors and one existing Modal Fast Refresh warning; 19 focused auth/service/entrance tests passed. Twelve Chromium cases passed in 19.1 seconds: six widths (1440, 834, 700, 699, 390, 320), missing image, entrance speed/once-per-session/light login, layout/brand/icon spacing, tablet alpha/reduced transparency, keyboard OAuth URL/callback and failed-provider retry. Screenshot capture waits for images/fonts; desktop, tablet and phone were visually reviewed. Device checks are viewport emulation; real Google account login was not repeated.

Published successfully to `gather-ccf-presentations` Firebase Hosting on Spark. All 12 public browser checks passed in 26.4 seconds. All 51 hosted files match the verified build by SHA-256; `/auth`, `/auth/callback`, `/app` and `/offline` plus the firebaseapp.com alias return the expected app shell. Public mobile screenshot visually reviewed. See `S26-browser-results.json` and `S26-hosted-artifacts.json`.
