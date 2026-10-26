# Architecture and collaboration

Status: architecture direction accepted with the full design on 2026-10-26; detailed implementation plan awaits review/execution choice. No runtime/schema/cloud setup/deployment exists. [Product rules](PRODUCT.md) and [visual rules](DESIGN.md) have separate owners.

## Stack recommendation

React + TypeScript + Vite + Tailwind CSS, Supabase Auth/Postgres/limited private Storage, Cloudflare Pages Free with its provided address. React/Tailwind/Vite/VSCode/Supabase were requested; TypeScript, hosting, and backend shape are recommendations. Pin compatible supported versions and a lockfile during scaffolding. VSCode is the editor; Git and a shared repository are proposed for collaboration. This folder is not yet a Git repository.

Use Supabase's database/API/auth capabilities. Add small authenticated TypeScript Edge Functions only for operations requiring a server boundary, such as invitations/quota-controlled uploads, backed by atomic database transactions when needed. No separate Node server, queue, or conversion service.

## Data and trust boundaries

Proposed record groups: profiles; personal/church workspaces; memberships/invitations; songs; decks and ordered slide documents; service plans/items; media metadata. Exact tables/types/constraints/migrations belong to the detailed implementation plan after design acceptance. No SQL is being applied.

Every resource belongs to a workspace. Enforce personal ownership/church membership/roles with Postgres RLS, private Storage policies, and authenticated operations, including user-supplied IDs. Add relational integrity and indexes for membership/ownership paths. Prevent cross-workspace child/asset references and client-controlled privilege escalation. Elevated keys stay server-side.

Use a versioned validated slide document with stable element IDs, fixed coordinates, layers, and separate background media identity. One renderer serves editing, thumbnails, previews, and audience. Compare aggregate revisions on update. Local media metadata may sync; local video bytes never upload automatically.

## Browser/offline boundary

Service worker caches versioned app/fonts. A persistence adapter stores snapshots/manifests/imported media bytes using IndexedDB and/or OPFS, chosen after a measured feasibility check. Request persistent storage and estimate quota where available; neither guarantees retention after clearing or all eviction conditions.

Manifest includes app/schema version, snapshot revision, asset hashes/sizes, and readiness. Commit a prepared snapshot only when all content is stored/verified; interrupted refresh retains the previous complete snapshot. Keep renderer compatibility, and defer service-worker activation during a service. Do not cache OAuth responses or privileged credentials.

Operator and audience use a same-origin local message channel, not server Realtime for slide advancement. A late audience requests a full snapshot; lyric state and background identity stay separate. Physical projector/fullscreen/audio testing is required.

## Proposed source layout

- src/app/: routing, shell, loading/auth boundary.
- src/features/auth/, workspaces/, decks/, songs/, services/, media/, presenter/, offline/: feature-owned UI/service boundaries.
- src/domain/: versioned validated documents.
- src/components/slide-renderer/: shared rendering.
- src/lib/: Supabase/persistence adapters.
- public/fonts/: Figtree and OFL; public/: app manifest/assets.
- supabase/migrations/, supabase/functions/: versioned data/authorization operations.
- tests/: shared checks and per-sprint acceptance manifests.

Public build config: Supabase URL/publishable key. Google client secret, elevated keys, invitation secrets: provider/server settings only. Add an environment example with names only; ignore actual environment files/credential logs. Preview session keys remain ignored.

## Collaboration and operations

Initialize Git when development starts; use reviewable vertical slices and a repository review workflow once a destination is supplied. Update the sprint ledger with evidence. User owns Google/Supabase/hosting/repository accounts; document redirects/permissions before configuring them. No accounts have been created or connected.

Keep local disposable tests separate from church data; choose a test-project arrangement within free limits. Never reset church data for tests. Apply versioned migrations only with authorization. Before release, identify the owner for quota/inactivity checks, metadata and original-media backups, and restore rehearsal. Keep a known-good deployment/prepared service for recovery.

Sources checked 2026-10-26: [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Supabase pricing](https://supabase.com/pricing), [browser storage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Additional hosting/font sources are in the research notes.
