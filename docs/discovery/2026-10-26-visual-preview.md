# First visual preview

Status: user approved the revised v3 Liquid Glass visual direction on 2026-10-26. This approves appearance, not implementation or every proposed operating rule. The current written design and sprint ledger are linked from the root README.

The user accepted a browser mockup preview. The preview is stored locally under `.superpowers/brainstorm/908-1793005996/content/worship-workspace-v2.html`; the directory is ignored by Git because companion session files contain a local access key. Use the current session's `state/server-info` for its complete browser URL; restart the companion if needed. This is a temporary local preview, not a deployed website.

## Direction being reviewed

- Figtree throughout; the font and its OFL license are included locally in the preview.
- Reference teal `#00A6B6`, with a proposed darker action color `#006C78`, ink `#18343A`, pale background `#F0F5F5`, white surfaces, and line color `#D9E5E7`.
- Translucent navigation and tools, with an explicit solid-surface toggle. Opaque slide content remains readable.
- Dashboard centered on the next service and recent presentations, rather than invented analytics.
- Editor with slide thumbnails, editable/positionable text, and appearance/background controls.
- Dark operator view with current/next previews, manual advancement, thumbnails, blackout, and a separate audience preview window.
- Sign-in screen with a Google button and replayable loading animation concept.
- “Gather” is a proposed working name, not an approved product name. The cross mark is original preview artwork, not the CCF logo. Service dates, people, counts, decks, and lyrics are sample content.

## Preview interactions and limits

Implemented only as disposable HTML/CSS/JavaScript for design discussion. Includes screen switching, sidebar collapse, sample search/workspace toggle, lyric editing and positioning, manual slide addition, blank-line lyric splitting, slide navigation, blackout, and CSS background motion. Secondary navigation explains its intended feature rather than opening a full implemented page.

Google authentication, database persistence, true offline preparation, file/video import, and actual video playback are not connected. The offline-ready badge is explicitly marked demo. Freeform image placement and full undo history are not implemented in this preview. Text appearance/position changes are illustrative and are not yet consistently applied to operator/audience output; production needs one shared slide renderer. Reloading resets demo changes.

## Observed checks

- Parsed the preview scripts, including the companion's helper injection, with Node's JavaScript parser successfully.
- Inspected dashboard, editor, sign-in, and operator screens in the in-app browser.
- Verified that manual Next changes current and next lyrics; blackout hides current output and restores it afterward.
- Verified navigation collapse/expand and the demo Google button returning to the dashboard.
- Captured a dashboard screenshot at `.superpowers/brainstorm/dashboard-preview.png`.

These are preview checks only. A physical projector, actual media, offline operation, production Google authentication, mobile devices, and exhaustive responsive/accessibility behavior have not been verified. The initial browser view was approximately 800 pixels wide; a large desktop layout still needs review.

## Liquid Glass revision

User feedback: the first preview did not visibly deliver the requested Apple iOS Liquid Glass appearance. Revised preview: `.superpowers/brainstorm/908-1793005996/content/worship-workspace-v3.html`; this supersedes v2 for visual review, without approving the final design.

| Before | After | Why |
| --- | --- | --- |
| Nearly uniform pale background | Teal backdrop with broad curved forms | Makes the glass's tint and backdrop blur visible |
| Full-height flat sidebar and top bar | Floating rounded panels with translucent fills, saturated blur, bright rims, and inset highlights | Establishes separation and glass-like depth |
| Flat rectangular actions | Rounded controls with restrained highlights and press feedback | Carries the material into controls |
| Solid editor and presenter toolbars | Floating glass tool groups; opaque slide content | Preserves readability while showing the requested material |

This is a Liquid Glass-inspired web treatment, using CSS backdrop filtering, layered color, highlights, and shadows; it does not reproduce Apple's native optical refraction. Reduced transparency and unsupported-blur fallbacks use solid surfaces. CSS reduced-motion support remains in place.

Verification: inspected the revised dashboard, editor, and operator view in the in-app browser, with no browser errors in the captured error log. Screenshot: `.superpowers/brainstorm/liquid-glass-preview.png`. Full responsive, device, and accessibility verification remains pending.

Next: review the full written design and proposed operating rules before detailed implementation planning and product development.
