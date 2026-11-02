# Auditorium background preview

2026-11-02. User requested a preview of their auditorium photo behind the entire login dashboard, before applying it.

Isolated preview: http://127.0.0.1:8766/. Files are under ignored `.superpowers/S18-preview/`. The current rendered login panel, fonts, glass card and left worship photo are retained. The auditorium image is used unchanged as the full-viewport background with a cover crop and a cool dark overlay. The form-side fill is slightly more opaque to retain readability against the busy photo.

“View current background” switches between the proposed auditorium backdrop and the current mint backdrop. Google sign-in is explicitly disabled; this static design preview contains no auth client or backend calls. The photo is not added to production source or Supabase.

Browser preview check passed: auditorium backdrop, comparison in both directions, disabled sign-in, mobile reflow at 390px and no page errors. Desktop (1440×1000) and mobile screenshots were visually inspected: `S18-auditorium-desktop.png`, `S18-auditorium-mobile.png`.

No changes to `src`, `public` or Firebase configuration; no commit, push or deployment. Approval is pending. If integrated, scope the backdrop to the login page so authenticated workspaces keep their existing background.
