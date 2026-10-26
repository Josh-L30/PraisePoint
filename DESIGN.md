# Visual and interaction design

**Approved:** user accepted the Liquid Glass direction in mockup v3 on 2026-10-26. This approves the appearance, not every sample label/name/control or implementation behavior.

## Reference and tokens

Local evidence: .superpowers/brainstorm/908-1793005996/content/worship-workspace-v3.html and .superpowers/brainstorm/liquid-glass-preview.png. These are ignored session artifacts, not production source. [Preview notes](docs/discovery/2026-10-26-visual-preview.md) record limits.

| Token | Value | Role |
| --- | --- | --- |
| Reference accent | #00A6B6 | CCF-inspired teal accents/selection |
| Strong action | #006C78 | Main action with white text; verify contrast |
| Ink | #153C43 | Primary interface text |
| Secondary ink | #42676E | Supporting text; check against composited glass |
| White | #FFFFFF | Content/highlights/appropriate slide text |
| Backdrop | #B6D9D7 base | Layered teal landscape behind glass |
| Glass fill | rgba(255,255,255,0.27) starting point | Increase opacity as needed for readability |

Figtree is the approved free substitute for Proxima Nova; self-host with OFL for offline reliability. Body 400, controls 600, headings 650–700; interface scale 12/14/16/20/28/34 px. Do not reuse CCF logo/Adobe kit/imagery. “Gather” and the original preview cross are working branding, awaiting a final church name/logo.

## Material and layout

Make glass visible: floating rounded sidebar/top bar, tinted translucent fills, blur/saturation, bright thin rims, inset highlights, and soft depth shadows. Broad teal curves behind controls provide content to filter. Starting values: shell radii 24–28 px, pill controls, content corners 16–21 px, blur 22–28 px.

Projected slides remain clear/opaque and contain no app glass/account details. CSS interprets Apple's material; it does not reproduce native optical refraction.

Dashboard prioritizes next service/readiness/recent decks. Desktop has approximately 242 px collapsing sidebar; collapsed items retain accessible names/tooltips. Editor uses thumbnails/stage/inspector; inspector moves below at constrained widths. Presenter uses a dark operator surface, current/next previews, thumbnails, and obvious Next.

Small screens use a drawer and show desktop requirements for editing/presentation. The preview's narrow icon rail is exploratory, not the final mobile contract.

## States, motion, and accessibility

Show real loading/empty/error/retry/denied/unsaved/conflict states. Distinguish local-only/cloud-shared/missing/preparing/ready/stale with text and color. No demo success/readiness labels in production.

Initialization reveal lasts only as long as real work needs; no forced delay. App transitions around 130–220 ms, reduced motion respected; slide advancement has no animation delay. Background motion has a pause control.

Target WCAG 2.2 AA: composited contrast, focus, accessible names, keyboard order/drag alternatives, non-color status, and opaque reduced-transparency/unsupported-blur fallbacks. Keep touch targets usable. Avoid nested expensive blur; test on the church laptop and reduce complexity if needed.

Lyric templates use large text, strong contrast, short lines, and safe margins, with overflow warnings. Check readability from congregation distance during rehearsal; laptop screenshots alone do not establish it.
