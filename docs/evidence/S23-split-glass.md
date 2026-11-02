# Split Glass and faster white entrance

The user requested deployment of reviewed option 2, a brand position farther left, and a quicker entrance into white.

Split Glass uses one frame with a transparent story area beside a pale frosted sign-in area, stacked on narrow screens. The brand aligns with page padding (40px desktop / 16px phone), independent of the centered frame. Full-screen auditorium, feature icons, one logo and Google sign-in remain.

The existing video retains 1.6× playback for the main door action and accelerates its final two source seconds to 2.6×. The white fade is 140ms and handoff 160ms (previously 240ms and 420ms). No regeneration or change to the greeter's movement. Escape, bypasses, error fallback and the maximum waiting deadline remain.

Verification: two new timing assertions failed against the prior behavior, then passed with the change. All 19 focused auth/service/entrance tests passed; build/typecheck passed; lint zero errors and one existing Modal Fast Refresh warning. Nine local Chromium checks passed, including desktop/tablet/390px/320px, single logo, feature order, no horizontal overflow, missing background, brand placement, shared panel frame, accelerated tail, light login/once-per-session entrance, keyboard Google OAuth handoff and failed-provider retry. Desktop and phone screenshots visually reviewed. Phone testing is viewport emulation, not physical hardware; Google OAuth navigation intercepted, no real account login repeated.

Published to Firebase Hosting project `gather-ccf-presentations` on Spark. All nine public browser checks passed in 24 seconds, including actual playback reaching 2.6× before the login appears. All 51 hosted artifacts match the final build by SHA-256. Four app routes and the firebaseapp.com alias return the expected app shell. See `S23-hosted-artifacts.json` and `S23-browser-results.json`. No backend or Supabase changes.

Screenshot capture now explicitly waits for photograph/logo decoding and fonts, after a public phone capture caught partially rendered media. All four live viewport checks passed again with that capture fix; the refreshed phone image was visually reviewed.
