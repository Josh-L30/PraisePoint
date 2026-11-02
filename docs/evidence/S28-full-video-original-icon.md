# Corrected mobile preview and original sidebar icon

Preview: http://127.0.0.1:8767/mobile-entrance-v2.html

User clarified that the full CCF name must remain visible as on desktop, and the original sidebar panel icon must stay. This supersedes the S27 portrait crop and replacement-arrow design.

The revised isolated preview uses the complete unchanged landscape video with `object-fit: contain`, centered in a white portrait canvas. This intentionally leaves white space above and below the landscape picture so neither the greeter/handle nor the CCF Christ's Commission Fellowship wall sign is cropped. The original playback speed, quick white handoff, Open Horizon iframe, replay and recovery remain. The S27 preview is retained separately. Production mobile entrance remains disabled pending approval.

The local sidebar again uses the original 19px PanelLeft symbol, always visible. Only the hover/focus chevron changes from 9px to 14px with a slightly stronger stroke and centered placement within the right half. Original 32px control width and fade behavior restored; no replacement or crossfade.

Production build/typecheck passed; lint zero errors and one existing Modal Fast Refresh warning; four shell component checks passed. Five Chromium checks passed in 21.4 seconds, covering 320/390/430px video playback/full-frame fit/handoff, replay/Escape, reduced-motion/missing-video fallback, and original panel visibility plus larger hover arrow, focus/collapse and both themes. Full-frame video and both icon screenshots visually reviewed. Device testing is viewport emulation, not physical hardware.

No deployment, commit, push, real account login or cloud data changes. Source changes are limited to AppShell.tsx and themes.css for the enlarged chevron. Mobile entrance changes remain only in the isolated preview.

Evidence: S28-mobile-door-{width}.png, S28-mobile-login.png and S28-sidebar-hover-{theme}.png.
