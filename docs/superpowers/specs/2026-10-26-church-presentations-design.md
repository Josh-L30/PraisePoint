# Church presentation workspace — written design

Date: 2026-10-26.
Status: **full written design accepted by the user on 2026-10-26**, including the operating defaults below. Production development and external setup have not begun. [Detailed implementation plan](../plans/2026-10-26-church-presentations.md) is the next review checkpoint.

## Intent and confirmed choices

Give church volunteers a free, attractive, dependable place to prepare slides before service and manually present from laptop to projector. Improve lyric readability/consistency while allowing templates and freeform positioning.

User confirmed all five slide categories, Google profiles, personal/church workspaces, reusable songs, both lyric-entry methods, video/continuous motion backgrounds, online/offline presentation, zero running cost, Figtree, and local large-video storage.

## Authoritative parts

Read together; each owns one subject:

- [PRODUCT.md](../../../PRODUCT.md): scope, proposed operating defaults, permissions, acceptance A01–A12.
- [DESIGN.md](../../../DESIGN.md): approved visual direction and interaction/accessibility requirements.
- [PROJECT.md](../../../PROJECT.md): proposed technical boundaries, persistence, collaboration, operations.
- [Sprint ledger](../../sprint-plan.md): proposed sequence/current handoff.
- [Verification strategy](../../testing.md): planned checks, not passing evidence.

[Discovery](../../discovery/2026-10-26-research.md) preserves history. Older proposals there are not a competing current specification.

## End-to-end flow

1. Google sign-in gives a private workspace; create/join a church workspace if desired.
2. Start from a template/blank slide, enter text or paste/review lyrics, drag/resize text/images.
3. Reuse service copies of songs, arrange the service, attach stills/local videos.
4. Save online with truthful status and conflict handling.
5. Prepare on the actual presentation laptop; resolve missing assets and verify local playback/readiness.
6. Open operator/audience windows; move audience to projector and enter fullscreen; advance manually.
7. Continue during network loss; reopen a prepared service disconnected if needed; keep song backgrounds running across lyrics.
8. Export metadata and retain media originals for backup; import/relink before another laptop presents.

## Boundaries

Zero cost is a constrained pilot, not unlimited hosting. Video stays local; cloud stills have application caps and capacity errors. Preparing for offline use is an explicit workflow.

Use fixed 16:9 and one shared renderer. Offline covers prepared playback including browser restart, while cloud editing/first sign-in stay online. Browser storage can still be cleared/evicted; readiness and media backups remain necessary.

Two team roles and manually delivered, email-bound invitations keep the initial workflow simple. No mandatory reviewer approval, live coediting, AI, public sharing, PPTX/PDF export, streaming embeds, or offline editing.

Desktop Windows Chrome/Edge is the proposed editing/presentation target; pin/test stable versions at implementation/release. No Safari/mobile parity promise. Actual laptop/projector, final branding, deadline, account/backup owner remain unprovided; needed before setup/live pilot, not to draft the plan.

## Builder decisions accepted with the full design

The user accepted these defaults through full-design review on 2026-10-26:

- TypeScript, Cloudflare Pages Free, Supabase backend without a separate Node service.
- Desktop-first 16:9, online editing/prepared-service offline playback.
- Owner/member permissions and seven-day email-bound manual invitations.
- Manual Bible/reference entry initially.
- Muted looping backgrounds, audience-only standalone audio, specified blackout/reopen behavior.
- Pilot app quotas, local video import and separate transfer/relink.
- Revision-safe saves, immutable prepared snapshots, shared renderer, portable metadata backups.

Builder may choose compatible free libraries, internal modules, tested persistence mechanism, and contrast-required styling refinements. Do not silently change product boundaries, activate paid services, or remove confirmed features.

## Anti-goals and checkpoint

A beautiful interface that loses lyrics, leaks another workspace, changes layout on projection, restarts backgrounds per slide, lies about offline readiness, or surprises the church with payment fails this brief.

Independent builder check completed 2026-10-26. It identified one ambiguity: “unpublished drafts” suggested an undefined publication lifecycle. Resolved as a proposed builder default in PRODUCT.md: no publication state; members can delete only their own presentations that are unreferenced by service plans. Referenced-resource deletion is blocked pending explicit dependency removal/replacement. The reviewer found the remaining scope sufficiently specified or reasonably left to the builder.

Full written-design approval is recorded. The next gate is review of the detailed implementation plan and selection of its execution method; no product implementation has begun.
