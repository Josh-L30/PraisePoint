# S14 — Workspace QA, polish and audit

Requested 2026-11-01; verified 2026-11-02, Asia/Taipei. Local production build and Chromium desktop/mobile viewport emulation. Source is uncommitted and unpublished; Firebase/GitHub remain on S13.

## Scope and pending reference

Items 1 and 3–11 are implemented. Item 2 remains a separate preview because the user accepted the greeter and asked to provide a church-door reference photo. The entrance and simpler login/ornament removal have not been integrated into SignInPage. The current preview is at http://127.0.0.1:8765/ while the local preview server is running. It uses three photorealistic AI keyframes with camera scaling/crossfades, not filmed footage or continuous generated human movement. Play/replay, skip and reduced-motion bypass were verified. The reference has since arrived: the revised CCF entrance is available at http://127.0.0.1:8765/v2.html and is awaiting approval before integration/deployment; see S14-ccf-door-v2-preview.md.

## Implementation integrity: pass for the implemented scope

The work preserves PraisePoint, Figtree, CCF mark, teal palette and existing presentation data. Universal Web Dev and Impeccable supplied the workflow; performance/systematic debugging and Emil interaction guidance supplied the focused techniques. The mechanical detector ran once and returned no findings. Later declaration-order and material-performance fixes were reviewed manually, compiled and tested; the detector was not rerun. No new package, cloud storage service, schema, credential or real-church-data mutation was introduced. Authentication requests remain unchanged; the theme follows authenticated state.

| Before | After | Why |
| --- | --- | --- |
| Saved/system dark applied before sign-in | Anonymous/loading/login starts light; workspace preference restores after successful authentication | Consistent login while retaining the volunteer’s preference |
| Immediate theme jump | 420ms circle reveal from the theme control; immediate reduced-motion/unsupported fallback | Clear spatial feedback without a forced effect |
| Prepared services separated from primary links | Same 3px group gap as Templates; brand divider | Compact navigation and clearer hierarchy |
| Collapse arrow always visible | Panel outline remains; arrow appears on hover/focus | Quiet default with keyboard affordance |
| Mobile title squeezed beside icon/actions | Icon, wrapping title/metadata and actions on separate rows | Full title remains readable at 320px |
| Five line-only layout diagrams | Five readable category sample compositions | Users can distinguish lyrics, scripture, sermon, announcements and welcome |
| Repeated media explanations and maintenance text | Import/storage choices first; limits/backup disclosure; empty recovery collapsed | Shorter first scan without hiding recovery or limits |
| Plain motion collection | 10 motion previews from three new church-media providers, retaining 8 stills | More relevant variety; explicit source downloads |
| Fixed background on the scrolling body | One composited fixed backdrop layer | Lower repaint cost |
| Prefix after standard blur declaration | Safari prefix first, standard declaration last | Lightning CSS now preserves both supported forms |
| Large live blur surfaces | Layered glass fills while browsing; live blur on the portalled workspace menu | Keep the approved appearance while avoiding large shader surfaces |

## Audit Health Score: 16/20 — Good, implemented UI only

| Dimension | Score | Evidence / limit |
| --- | --- | --- |
| Accessibility | 3/4 | Named controls, keyboard menu/focus, complete mobile titles, reduced motion, native confirmation flows. Sampled primary-action contrast is above 4.5:1 in both themes. No complete screen-reader/WCAG certification. |
| Performance | 3/4 | Repeatable scroll traces, bounded live blur, lazy sized previews, route chunks and no new dependencies. No field CWV or physical GPU measurement. |
| Theming | 3/4 | Light anonymous boundary, retained preference, native circle, fallbacks, both themes across 42 route/width combinations. Explicit centralized state colors remain. |
| Responsive | 3/4 | 320px title wrapping, desktop editor/preview geometry, coarse-pointer and 42 theme/width/route checks. Physical phone/touch hardware unverified. |
| Integrity | 4/4 | Actual providers, explicit imports, genuine saved states, original-media uploads absent, preview kept separate pending user reference. |

No unresolved P0/P1 defect was found in the exercised scope. Pending entrance work is an asset/approval dependency, not a broken login flow. A minor inherited maintainability item remains: some state fills in themes.css use literal colors; consolidate if the palette is revised (P3, Theming, small effort, no observed contrast failure). Suggested future sequence: `$impeccable colorize`, then `$impeccable polish`; no broad token rewrite is needed for this delivery.

## Verification evidence

- Full unit run: **285/285**, 75 files, 445.04 seconds. After the final CSS discovery, the theme/CSS subset passed **4/4**, 2 files, including a regression through the real Lightning CSS compiler. The added compilation test first failed on the dropped standard blur declaration, then passed after reordering.
- Initial broad browser run: **50/51**. The responsive failure captured the normal loading screen after a generic h1 match; the test now waits for the actual workspace header. Responsive follow-up plus the new motion gallery: **2/2 passed**.
- Final material/editing/theme/responsive subset: **19/19 passed**, no skips/flaky cases, after the final CSS choice. Combined runs cover **53 unique functional browser scenarios**, not one clean 53-case run.
- A 19-case intermediate run was stopped while the material-performance tradeoff was still being measured; it is not counted as passing evidence.
- Final production TypeScript/Vite build passed: 45 precache entries, about 1028.50 KiB. Lint: 0 errors, one existing Modal.tsx Fast Refresh co-export warning. Existing inlineDynamicImports deprecation remains.
- All 10 new preview URLs returned HTTP 200 image content. The gallery loaded all 18 previews under the local production hosting policy with no cloud-media upload writes. One gallery check also viewed the Worship Hands preview specifically.
- 42 light/dark route/width combinations had no sideways overflow or page errors. Primary-action contrast samples were at least 4.5:1; authored slide text colors remained unchanged. Editing, gesture cancellation, save/reopen, undo/reorder, 13-slide filmstrip, fullscreen geometry, image decode/import/retry and confirmation cancel/delete fixtures were exercised.
- Existing audience CSS explicitly hides the backdrop pseudo-element and uses an opaque black output surface. No physical projector rehearsal was run.

Historical sprint evidence was restored byte-for-byte; new captures use the S14-regression prefix. Final receipts: [verification](S14-verification.json), [responsive](S14-responsive.json), [provider URLs](S14-provider-previews.json), [detector](S14-impeccable-detect.json).

## Measured scrolling — local lab only

Chromium headless, 1366×900, warm local app with synthetic API fixtures, 24-row song page, 4× CPU throttle applied after startup, 80 requestAnimationFrame scroll steps, three repetitions per condition. The original body backdrop was reconstructed on the final UI to isolate that change. Live workspace-menu blur is closed during scrolling; browsing surfaces intentionally use layered fills. Values below are median (min–max) across three runs, in milliseconds.

| Condition | Paint time | Task time | p95 frame interval |
| --- | --- | --- | --- |
| Original fixed-body backdrop on final UI | 469.99 (334.73–516.28) | 2581.11 (1971.20–2604.34) | 66.70 (50.10–66.70) |
| Final light | 19.10 (12.67–26.41) | 355.77 (325.25–404.77) | 16.80 (16.80–16.80) |
| Final dark | 22.80 (21.81–25.41) | 385.07 (375.26–916.77) | 33.30 (16.80–66.70) |

The final light condition reduced the measured paint work from about 470ms to 19ms. This is a local scroll comparison, not a load-time/Core Web Vitals score or a hardware frame-rate guarantee. Dark frame timing remains within the early dark baseline range. Field data/RUM is unavailable and was not installed. RasterTask events were not emitted in these traces; their zero totals do not prove zero GPU work.

The investigation matters: removing inner blur did not improve the first baseline. Moving the body backdrop into a fixed layer reduced repaint cost. A requested no-preference transparency run still reported no blur; inspecting the delivered CSS exposed the prefix-order compilation problem. Correcting that order enabled actual Chrome blur. A large live-blur panel then added headless frame cost, so the final UI reserves live blur for the portalled dropdown and uses the approved gradient/rim/shadow material on browsing surfaces. The final browser test confirms the menu has a standard 24px backdrop blur while scrolling surfaces have none. Early/intermediate profile files are retained with their conditions, and are not presented as final active-glass evidence.

## Free motion sources

Checked against primary provider pages during 2026-11-01–02:

- [Visual Revival free media](https://www.visualrevival.com/product-categories/free-media/) and [free collection download page](https://www.visualrevival.com/downloads/sermon-box-studio-free-downloads/?product_id=87544): cross, light-ray, stained-glass and richer abstract previews; free provider account required for downloads.
- [Motion Worship free pack](https://www.motionworship.com/free-church-media-012521/): free particle motion loops with MP4 links.
- [Church Media Drop Worship Hands](https://live.churchmediadrop.com/downloads/worship-hands/): free worship footage with lifted hands.

The app embeds preview images and links users to the provider pages. It does not redistribute original videos or guarantee ongoing provider availability/terms. The user still downloads/imports and prepares services on the presenting laptop; no automatic Supabase original-media uploads or direct streaming inside slides was added. See also [MDN View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) for the progressive-enhancement API used by theme switching.

## Local launch-readiness rubric

**71.4/100, provisional; coverage 13/26 (50%). Verdict: Readiness unverified.** This wider rubric includes unrun release items and does not rate the visual quality. S14 has not been deployed, and the entrance remains pending.

| Category | Score | Weight | Checked/applicable |
| --- | --- | --- | --- |
| Works as intended | 75 | 20 | 4/5 |
| Works for everyone | 81.25 | 25 | 8/8 |
| Trust and safety | Not assessed | 25 | 0/6 |
| Load speed | 50 | 15 | 1/4 |
| Found and shared | Not assessed | 15 | 0/3 |

Item arithmetic (pass=1, partial=0.5): critical flow and forms partial (backend fixtures), page errors pass, internal/deep links pass; true 404 not rerun. Contrast partial (sampled), keyboard pass, labels pass, heading coverage partial, reduced motion pass, responsive layout pass, physical phone partial, worst-case content pass. Sized/lazy images partial; throttled phone navigation, render-blocking/unused-script analysis and CWV not run. Scroll timing above is a separate measured interaction, not substituted for load speed. Weighted score `(75×20 + 81.25×25 + 50×15)/60`.

Not run for S14: live Google success/cancel/logout, actual cloud writes/access-denied backend checks, production HTTPS/CSP/SW update/offline restart, secret scan/rate-limit/legal/consent review, public metadata/canonical/social checks, physical phone/screen reader/projector and field performance. Authenticated workspace indexing, multilingual hreflang and discovery sitemap/schema are not applicable to these private UI changes. Existing S13 production evidence remains historical evidence, not certification of S14. Developer owns release verification when requested; user owns the church-door reference and physical rehearsal. Product context’s legacy Impeccable format was noted without an unrelated rewrite.

## Visual captures

- [Category choices](S14-layout-choices.png)
- [Mobile song title](S14-song-mobile.png)
- [Simplified media library](S14-media-library.png)
- [New moving-background gallery](S14-moving-backgrounds.png)
- [Entrance concept](S14-entrance-preview.png) / [proposed login](S14-login-concept.png) — preview only, awaiting reference

## Release integration addendum — 2026-11-02

The earlier preview-only status is historical. The user supplied the CCF reference, approved the corrected V4 video and authorized publication. The approved entrance and simpler light sign-in are now integrated, with desktop-only once-per-tab playback, reduced-motion/offline bypass, Skip/Escape and media-error/stall recovery. Current rendered sign-in captures are `S14-integrated-login-desktop.png` and `S14-integrated-login-mobile.png`; moving footage is `S14-integrated-entrance.png`.

Fresh checks: 290 unit tests passed across 77 files; 23 production-build browser cases passed, including worst-case service/workspace content, desktop/mobile layouts, theme switching, editing, media/workspace confirmations, entrance playback and failure recovery. Build passed; lint has no errors and one existing Modal Fast Refresh warning. This addendum does not recalculate the provisional readiness score above or claim physical-device/OAuth/backend-write verification. See `S14-release.json` for publication and live-origin evidence.
