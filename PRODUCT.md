# Product brief

Status: full written scope and operating defaults accepted by the user on 2026-10-26. Implementation remains unstarted.

## Purpose and confirmed scope

Help church volunteers prepare beautiful, readable slides before service and manually advance them in time with singers. Keep access and running costs at zero within free-provider quotas and existing equipment.

Confirmed first release:

- Google sign-in/profile; users immediately create and present their own slides.
- Private personal workspaces plus shared church workspaces.
- Templates and freeform dragging/positioning of text and images.
- Lyrics, Bible passages, sermon points, announcements, and welcome/closing slides.
- Whole-song paste with editable breaks, plus manual lyric entry.
- Shared reusable songs.
- Still images, videos, and moving worship backgrounds.
- Laptop controls and clean projector output; manual advancement.
- Uninterrupted moving backgrounds while lyrics advance within a song.
- Online operation and offline presentation.
- Figtree, CCF-inspired colors, and the approved Liquid Glass web direction.
- Large videos on the presentation laptop, with limited shared online media.

## Accepted operating defaults

These began as builder recommendations and were accepted with the full written design on 2026-10-26.

**Accounts and teams:** Google is the only initial login method. Profile includes display name and optional Google avatar; email supports account/invitation matching and is not public. Each user gets one personal workspace and may create one church workspace during the pilot or join other teams. Workspace switching never copies private content automatically.

**Roles:** church creator is owner; invited volunteers are members. Both create/edit/present shared decks, songs, and service plans. Only owner manages membership/settings, deletes shared songs/service plans/media and other members' decks, and transfers ownership. Members may delete a presentation they created only when no service plan references it. There is no published/unpublished state or publication step. Deleting a referenced deck/song/media item is blocked with a list of dependencies until an authorized user explicitly removes/replaces those references; existing complete offline snapshots remain self-contained. Owner cannot leave without transferring ownership to an existing member. No separate reviewer role or mandatory approval workflow.

**Invitations:** owner creates a single-use, email-bound invitation expiring after seven days; matching verified Google identity is required. Show/copy a link for manual delivery, with no automated email service initially. Acceptance is atomic. Expired/revoked/used/mismatched invitations grant no access.

**Sharing:** personal resources are owner-only; church resources require current membership, with no public links. Copying personal content into a church is explicit. A library song added to a service becomes a service-specific copy: changing it does not change the master or another service. Asset references must belong to the destination workspace or be explicitly imported/copied. Revoking membership blocks subsequent online access; it cannot erase files already exported or stored on a disconnected laptop.

**Editor:** desktop-first, 1920 × 1080 logical coordinates, 16:9 slides. Projectors scale/letterbox without changing line breaks. One renderer serves editor/previews/output. Support selection, move/resize text/images, layer ordering, alignment guides, text size/color/alignment, undo/redo, slide reorder/duplicate/delete, and overflow warnings. Bible passages are entered/pasted with reference and translation labels; automatic Bible/lyric API import is deferred.

**Lyrics:** initially split blank-line-separated stanzas; offer additional line-based breaks if a stanza exceeds safe space. Never invent, summarize, translate, or silently truncate lyrics. Preview breaks before insertion. Manual entry has the same styling controls. Song metadata: title, lyrics, optional author/source and usage notes.

**Saves:** online save is authoritative; show saving/saved/failed/conflict states. Retain the draft for retry. Revision checks prevent silent concurrent overwrites. Preparing a service freezes a snapshot; later edits mark that copy stale until explicitly refreshed. No live coediting or offline cloud-edit queue.

**Media:** JPEG/PNG/WebP still images and browser-decodable MP4 (H.264, AAC where audio is needed) are the first support target. Validate actual decoding on the presentation computer, not extension alone. No server transcoding. Unsupported/corrupt media gets a reselect/conversion message. Moving backgrounds loop muted; standalone videos have play/pause, volume, restart. Only audience output produces standalone audio. Multiple simultaneous video layers, streaming embeds, and automatic video creation are excluded.

**Presentation:** current/next previews, thumbnails, Previous/Next buttons, arrow/space shortcuts, blackout, exit. Shortcuts ignore text fields. Audience window opens through a user gesture; volunteer moves it to the projector and enters fullscreen manually. No automatic display detection promised. Lyric updates preserve the same background media instance. Blackout hides output; backgrounds continue muted, standalone videos pause/mute and remain paused on restore until explicitly played. Audience closure alerts operator; reopened output starts black until the current slide is explicitly sent.

**Offline:** prepare online on the actual presentation computer. Store app/fonts, service snapshot, and all required images/video bytes, including imported local videos. Temporary object URLs alone are not persistence. “Ready offline” requires complete, decodable local content. Prepared playback survives disconnected browser restart, without a fresh Google/network round trip. First login, cloud editing, joining teams, and uncached downloads require internet. Offline editing is deferred. Explicit sign-out removes app-managed prepared personal/team content. Account switching cannot expose another profile's local content.

**Zero cost and capacity:** free provider address; no paid domain/fonts/APIs/add-ons or automatic billing upgrade. Proposed pilot cloud uploads: still images only, at most 5 MiB/file, 50 MiB/workspace, and a 500 MiB global application cloud-media ceiling, enforced with atomic server-side quota reservation. Videos remain local. These are app caps below provider limits, not independent free quotas per church. Rate-limit creation/invites/writes, paginate libraries, and stop writes/uploads cleanly on capacity exhaustion. Public sign-in cannot guarantee unlimited users.

**Backup and transfer:** export portable deck/service metadata; keep/transfer original media separately and relink by verified identity on another laptop. This is not PPTX export. Another computer still requires initial online app setup before offline use. Browser storage can be cleared/evicted; provider availability and free terms are constraints.

## Observable acceptance

| ID | Acceptance example |
| --- | --- |
| A01 | Google success creates one profile/personal workspace; denial/cancel/expiry/network errors offer recovery without fake sessions. |
| A02 | Foreign personal/church records/assets remain inaccessible even with modified IDs; role/invitation actions enforce permissions server-side. |
| A03 | Each of five slide categories saves/reopens/customizes; line breaks and positions match projector output. |
| A04 | Whole-song paste/manual entry/reorder/duplicates/non-Latin text preserve entered words with editable breaks. |
| A05 | Service song edits do not change masters/other services; conflicting saves do not silently overwrite. |
| A06 | Local video survives reopen; bad media and exceeded upload caps fail usefully without accidental cloud upload. |
| A07 | Operator advances manually; audience sees no controls/profile/notifications; same-song background never restarts on lyric change. |
| A08 | Complete preparation survives disconnected restart; missing/stale/corrupt assets or insufficient storage prevent a ready claim. |
| A09 | Blackout, audio, closed/reopened audience windows, and deck boundaries follow the specified behavior. |
| A10 | Glass UI supports keyboard/focus, reduced motion/transparency, contrast/reflow, and a physical projector rehearsal. |
| A11 | Metadata import and media relink recover a service on a second prepared laptop; absent media stays clearly marked. |
| A12 | Pilot uses free plans, enforces app/global capacity, and never enables paid services automatically. |

## Excluded from first release

PPTX/PDF export, automatic Bible lookup, AI generation, remote phone control, stage monitors, simultaneous coediting, offline editing/sync, public sharing, donations, member/pastoral records, scheduling, and native mobile apps. Desktop editing/presentation is the target; mobile supports responsive navigation, browsing, and account access with a clear desktop requirement for editing/presentation.
