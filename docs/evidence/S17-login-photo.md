# S17 login photo refinement

2026-11-02. User requested their supplied worship photo behind the left headline and removal of the duplicate CCF mark from the sign-in card.

Copied the original 247,738-byte PNG unchanged to `src/features/auth/media/login-worship.png`. It is bundled as a same-origin, content-hashed asset. No generated alteration, external hotlink or Supabase upload. The story uses a cover crop, a dark teal overlay and a solid-color fallback. Its abstract ornaments are hidden. The glass sign-in card remains; only its duplicate logo was removed.

Production-build Chromium checks passed at 1440px, 768px and 390px: photo returned HTTP 200, left panel used the supplied asset, exactly one left-side CCF mark remained, no form-side mark appeared, sign-in stayed visible and no horizontal overflow occurred. Captures: `S17-login-1440.png`, `S17-login-768.png`, `S17-login-390.png`. All three rendered captures were visually reviewed. These are viewport checks, not physical-device tests.

No entrance-video, theme, authentication or backend behavior was changed. These changes remain local and unpublished; the production site remains S16 until deployment is requested.

Final verification: build/typecheck passed; lint 0 errors / 1 existing Modal Fast Refresh warning; **4/4 browser checks passed in 13.6 seconds**, including a missing-photo case that preserves the teal fallback, heading and visible sign-in control. Real Google OAuth was not repeated.

Subsequently deployed with explicit user approval on 2026-11-02. All 49 public artifacts match the build; the hosted photo's SHA-256 matches the supplied source. All seven live browser checks passed, including the three viewport sizes, missing-photo fallback, workspace smoke and a full offline browser restart with prepared images/video. See [release receipt](S17-release.json). Prior release evidence was restored after reuse of its regression cases.
