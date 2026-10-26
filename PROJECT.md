# Architecture and collaboration

Status: architecture and plan accepted; Native execution continues. S01–S03 identity/workspaces/invitations, the responsive glass shell and template slide editing/safe saves are verified. Real Google login/cancellation/logout is verified separately. No website deployment exists. [Product rules](PRODUCT.md) and [visual rules](DESIGN.md) have separate owners.

## Stack recommendation

React + TypeScript + Vite + Tailwind CSS, Supabase Auth/Postgres/limited private Storage, Cloudflare Pages Free with its provided address. The full stack direction was accepted with the design. Compatible versions are pinned in package.json/package-lock.json. VSCode is the editor. This folder is a Git repository on feat/church-workspace. Sprint commits and verification are recorded in the execution ledger. Remote repository and deployment remain pending.

Use Supabase's database/API/auth capabilities. S02/S03 use private transactional database bodies behind authenticated security-invoker wrappers for invitations, membership and document writes/capacity. Add small authenticated TypeScript Edge Functions only when an external service or upload-signing boundary requires one. No separate Node server, queue, or conversion service.

## Data and trust boundaries

Implemented record groups: profiles, personal/church workspaces, memberships/invitations, validated revisioned deck documents, private operation budgets and document capacity accounting. S01–S03 migrations are applied to the existing Supabase Free project. Later record groups: songs, service plans/items and media metadata; their schemas belong to their owning sprint.

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
