# PraisePoint Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement all requested PraisePoint branding, compact UI, editing/import and owner deletion improvements without losing existing data or update protection.
**Architecture:** Reuse the React/Supabase architecture and media removal pipeline. Shared native portaled dialogs and file controls fix repeated UI issues; transactional staged deletion freezes workspace writes before private Storage cleanup.
**Tech Stack:** React 19, TypeScript, Vite 8, existing Tailwind/CSS, Supabase and Firebase Spark; no new dependencies.
**Spec:** docs/sprints/S11.md plus PRODUCT.md and DESIGN.md.

## Global Constraints

- Preserve Figtree/teal glass, Google-only auth, roles, 1920×1080 fixed slide layout, offline identities and zero-cost hosting.
- Only owners delete church workspaces; personal work is never included. Confirmation precedes deletion, bytes precede quota release, failed cleanup is resumable.
- No existing live church records or objects are deleted by QA. No billing, merge or push.

## Review Focus

- Dirty or saving editor during async sign-out: cancellation keeps content and update protection.
- Workspace deletion racing uploads/writes: pending uploads block deletion; frozen workspace rejects new writes; retries cannot free quota twice.
- Literal non-Latin lyrics and manual breaks: preserve exactly when imported/edited; master song unaffected.
- Focus and short viewports: dialogs remain centered/reachable, collapsed controls labelled and short-height navigation accessible.
- Missing originals/storage failures/fullscreen rejection: safe errors, retained retry state, no false deletion/readiness/fullscreen claim.

### Task 1: Shared dialog and file controls; compact PraisePoint shell
**Files:** create src/components/Modal.tsx, src/components/FilePicker.tsx, src/components/BrandMark.tsx, public/ccf-logo.svg; modify src/styles/glass.css, src/app/AppShell.tsx, src/features/auth/SignInPage.tsx, src/app/LoadingScreen.tsx, index.html, vite.config.ts and user-facing branding; tests/sprints/S11/ui-foundation.test.tsx.
**Interfaces:** Modal accepts standard labelled dialog props, onCancel and busy; useConfirmation returns confirm(options):Promise<boolean> and dialog; FilePicker preserves native input/ref/change contract; BrandMark uses a local mask.
- [x] Test modal focus/cancel/centering hooks and accessible filename control RED, implement GREEN.
- [x] Inspect official logo DOM asset, save locally with provenance, tint via CSS. Compact login/nav, avoid animated grid widths/backdrop blur during collapse.
- [x] Replace user-facing brand while retaining gather-* storage/database/protocol identities.

### Task 2: Consistent dialogs and asynchronous guards
**Files:** src/lib/navigation-guard.ts; src/features/songs/use-content-guard.tsx; all existing confirmation/lyrics/media/transfer panels; relevant S03/S06 guard tests and S11 dialog tests.
**Interfaces:** mayChangeAccount():Promise<boolean>; guard listeners collect asynchronous decisions but synchronously veto busy writes. Modal wraps existing forms/actions without changing data contracts.
- [x] Observe RED for async cancel/confirm and busy save protection; implement and update callers/tests.
- [x] Replace window.confirm for app actions, center existing dialogs; preserve browser beforeunload.
- [x] Fix service import spacing and convert media/transfer/relink file inputs to FilePicker.

### Task 3: Direct canvas text editing and fullscreen preview
**Files:** src/features/decks/editor/SelectionOverlay.tsx, EditorCanvas.tsx, src/features/decks/DeckEditorPage.tsx, DeckPreviewPage.tsx; tests/sprints/S11/inline-edit.test.tsx and native e2e.
**Interfaces:** Existing update-text/begin-gesture/end-gesture commands; move handle retains pointer geometry, arrows and cancellation. Preview Back icon/Fullscreen button labelled.
- [x] RED direct text input preserves words and single undo; move handle does not select/type; keyboard selection/deletion stays native while typing.
- [x] Implement minimal inline textarea and dedicated movement handle; preserve all existing gesture tests.
- [x] Add fullscreen request on user gesture, safe rejection and cleanup; remove unnecessary viewport limits and match unused background without changing aspect ratio.

### Task 4: Import song slide breaks into presentations
**Files:** create src/features/songs/SongPicker.tsx; modify LyricsEntryDialog.tsx, DeckEditorPage.tsx; tests/sprints/S11/song-import.test.tsx and e2e.
**Interfaces:** Existing SongService.list/get and new atomic append-lyrics editor command; picker returns saved Song and opens existing break review before applying.
- [x] RED search/select/review/import preserves manual/non-Latin breaks and independent master.
- [x] Implement picker/review wiring; verify cancellation leaves presentation unchanged and failures retain draft.

### Task 5: Staged owner workspace deletion and hosted media origins
**Files:** CLI-generated new supabase/migrations/*_workspace_deletion.sql; supabase/functions/_shared/media-contract.ts, media-handler.ts, supabase-media-backend.ts; src/features/workspaces/workspace-service.ts and TeamPage.tsx; local workspace cleanup helper; tests/sprints/S11/workspace-delete.test.ts, media handler tests and supabase/tests/S11_workspace_deletion.connector.sql.
**Interfaces:** workspace deletion_pending flag; begin_workspace_deletion(workspaceId,expectedName), workspace_deletion_batch(workspaceId), finish_workspace_deletion(workspaceId); Edge action begin-delete-workspace authorizes/freezes before local cleanup; delete-workspace processes a bounded batch using existing remove/finishDelete, returns complete:boolean for client retry; WorkspaceService.beginDeleteChurch(id,name) and deleteChurch(id,name):Result<void>.
- [x] RED backend order/authorization/name/pending leases/retry/storage failure/foreign CORS contracts.
- [x] Add migration with consistent global quota/document/workspace lock order, immutable deletion freeze triggers and explicit privileges. Begin deletes scoped records/references and marks media deleting; finish requires no media, storage bytes, reservations or quota before deleting workspace/memberships.
- [x] Extend handler/backend and exact Firebase origin allowlist; metadata deletion and quota use existing verified media_finish_delete. Bound batches/deadline and retain resume UI on failure.
- [x] Add centered owner confirmation; refresh/navigate to personal workspace only on confirmed completion, clean this device's workspace-local records/copies.
- [x] Apply/verify non-destructive migration through connected tools and rollback synthetic SQL tests; never delete real church data. Deploy backend only after its checks.

### Task 6: Integrated QA and handoff
**Files:** tests/e2e/S11_usability.spec.ts, existing regression fixtures, docs/evidence/S11*, docs/sprints/S11.md, DESIGN.md, PRODUCT.md and operations/setup references.
- [x] Run focused RED→GREEN native cases, then typecheck/lint/unit/full appropriate browser suite sequentially.
- [x] Apply impeccable polish once; use worst-case data, 320/720/1024/1440/1920 widths and 600/768-height checks, reduced motion, keyboard/touch and measured sidebar responsiveness.
- [x] Fresh read-only whole-branch review, one tested fix pass; no speculative redesign/repeated reviews.
- [x] Save reviewed build/source identity and honest local/live evidence; commit complete changes. Prepare release and verify public changes if deployment is authorized; preserve skipped physical acceptance and remaining limits.
