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

Figtree is the approved free substitute for Proxima Nova; self-host with OFL for offline reliability. Body 400, controls 600, headings 650–700; interface scale 12/14/16/20/28/34 px. User instruction on 2026-10-29 replaces the working name/cross with PraisePoint and the official locally cached CCF logo in our teal. Do not reuse the Adobe kit or unrelated CCF imagery.

## Material and layout

Make glass visible: floating rounded sidebar/top bar, tinted translucent fills, blur/saturation, bright thin rims, inset highlights, and soft depth shadows. Broad teal curves behind controls provide content to filter. Starting values: shell radii 24–28 px, pill controls, content corners 16–21 px, blur 22–28 px.

Projected slides remain clear/opaque and contain no app glass/account details. CSS interprets Apple's material; it does not reproduce native optical refraction.

Dashboard prioritizes next service/readiness/recent decks. Desktop has approximately 220 px compact collapsing sidebar; collapsed items retain accessible names/tooltips. Editor uses thumbnails/stage/inspector; inspector moves below at constrained widths. Presenter uses a dark operator surface, current/next previews, thumbnails, and obvious Next.

Small screens use a drawer and show desktop requirements for editing/presentation. The preview's narrow icon rail is exploratory, not the final mobile contract.

## States, motion, and accessibility

Show real loading/empty/error/retry/denied/unsaved/conflict states. Distinguish local-only/cloud-shared/missing/preparing/ready/stale with text and color. No demo success/readiness labels in production.

Initialization reveal lasts only as long as real work needs; no forced delay. App transitions around 130–220 ms, reduced motion respected; slide advancement has no animation delay. Background motion has a pause control.

Target WCAG 2.2 AA: composited contrast, focus, accessible names, keyboard order/drag alternatives, non-color status, and opaque reduced-transparency/unsupported-blur fallbacks. Keep touch targets usable. Avoid nested expensive blur; test on the church laptop and reduce complexity if needed.

Lyric templates use large text, strong contrast, short lines, and safe margins, with overflow warnings. Check readability from congregation distance during rehearsal; laptop screenshots alone do not establish it.

## PraisePoint refinement — 2026-10-29

User-selected name: PraisePoint. Use the CCF mark sourced from https://www.ccf.org.ph/wp-content/uploads/2020/07/CCF-Logo-36x36-1.svg (linked in the official site DOM), kept locally with its original vector geometry and visible fills recolored to #007887. No logo tracing or AI recreation. Preserve Figtree and the teal glass identity. Compact laptop navigation, restrained login scale, 150ms centered native dialogs, and accessible icon file controls are the new UI rules. Internal gather-* cache/storage/protocol identifiers remain stable for compatibility.

## Navigation and editing refinement — 2026-11-01

The workspace trigger belongs in the sticky top navigation bar. It shows initials and a chevron; full workspace names are shown only in the anchored glass choice list. Keep one account identity in the sidebar. On desktop, the collapsed rail shows the CCF mark, revealing the menu on hover or keyboard focus; the expanded sidebar puts its collapse control beside the brand. Hide sign-out in the collapsed desktop rail, retaining it in the expanded sidebar and mobile drawer.

Use a clear teal primary action, pale teal secondary action, outlined neutral action and red destructive action, with visible hover/focus/pressed states. Separate related actions by at least 12px where space permits and wrap them at smaller widths. Disabled controls retain their state without implying an available action. Save labels represent confirmed writes and reset on editing.

Presentations owns slide creation. Templates is a background gallery with externally hosted still previews and links to free originals. Download/import is explicit; viewing the gallery never uploads originals into Supabase. Moving backgrounds remain local for presentation and offline preparation. Double-click slide text to edit/select words; a separate handle moves the box. Keep pointer targets active inside the otherwise non-interactive selection overlay. Full-window preview is rendered outside the glass shell so filters cannot constrain it.


## Themes and filmstrip refinement — 2026-11-01 (S13)

Use PW for personal workspace initials and the first letters of church workspace names. The compact button opens a viewport-bounded, portalled Liquid Glass list; support arrows, Home/End, Enter, Escape with focus restoration and outside dismissal. Keep full names and owner/member descriptions inside that list.

The sidebar uses a Sun/Moon theme action instead of a manual transparency setting. Respect the system theme until a choice is saved under praisepoint-theme; apply it before rendering, and follow changes across tabs. Theme UI surfaces, dialogs and controls coherently. Never invert or recolor authored slide/media content. Keep OS reduced-transparency and reduced-motion fallbacks.

Desktop editing uses a horizontal filmstrip below the canvas with a separately scrolling inspector beside it. Selection reveals the active thumbnail within the strip without scrolling the page vertically. Add slide immediately appends a fresh slide in the current category; Choose layout opens the separate category chooser. Retain undo/redo, keyboard reorder and save/reopen.

Templates is a worship-media gallery: ChurchRaise still previews and Church Media Studio motion-loop posters, plus CMG free-source links. Embed previews only, credit the source and link to provider downloads/usage terms. No automatic original-media uploads, rehosting or streaming inside slides. Provider previews may include branding and need internet; explicit import/preparation remains required for presenting offline.
