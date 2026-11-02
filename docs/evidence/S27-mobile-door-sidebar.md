# Mobile door preview and sidebar icon refinement

Preview: http://127.0.0.1:8767/mobile-entrance.html

User asked to review the mobile door entrance before applying it and requested a clearer sidebar hover arrow. No deployment, commit or push performed.

The isolated preview reuses the existing approved AI greeter video, framed with `object-fit: cover` and `object-position: 12% center` to keep the greeter and original handle together on portrait phones. It uses the existing 1.6× main playback, 2.6× final two source seconds and 140ms fade/160ms white handoff into a disabled Open Horizon login preview. Replay and Escape work, reduced motion opens login immediately, and playback failure/7.5-second deadline reveal login. This is the same AI-generated video, not new filmed footage. Production entrance policy and components are untouched: mobile entrance is still disabled there.

Local sidebar change replaces the overlapping 9px chevron with a full 22px ArrowLeftToLine icon. A 140ms hover/focus transition replaces the resting panel icon rather than layering the arrow over it. The control is 36px wide; labels, collapse behavior and reduced-motion support remain. Both light and dark appearances were reviewed.

Verification: production build/typecheck passed; lint zero errors with one existing Modal Fast Refresh warning; four existing shell/component checks passed. Five Chromium checks passed in 23.2 seconds: real video playback and automatic login at 320/390/430px, replay/Escape, reduced-motion and missing-video fallback, plus sidebar hover/focus/collapse in both themes using synthetic session fixtures. Mobile door framing, login handoff and both sidebar states were visually reviewed. These are browser viewport checks, not physical phone tests. No cloud writes or real Google login.

Evidence: S27-mobile-door-{width}.png, S27-mobile-login.png and S27-sidebar-hover-{theme}.png. Production source changes are limited to AppShell.tsx, glass.css and themes.css for the sidebar control; all mobile entrance code stays in the isolated local preview.
