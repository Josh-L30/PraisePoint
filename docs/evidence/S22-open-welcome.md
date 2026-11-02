# Approved Open Welcome release

User selected option 5 from the S21 panel comparison and explicitly requested deployment on 2026-11-02.

The login now uses the full-screen auditorium reference, open white headline with Slides/Songs/Present icons immediately below, one compact frosted sign-in panel, one brand mark and a volunteer footer. The enhanced 1672 × 941 photograph is optimized to a quality-92 JPEG (812,221 bytes, down from 3,130,282 bytes). This is a user-reviewed AI reconstruction, not an exact restoration. Firebase hosts the image; no Supabase Storage or database changes.

The existing Google sign-in service, retry/error recovery, anonymous light-mode boundary, 1.6× entrance video, white handoff and mobile/reduced-motion bypass are preserved. Missing-background fallback is dark teal; reduced transparency uses a solid sign-in surface. The image is outside the verified offline app shell, as with the earlier login photograph.

Local verification: production build/typecheck passed; lint zero errors with one existing Modal Fast Refresh warning; 18 auth/entrance component and service tests passed. Eight Chromium checks passed: 1440, 768, 390 and 320 pixel layouts; missing image; entrance/once-per-session/light login; keyboard activation to the existing Google OAuth URL with the correct callback; and failed-provider retry recovery. OAuth navigation was intercepted for this UI check; no account login or credential change occurred. Initial keyboard test needed an explicit wait for the asynchronously rendered login before pressing Tab.

Production desktop and phone screenshots were visually reviewed. Phone checks use viewport emulation, not physical hardware. The accepted prototype remains local for comparison.

Published successfully to Firebase project `gather-ccf-presentations` on Spark. All eight browser checks passed again on the public origin in 20.8 seconds. All 51 hosted files match the final build by SHA-256. `/auth`, `/auth/callback`, `/app` and `/offline` serve the expected app shell; the firebaseapp.com alias matches too. See `S22-hosted-artifacts.json`. No real Google account login was repeated; the existing OAuth route/callback was verified with intercepted navigation.
