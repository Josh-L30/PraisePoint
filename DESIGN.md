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


## Workspace refinement — 2026-11-02 (S14)

Anonymous/loading/sign-in surfaces default to light, preserving the saved workspace preference. Restore the preferred theme after successful authentication; theme controls belong inside the authenticated shell. A 420ms expanding circle originates at the theme button through the View Transition API. Respect reduced motion and fall back immediately when unsupported; protect rapid repeated activation. Auth requests and workspace authorization remain unchanged.

Keep Templates and Prepared services together in the primary navigation with the same 3px group gap. Separate the brand from navigation with a thin divider. The expanded collapse control retains its panel outline; show its tiny arrow on hover or keyboard focus.

The light backdrop is one fixed composited layer, replacing background-attachment:fixed on the scrolling body. Workspace browsing surfaces use the approved translucent gradients, rims and shadows without live backdrop filters. The portalled workspace choice list keeps live 24px blur. Declare the Safari-prefixed filter before the standard declaration: the reverse order made Lightning CSS discard the standard property. Retain opaque reduced-transparency fallbacks.

Mobile song rows put the icon, complete wrapping title/metadata and actions on separate rows. Category choices use five readable sample compositions instead of schematic lines; they illustrate purpose, and existing authored slide documents are untouched. Media library prioritizes import, location and used capacity; place format limits/backup tips behind a disclosure. Collapse upload recovery when empty and reveal pending work.

Motion previews now come from Visual Revival, Motion Worship and Church Media Drop, alongside the existing ChurchRaise stills. Link free provider pages and explain account requirements; do not upload or redistribute original downloads.

The separate church-door concept uses photorealistic AI keyframes and a 2.5D camera/crossfade, not filmed footage. The user accepted the greeter and will supply a church-door reference. Keep the entrance and simpler login design outside production until that revision is reviewed. The concept includes replay/skip and reduced-motion bypass.
## Approved S14 login entrance — 2026-11-02

Use the approved continuous CCF glass-door video with the same right-hand grip, opening into white before the light sign-in page. This is a rare welcome, once per tab session on desktop, with an always-available Skip action. Mobile, reduced motion, offline, failed playback and auth-error recovery go straight to sign-in. Keep the video outside the verified offline app shell. Login remains light; theme controls belong to the authenticated workspace.

The login story panel is plain deep teal with no rotated or rectangular ornaments; the form has a quiet mint background and no nested glass card. Retain the existing brand, copy and functional Google sign-in. Preserve the S14 sidebar, layout-preview, media-copy and measured scroll improvements.

## S15 motion refinement — 2026-11-02

Preserve the S14 login design exactly. The approved video plays at 1.6×, about five seconds, without a visible Skip button. Keep Escape, reduced-motion/mobile/offline bypass and automatic media-error/stall recovery. Keep the white handoff. Theme changes apply directly without a circular reveal or theme-specific view transition; preserve the saved preference and the anonymous light-login boundary.

## S16 login correction — 2026-11-02

The user clarified that “keep the old login design” means the pre-S14/S13 glass-card login, not the simplified S14 form. Restore the earlier glass sign-in card, decorative teal story panel, feature labels, private-workspace caption and free-use note. Keep the S15 faster video, no visible Skip button, light anonymous login and immediate theme switching. This supersedes the simplified-login appearance decisions above.

## S17 supplied worship photo — 2026-11-02

Use the user's worship photo as the story-panel background behind “Prepare with care. Lead with clarity.” Preserve the glass sign-in card and add a dark teal gradient over the photo for readable text. Replace the story's abstract ornaments with the photo. Keep one CCF mark in the left brand and remove the duplicate mark above Google sign-in. Use a cover crop on desktop and the compact story header on mobile. Retain the faster entrance and immediate theme switching.

## S26 Evening Calm and Open Horizon — 2026-11-02

The user approved the S25 refinement and selected phone option 1 for deployment. At 700px and wider, use Evening Calm with a shared dark teal frame at 58% fill opacity, a 6px local backdrop blur, white text and compact inline feature icons. Keep the two sections side by side on tablet. Below 700px, use Open Horizon: open white headline over the photograph, 16px inline Slides/Songs/Present icons and a separate translucent teal sign-in panel with a 26px gap. Omit the extra story paragraph on phones; preserve the sign-in description and privacy text. Use the reviewed left-aligned brand, smaller mobile typography, and solid panel fallbacks for reduced transparency. Preserve the faster S23 video and authentication. This supersedes S23's Split Glass appearance.

## S23 Split Glass and faster white handoff — 2026-11-02

The user switched to the previously reviewed option 2 and authorized deployment. Use a single centered frame with a transparent dark story half and a frosted pale sign-in half, with no gap between them; stack them on mobile. Keep the full-screen auditorium, three feature icons and one brand mark. Position the brand at the page's left padding (40px desktop, 16px mobile), independent of the centered frame. Retain the base 1.6× entrance playback, accelerate the last two source seconds to 2.6×, and shorten the final white fade/handoff to 140ms/160ms. Other entrance bypass, recovery and authentication behavior stays intact. This supersedes S22's panel treatment.

## S22 approved Open Welcome — 2026-11-02

The user selected the fifth panel alternative and authorized deployment. Supersede the earlier split login with the full-screen AI-enhanced CCF auditorium photograph, a white headline directly over the photograph, Slides/Songs/Present icons immediately below, and one compact pale glass Google sign-in panel. Keep a single brand mark above and a small service-volunteer footer below. Stack the story and sign-in panel on narrow screens. The photograph has a dark readability overlay without image blur; only the sign-in surface uses backdrop blur, with a solid reduced-transparency fallback. Login remains light, with existing Google authentication, errors/retry and the faster entrance/white handoff unchanged. The background is served by Firebase, not Supabase.
