# Church Presentation Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver the accepted first release for creating church slides and manually presenting them online or from a prepared offline copy, at zero service cost within enforced limits.

**Architecture:** React/TypeScript single-page app with a shared fixed-coordinate renderer, Supabase Auth/Postgres/private image storage, and a local operator/audience message channel. Browser persistence stores local video bytes and immutable prepared service snapshots; a versioned service worker supplies offline app/fonts. Cloudflare Pages Free hosts only the app and its assets.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Supabase, Figtree, React Router (declarative), Zod, idb, Lucide React; Vitest/Testing Library, Playwright, Supabase CLI/pgTAP. Add vite-plugin-pwa injectManifest and required Workbox modules in Task 8.

**Spec:** [Accepted design](../specs/2026-10-26-church-presentations-design.md), including its PRODUCT.md, DESIGN.md, PROJECT.md references. User accepted the full design/defaults on 2026-10-26.

**Status:** accepted; Native execution in progress. S01 is complete with evidence in docs/sprints/S01.md and the execution ledger. Later unchecked tasks remain future instructions, not evidence of passing checks. Applied migration filenames follow the actual server versions recorded in the ledger.

## Global Constraints

- “Zero running cost” is mandatory: no paid services, billing upgrades, purchased domain, commercial font, or paid API.
- “Google is the only initial login method.”
- “1920 × 1080 logical coordinates, 16:9 slides.”
- “First login, cloud editing, joining teams, and uncached downloads require internet.”
- “Offline editing is deferred.”
- “Only audience output produces standalone audio.”
- “Lyric updates preserve the same background media instance.”
- “No separate reviewer role or mandatory approval workflow.”
- “Videos remain local.”
- Cloud images: at most 5 MiB/file, 50 MiB/workspace, 500 MiB application total.
- Invitations: email-bound, single use, seven days; only the owner manages memberships/settings and ownership.
- Personal content stays private; current church membership and role are enforced server-side, including asset references and client-supplied IDs.
- Only the proposed data/behavior changes in this plan are in scope; respect the design exclusions. Keep sample/mockup content out of production.

## Review Focus

- Malformed imported documents or ambiguous media identities must fail validation before rendering/copying; Tasks 3 and 9 test unknown versions, duplicate IDs, hash/size mismatch, and unbounded input.
- Navigation away/account switching while saving or presenting must preserve drafts or stop explicitly; Tasks 1, 3, and 8 test pending save, cleanup failure, open audience windows, and cross-profile storage.
- A cached playable file with an expired cloud session must remain usable offline; Task 8 tests no signed-URL/OAuth dependency after restart.
- Quota reservation success followed by failed upload must release/reconcile capacity safely; Task 6 tests concurrent reservation, timeout, retry, orphan, and deletion accounting.
- Browser media/fullscreen policies and reconnect can change output unexpectedly; Task 7 tests blocked popup/play/fullscreen, safe late join, duplicated messages, and absence of doubled audio.

## Workspace and execution prerequisites

Observed 2026-10-26: Node v24.11.1, npm 11.6.2, Git executable present; repository not initialized. Docker/Supabase executables were not found on PATH; that is not a claim that no installations exist elsewhere.

1. Preserve all current planning documents and ignored companion files. Do not scaffold over the whole folder with an overwrite command.
2. At execution start inspect instructions/Git state. Initialize the primary repository if still absent; use the git-worktree skill if isolation is needed after initialization. Do not create a new checkout now.
3. Use Node 24.x; pin compatible package versions from official maintained sources and commit the lockfile. Recheck compatibility at execution; do not copy historical version guesses.
4. User-owned Google OAuth/Supabase/hosting/repository configuration is required for real integrations. Local UI work may proceed without it, but never substitute fake success or mark S01 complete.
5. Supabase CLI/pgTAP requires a usable container test runner; a hosted test database does not remove that dependency. Prefer a local disposable Supabase stack. A user-approved disposable Free project may support real OAuth/REST integration checks, but does not substitute for unexecuted SQL tests. Resolve runner availability before calling S01 complete. Do not install a container runtime, mutate production, create chargeable infrastructure, or reset remote church data merely to pass a check.
6. Define a verified local CLI test profile and database test connection before SQL integration work. If infrastructure is unavailable, keep affected acceptance open; unit mocks are not authorization evidence.

## File map and shared contracts

Each task lists exact owned files. Later sprints add their records/manifests when activated rather than creating placeholder trees now.

### Commands Task 1 must define

| Script | Definition/intent |
| --- | --- |
| npm run dev | vite --host 127.0.0.1 |
| npm run typecheck | tsc -b --pretty false |
| npm run lint | eslint . with project/config/generated exclusions |
| npm run test:unit -- PATH | vitest run PATH |
| npm run test:integration -- PATH | vitest run --config vitest.integration.config.ts PATH; isolated server/test environment |
| npm run test:e2e -- PATH | playwright test PATH |
| npm run test:db -- PATH | supabase test db PATH against selected disposable profile |
| npm run build | tsc -b && vite build |
| npm run preview | vite preview --host 127.0.0.1 --port 4173 |

Task 1 must run and verify these scripts when their environments exist. Missing environment is an explicit unmet check, not an expected PASS. Unit discovery excludes integration/e2e files; integration discovery excludes browser/component files. Playwright serves a production build for offline tests; it never uses the Vite development server as offline evidence. Keep local/test elevated credentials out of the Vite environment and browser bundle.

### Common TypeScript contracts

Task 1 creates src/domain/result.ts:

~~~ts
type ErrorCode = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT'
  | 'CAPACITY' | 'NOT_FOUND' | 'UNSUPPORTED' | 'STORAGE_UNAVAILABLE' | 'NETWORK';
type Result<T> = { ok: true; value: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
type Id = string; // UUID; validate at system boundaries.
~~~

Task 1 creates src/lib/device-session.ts. Its implementation starts with session-marker management and expands in Tasks 6/8; do not leave a silent no-op for real caches:

~~~ts
type DeviceSession = { profileId: Id; signedOut: boolean };
readDeviceSession(): Promise<DeviceSession | null>;
setDeviceSession(profileId: Id): Promise<void>;
purgeProfileData(profileId: Id): Promise<Result<void>>;
~~~

Task 3 creates src/domain/slide.ts and src/domain/deck.ts:

~~~ts
type SlideCategory = 'lyrics' | 'scripture' | 'sermon' | 'announcement' | 'welcome-closing';
type Rect = { x: number; y: number; width: number; height: number };
type TextElement = Rect & {
  id: Id; kind: 'text'; z: number; text: string; fontFamily: 'Figtree';
  fontSize: number; color: string; align: 'left' | 'center' | 'right';
};
type ImageElement = Rect & { id: Id; kind: 'image'; z: number; mediaId: Id; fit: 'contain' | 'cover' };
type SlideElement = TextElement | ImageElement;
type Slide = {
  id: Id; category: SlideCategory;
  background: { kind: 'solid'; color: string }
    | { kind: 'image' | 'video'; mediaId: Id };
  elements: SlideElement[];
  standaloneVideoId?: Id;
};
type DeckDocument = {
  schemaVersion: 1; id: Id; workspaceId: Id; title: string;
  width: 1920; height: 1080; slides: Slide[];
};
type SavedDeck = { document: DeckDocument; revision: number };
~~~

Layer list order is normalized by z then stable ID. Reject NaN/infinite/negative dimensions, duplicate IDs, unrecognized colors/fonts, mixed standalone/background video, foreign workspace references, and unknown schema versions. Preserve text as text, never inject HTML. Payload engineering limits: 200 slides/deck, 100 elements/slide, 20,000 characters/text element, 2 MiB UTF-8 serialized document; report validation failures without truncation. These are reviewed plan limits, not extra confirmed product features.

Task 5 creates src/domain/service.ts, consuming the media contracts declared in Task 3:

~~~ts
type ServicePlan = {
  id: Id; workspaceId: Id; title: string; date: string; revision: number;
  items: { id: Id; deckId: Id; label: string; position: number }[];
};
type ServiceSnapshot = {
  schemaVersion: 1; serviceId: Id; workspaceId: Id; sourceRevision: string;
  title: string; slides: Slide[]; media: MediaDescriptor[];
};
~~~

sourceRevision is a deterministic digest of service revision plus ordered deck/media revisions. The snapshot contains copied slide data, not pointers that trigger cloud fetches while presenting. Task 3 declares these media types in src/domain/media.ts; Task 6 supplies persistence/resolver implementation:

~~~ts
type MediaDescriptor = {
  id: Id; workspaceId: Id; kind: 'image' | 'video'; mime: string;
  bytes: number; sha256: string; revision: number;
  location: 'cloud' | 'local'; originalName: string;
};
type ResolvedMedia = { url: string; release(): void };
type MediaResolver = (id: Id) => Promise<Result<ResolvedMedia>>;
~~~

A cloud metadata record contains a workspace-bound object key, never a temporary signed URL as durable identity. Local identity is media ID plus hash/size, scoped to profile/workspace. Browser object URLs are transient views over persisted bytes.

Task 8 creates src/domain/prepared-service.ts:

~~~ts
type PreparedManifest = {
  schemaVersion: 1; packageId: Id; profileId: Id; workspaceId: Id;
  rendererVersion: 1; appBuild: string; sourceRevision: string;
  preparedAt: string; assetIds: Id[]; snapshot: ServiceSnapshot;
};
type Readiness =
  | { state: 'missing' | 'stale' | 'preparing' | 'failed'; issues: string[] }
  | { state: 'ready'; packageId: Id; verifiedAt: string };
~~~

Cloud access revisions cannot be freshly checked while offline; show “Prepared at …; online changes not checked” rather than pretending currency was verified. A locally corrupt or incomplete copy is never ready. Detect staleness against cloud when online and against locally known edits immediately.

## Task 1 — S01: Real Google sign-in, private workspace, and approved shell

**Files — create:** package.json, package-lock.json, index.html, tsconfig.json, tsconfig.app.json, tsconfig.node.json, vite.config.ts, eslint.config.js, vitest.config.ts, vitest.integration.config.ts, playwright.config.ts, .env.example; src/main.tsx, src/app/{router.tsx,AppShell.tsx,DashboardPage.tsx,LoadingScreen.tsx}, src/styles/{tokens.css,glass.css}, src/domain/result.ts, src/lib/{supabase.ts,device-session.ts}, src/features/auth/{auth-service.ts,AuthProvider.tsx,SignInPage.tsx,CallbackPage.tsx}, public/fonts/{Figtree.ttf,OFL.txt}; supabase/config.toml, supabase/migrations/202610260001_identity.sql, supabase/tests/S01_identity.test.sql; tests/sprints/S01/auth-shell.test.tsx, tests/integration/S01_identity.test.ts, tests/e2e/S01_auth-shell.spec.ts.
**Modify:** .gitignore, README.md, PROJECT.md, docs/testing.md, docs/sprints/S01.md, tests/sprints/S01/README.md.
**Produces:** common contracts, routes /auth, /auth/callback, /app, /app/w/:workspaceId; getSession(): Promise<Result<Session|null>>, signInWithGoogle(): Promise<Result<void>>, finishSignIn(): Promise<Result<ProfileWorkspace>>, signOut(): Promise<Result<void>>. Session is the official Supabase session type; ProfileWorkspace is { profileId: Id; workspaceId: Id; displayName: string; avatarUrl: string|null }.

- [ ] Initialize/preserve repository and configure the listed tools with compatible pinned versions. Copy licensed Figtree from the existing preview or official source; do not ship preview HTML/access keys. Add environment ignores and the safe command scripts above. Verify a minimal test runner before behavior work.
- [ ] Write failing auth/shell tests: repeat finishSignIn produces one profile/workspace; failed/cancelled login shows retry; no forced loading delay; navigation collapses and accessible names remain; narrow viewport shows a drawer; reduced transparency uses opaque surfaces; sign-out calls purgeProfileData before reporting completion.
- [ ] Write isolated SQL/integration tests first: Alice cannot read/update Bob's profile/private workspace; caller cannot set roles/owner IDs; repeat initialization is idempotent; unsupported provider/auth-null is rejected. Expected initial result: missing schema/functions, not passing on mocks.
- [ ] Implement identity schema: profiles(id UUID PK→auth.users, display_name TEXT, avatar_url TEXT nullable); workspaces(id UUID PK, kind TEXT personal/church, name TEXT, owner_id UUID→profiles, created_by UUID→profiles, timestamps); workspace_members(workspace_id,user_id composite PK/FKs, role owner/member). Unique personal workspace per owner and one created church per created_by (partial uniqueness); identity bootstrap only creates personal workspace. Index membership lookups and foreign keys.
- [ ] Implement authenticated initialization RPC ensure_personal_workspace() and owner/private RLS, with private membership helpers as needed. Derive identity from auth.uid(), never a caller-supplied user ID. Secure definer boundaries explicitly check callers, fix search_path, schema-qualify tables, and grant only necessary execution. UI role changes are not enough.
- [ ] Implement actual Supabase Google PKCE/callback flow and session cancellation/error/expiry. Import approved visual tokens/glass into React components, not the disposable preview script. Empty dashboard is truthful; no sample decks/counts/profiles masquerade as live data. Avoid requesting Google scopes beyond basic identity.
- [ ] Add operator/offline route placeholders only as honest unavailable states if linked; do not mark functionality complete. No auth redirect loop when session is missing; configuration errors explain required setup.
- [ ] Run typecheck/lint/build; test:unit on S01; test:db on S01 SQL; test:integration on S01; browser shell checks. Perform real OAuth success/cancel/sign-out with configured user-owned test identities before marking A01 complete. Inspect build for privileged/test credentials.
- [ ] Update S01 evidence, actual setup commands, and limits; commit the verified slice if Git identity is configured. Do not push/deploy without authorization.

## Task 2 — S02: Church workspace membership with real authorization

**Files — create:** src/features/workspaces/{workspace-service.ts,WorkspacePicker.tsx,TeamPage.tsx,AcceptInvitePage.tsx}; supabase/migrations/202610260002_teams.sql, supabase/functions/team-invites/index.ts, supabase/tests/S02_teams.test.sql; tests/sprints/S02/{README.md,teams.test.tsx}, tests/integration/S02_invitations.test.ts, tests/e2e/S02_teams.spec.ts, docs/sprints/S02.md.
**Modify:** router.tsx, AppShell.tsx, sprint ledger.
**Consumes:** Task 1 identity/session.
**Produces:** createChurch(name:string): Promise<Result<Id>>; inviteMember(workspaceId:Id,email:string): Promise<Result<{url:string;expiresAt:string}>>; acceptInvite(token:string): Promise<Result<Id>>; removeMember(workspaceId:Id,userId:Id): Promise<Result<void>>; transferOwner(workspaceId:Id,newOwnerId:Id): Promise<Result<void>>.

- [ ] Start S02 record and tests for personal/church switch, no automatic content copy, owner/member controls, mismatched/expired/revoked/used invites, two simultaneous accept calls, revoked member access, last-owner departure, and failed concurrent ownership transfer.
- [ ] Add invitations(id, workspace_id, normalized_email, token_hash, expires_at, accepted_at, revoked_at, created_by) with UUID/FK integrity and unique token hash; only store a cryptographic token digest. Create per-actor operation-budget rows/helper in private schema for server-enforced limits: church create one/account, invitations 10/hour, content writes 120/minute. Values live in one documented limits module and matching migration constants; test boundary counts.
- [ ] Implement team create/accept/remove/transfer as atomic server/database operations; verify the current Google user and verified email through trusted Auth/server state, not editable user metadata or request email. Lock owner/team rows on transfer. Do not permit raw membership mutations through the public client.
- [ ] Implement single-use seven-day links manually copied by owner; hide tokens from logs/referrers and clear them from the address after processing. Ignore unauthenticated invitation details until sign-in; no public member directory. Extend profile reads only through a teammate display-name/avatar projection for current members, without exposing another person's email or account data.
- [ ] Test through direct database/REST calls as owner/member/outsider, including forged workspace/user IDs and attempted role escalation. Run unit/SQL/integration/e2e plus Task 1 regression and build.
- [ ] Record evidence/limits and commit; no role or invite test is complete if it only checks button visibility.

## Task 3 — S03: Five template types, shared renderer, and safe saves

**Files — create:** src/domain/{slide.ts,deck.ts,media.ts,slide-schema.ts,limits.ts}, src/components/slide-renderer/{SlideRenderer.tsx,BackgroundLayer.tsx,media-context.ts}, src/features/decks/{deck-service.ts,templates.ts,DeckListPage.tsx,DeckEditorPage.tsx,TemplatePicker.tsx,SaveStatus.tsx}; supabase/migrations/202610260003_decks.sql, supabase/tests/S03_decks.test.sql; tests/support/deck-fixture.ts, tests/sprints/S03/{README.md,documents.test.ts,renderer.test.tsx}, tests/integration/S03_decks.test.ts, tests/e2e/S03_templates.spec.ts, docs/sprints/S03.md.
**Consumes:** Task 1/2 identity/workspaces; MediaDescriptor/ResolvedMedia/MediaResolver are declared now in src/domain/media.ts and consumed by media-context.ts; Task 6 supplies the real resolver (do not duplicate types).
**Produces:** contracts above; createDeck(workspaceId:Id,category:SlideCategory): Promise<Result<SavedDeck>>; getDeck(id:Id): Promise<Result<SavedDeck>>; saveDeck(document:DeckDocument,expectedRevision:number): Promise<Result<SavedDeck>>; duplicateDeck(id:Id,destinationWorkspaceId:Id): Promise<Result<SavedDeck>>; deleteDeck(id:Id): Promise<Result<void>>; validateDeck(input:unknown): Result<DeckDocument>; measureSlideOverflow(slide:Slide): string[]. Add /app/w/:workspaceId/decks and /app/w/:workspaceId/decks/:deckId.

- [ ] Write validation/renderer/save tests first. Each category survives save/reopen; CRLF/non-Latin/emoji/plain angle-bracket text stays text; invalid dimensions/IDs/unknown versions/overlimit documents reject; failed save retains draft; two same-revision saves yield one success and one CONFLICT; navigate-away warns about unsaved edits.
- [ ] Add decks(id,workspace_id,created_by,title,document JSONB,revision integer>0,source_song_id nullable added Task 5). Unique (workspace_id,id), indexed owner/workspace access. Atomic save RPC compares revision and verifies document IDs/workspace/dimensions/shape/limits server-side. Deny raw update paths that bypass validation/revision checks; bound document storage/writes to available capacity and return CAPACITY honestly.
- [ ] Implement the document contracts and fixtures; five templates use Figtree with a 1920×1080 stage, 96 px safe margin, and readable starting lyric size 72 logical px. Bible entry is manual and shows reference/translation inputs. All text uses explicit line breaks/pre-wrap, no browser-dependent auto text wrapping: wrapping decisions are committed to the document during editing.
- [ ] Render stage at fixed logical dimensions with one uniform transform; never recompute layout based on viewport or substitute fonts. Expose SlideRenderer({slide,resolveMedia,mode}) with mode editor/preview/audience. Keep background and text layers separately keyed. Media is honest missing/unavailable until Task 6.
- [ ] Add deck listing/create/reopen/duplicate/delete and visible saving/error/retry/conflict resolution. Conflict offers reload or save-a-copy; it does not silently overwrite. Server verifies cross-workspace copy destination and referenced assets; reject unsupported copies until Task 6 provides explicit asset-copy support.
- [ ] Browser-test identical element positions/line breaks at 1920×1080 and 1024×768 letterboxed output; missing Figtree is a readiness failure, not a silent substitute during presentation.
- [ ] Run unit/SQL/integration/e2e and build; update ledger/evidence and commit.

## Task 4 — S04: Freeform editor with reliable keyboard alternatives

**Files — create:** src/features/decks/editor/{EditorCanvas.tsx,SelectionOverlay.tsx,PropertiesPanel.tsx,SlideStrip.tsx,editor-reducer.ts,geometry.ts,history.ts}; tests/sprints/S04/{README.md,geometry.test.ts,history.test.ts,editor.test.tsx}, tests/e2e/S04_freeform.spec.ts, docs/sprints/S04.md.
**Modify:** DeckEditorPage.tsx, SlideRenderer.tsx (selection overlays outside the audience tree).
**Consumes:** DeckDocument/Slide/Rect and saveDeck.
**Produces:** reduceEditor(state:EditorState,command:EditorCommand): EditorState; moveElement(rect:Rect,delta:{x:number;y:number},bounds:{width:1920;height:1080}): Rect; resizeElement(rect:Rect,delta:{width:number;height:number},bounds:{width:1920;height:1080}): Rect. EditorCommand union: select/update-text/move/resize/align/reorder-layer/add-slide/duplicate-slide/delete-slide/reorder-slide/undo/redo. EditorState stores document, selected IDs, and history; gestures become one undo entry.

- [ ] Write failing tests for pointer-to-logical coordinates at zoom, keyboard 1 px/Shift+10 px movement, zero/negative dimensions, bounds clamping, undo/redo one gesture, duplicate fresh IDs, delete/reorder preserving content, overflow warnings, and text-input shortcuts not changing slides.
- [ ] Implement pointer capture for move/resize, selection handles, alignment guides, property controls, layer ordering and thumbnail ordering; native buttons provide move/reorder alternatives. Image insertion hooks to a media picker that stays unavailable until Task 6 rather than fake importing.
- [ ] Keep font/layout edits in the document; recalculate line breaks at explicit edit actions, not in projected output. Long unbreakable text triggers overflow warning rather than silent shrinking/truncation. Keep text editing undo distinct from slide-navigation shortcuts.
- [ ] Add history/revision-safe saving and unsaved-navigation guard; screen-reader instructions and visible focus for keyboard movement.
- [ ] Run unit/e2e at desktop and constrained widths, plus shared-renderer/save regressions, typecheck/lint/build. Complete image-placement acceptance when Task 6 lands; record that dependency instead of claiming full A03 prematurely.
- [ ] Update evidence/commit.

## Task 5 — S05: Songs, both lyric-entry methods, and reusable service plans

**Files — create:** src/domain/{song.ts,service.ts}, src/features/songs/{song-service.ts,SongLibraryPage.tsx,LyricsEntryDialog.tsx,split-lyrics.ts}, src/features/services/{service-service.ts,ServicePlanPage.tsx}; supabase/migrations/202610260004_songs_services.sql, supabase/tests/S05_services.test.sql; tests/sprints/S05/{README.md,lyrics.test.ts,service-copies.test.ts}, tests/integration/S05_services.test.ts, tests/e2e/S05_song-service.spec.ts, docs/sprints/S05.md.
**Modify:** router.tsx, deck-service.ts deletion/source-song integration, templates.ts.
**Consumes:** deck APIs/renderer/workspace permissions.
**Produces:** Song={id:Id,workspaceId:Id,title:string,lyrics:string,author:string|null,source:string|null,usageNotes:string|null,revision:number}; splitLyrics(text:string,maxLines:number,isLineOverflow?:(line:string)=>boolean): {text:string;overflow:boolean}[]; saveSong(song:Song,expectedRevision:number): Promise<Result<Song>>; addSongToService(songId:Id,serviceId:Id): Promise<Result<Id>> (new deck ID); saveService(plan:ServicePlan,expectedRevision:number): Promise<Result<ServicePlan>>; buildServiceSnapshot(serviceId:Id): Promise<Result<ServiceSnapshot>>.

- [ ] Write split/copy/order tests first, including:
~~~ts
expect(splitLyrics('First line\nSecond line\n\nThird line', 4).map(s => s.text))
  .toEqual(['First line\nSecond line', 'Third line']);
~~~
  Also assert CRLF normalization, empty input rejection, repeated chorus preservation, no word truncation, >maxLines splitting only at existing lines, and overflow for a line wider than safe area. UI passes font-ready measurement to isLineOverflow; omission defaults to no width warning for pure stanza splitting, not a fit guarantee.
- [ ] Add songs and service_plans revisioned/workspace-bound records; service_items has stable UUID, service_id/workspace_id/deck_id composite FKs and position with per-service ordering integrity. Add decks.source_song_id and use composite workspace-bound FK. Service copies own complete deck documents. Do not mutate song masters through service-edit UI.
- [ ] Implement paginated/searchable song library, source/usage labels, both entry methods with pre-insert break review and manual adjustments, explicit master update action, and service item reorder. Save/reorder service atomically with expected revision.
- [ ] Implement dependency-aware deletion: members delete only their created unreferenced decks; shared song/service/media deletion is owner-only. Server returns dependency descriptions, not a cascade deleting a service. Ownership transfer semantics remain Task 2.
- [ ] Build deterministic ordered snapshots with sourceRevision digests and detect stale prepared metadata through a notification hook added Task 8. Snapshot construction refuses unauthorized/missing dependencies.
- [ ] Run unit/SQL/integration/e2e, including master-vs-service independence and foreign workspace IDs; update/commit.

## Task 6 — S06: Persistent media, private images, and atomic capacity limits

**Files — create:** src/features/media/{media-service.ts,local-media-store.ts,decode-media.ts,MediaLibraryPage.tsx,MediaPicker.tsx}, src/lib/browser-db.ts; supabase/migrations/202610260005_media_quota.sql, supabase/functions/media-upload/index.ts, supabase/tests/S06_media.test.sql; tests/sprints/S06/{README.md,media.test.ts}, tests/integration/S06_quota-races.test.ts, tests/e2e/S06_local-media.spec.ts, docs/sprints/S06.md.
**Modify:** src/domain/media.ts validation as needed (retain Task 3 contracts), shared media context, device-session.ts, deck-service.ts/editor image picker, service snapshots.
**Produces:** importLocalMedia(file:File,workspaceId:Id): Promise<Result<MediaDescriptor>>; resolveMedia:MediaResolver; uploadImage(file:File,workspaceId:Id): Promise<Result<MediaDescriptor>>; copyMedia(mediaId:Id,destinationWorkspaceId:Id): Promise<Result<MediaDescriptor>>; deleteMedia(id:Id): Promise<Result<void>>; verifyMedia(id:Id): Promise<Result<MediaDescriptor>>.

- [ ] Write tests before implementation: JPEG/PNG/WebP decode; valid MP4/H.264/AAC playback target; corrupt/truncated/wrong-MIME failures; zero-length/oversize cloud image rejected; video never sent to cloud endpoint; another profile cannot resolve a local ID; import persists through browser reopen and URL recreation.
- [ ] Run bounded real-browser persistence/decode preflight using idb-backed Blob storage; record representative video sizes/read latency/memory and quota errors. Use IndexedDB as the initial adapter. If laptop-sized videos cannot persist/reopen acceptably, stop and revise the adapter to OPFS behind the same interfaces before scaling feature UI.
- [ ] Add media_assets with workspace-bound ID/kind/location/mime/size/hash/revision/object_key; deck_media relation enforces composite workspace FKs. Derive referenced media IDs from validated deck JSON inside the trusted save operation, not caller-supplied link arrays.
- [ ] Add quota_usage/quota_reservations and per-workspace usage with locked atomic counters/reservations. Reservations expire after 15 minutes. Owner/member permission and 5 MiB/file, 50 MiB/workspace, 500 MiB global still-image limits are checked before issuing an upload capability. Throttle uploads 30/hour/actor.
- [ ] Implement server-controlled private uploads; direct arbitrary Storage writes are denied. Use a signed upload capability only for an exact reserved object path, then verify bytes/MIME/hash/decode policy before finalizing. Invalid/expired uploads are never readable app assets; reclaim orphans/reservations, with retry-safe finalization and quota release. If hosted Storage cannot enforce the required bounded signed-upload behavior, proxy the bounded upload through the authenticated function instead. Test the chosen real path.
- [ ] Persist local media bytes in the profile/workspace store, decode before accepting, hash identity, revoke transient URLs on release. UI distinguishes local-only vs shared and supports missing-media reselect/relink; expose storage/quota failures with next actions.
- [ ] Implement explicit workspace copies, remapping media IDs; local bytes are copied/relinked locally, images reserve destination capacity. No silent sharing of a private object path. Deletion is owner/dependency-aware; reconcile object deletion/accounting without freeing quota while bytes remain.
- [ ] Connect freeform image insertion/resize and background/standalone selection to shared rendering. Extend purgeProfileData to remove/revoke local bytes/URLs plus any prepared data added later.
- [ ] Run SQL/integration quota races and failure/retry/orphan tests, component/e2e local restart/preview tests, renderer regressions, build. Record real browser video evidence; no mocks as playback proof. Update/commit.

## Task 7 — S07: Manual presenter and clean projector output

**Files — create:** src/features/presenter/{presenter-state.ts,presenter-channel.ts,OperatorPage.tsx,AudiencePage.tsx,VideoLayer.tsx}; tests/sprints/S07/{README.md,presenter-state.test.ts,channel.test.ts}, tests/e2e/S07_projector.spec.ts, docs/sprints/S07.md.
**Modify:** BackgroundLayer.tsx, router.tsx, service snapshot entry.
**Consumes:** immutable ServiceSnapshot, resolveMedia.
**Produces:** PresenterState={sessionId:Id,sequence:number,snapshot:ServiceSnapshot,index:number,blackout:boolean,standalone:{paused:boolean;volume:number;time:number}}; applyPresenterCommand(state:PresenterState,command:PresenterCommand):PresenterState; openAudience(sessionId:Id): Result<Window>; createPresenterChannel(sessionId:Id):{send(state:PresenterState):void;subscribe(callback:(state:PresenterState)=>void):()=>void;close():void}. PresenterCommand is a discriminated union: next/previous/jump(index:number)/blackout/restore/play/pause/volume(value:number)/seek(time:number). Use monotonic sequence and full state resync on join; reject stale/foreign-session messages.

- [ ] Write state tests: bounded first/last slide, manual controls only, repeated chorus jumps, shortcuts ignore inputs, same-song background identity survives text changes, standalone blackout pauses/mutes and restore stays paused.
- [ ] Write two-window browser tests: popup blocked produces recovery; new/late audience starts black, requests snapshot, and only displays after explicit send; closed audience signals operator; stale/duplicated/wrong-session messages do not regress output.
- [ ] Implement /present/:serviceId for online snapshots and /audience/:sessionId for local rendering; audience never fetches cloud independently or includes app shell/profile/toasts. Use BroadcastChannel scoped to unpredictable session ID on the same origin; do not use network Realtime. Open by click and offer clear manual projector/fullscreen instructions.
- [ ] Keep BackgroundLayer stable by mediaId while changing only text. On song/media change replace source intentionally. Operator/next previews remain muted; only audience standalone video can emit audio. Handle play/fullscreen promise rejection with an explicit user action; do not claim playback started.
- [ ] Test blackout/restore/background continuity via actual media time/progress, not merely DOM labels. Test audience-close/reopen and keyboard/manual controls; ensure navigation/sign-out stops the active session and revokes media URLs.
- [ ] Run state/e2e/build and record physical projector/audio check as pending if equipment is unavailable. Update/commit.

## Task 8 — S08: Truthful offline preparation and restart-safe playback

**Files — create:** src/domain/prepared-service.ts; src/features/offline/{prepare-service.ts,prepared-store.ts,readiness.ts,OfflineLibraryPage.tsx,OfflineServicePage.tsx,UpdatePrompt.tsx}, src/service-worker.ts; tests/sprints/S08/{README.md,readiness.test.ts,prepare-transaction.test.ts}, tests/e2e/S08_offline-restart.spec.ts, tests/e2e/S08_update-safety.spec.ts, docs/sprints/S08.md.
**Modify:** vite.config.ts, package.json/lockfile, router.tsx/auth boundary, device-session.ts, media resolver, AppShell.tsx, service/deck save notifications, presenter entry.
**Produces:** prepareService(serviceId:Id): Promise<Result<PreparedManifest>>; checkReadiness(packageId:Id): Promise<Readiness>; openPrepared(packageId:Id): Promise<Result<PreparedManifest>>; deletePrepared(packageId:Id): Promise<Result<void>>; requestAppUpdate(): Promise<Result<void>>. /offline and /offline/:packageId load before the cloud-auth gate using the previously prepared device profile.

- [ ] Write state/transaction tests for partial downloads, bad hashes, missing fonts/media/app assets, decode failure, quota denial, stale local edits, unknown renderer/schema, failed replacement retaining the prior complete copy, expired cloud session, and account switch/sign-out cleanup failure.
- [ ] Add bounded production-build preflight: prepare a service with actual fonts/image/video; disconnect; close/reopen browser to /offline; play without a Supabase/Google request. Validate production routing/service worker before building a full readiness UI.
- [ ] Implement idb snapshot manifest transaction plus persistent asset store and integrity checks. Preparation stages new assets, verifies complete playable content, then atomically promotes the manifest. Do not replace a good copy with a partial refresh. Reference-count assets across prepared services; deletion/sign-out safely release only appropriate data.
- [ ] Add vite-plugin-pwa injectManifest with explicit app/font precache, navigation fallback excluding OAuth/API routes, and no cached auth/API responses. Cache imported media through the media adapter; never depend on expired signed URLs. Service worker handles byte ranges for cached video if it serves them; Blob-backed playback may bypass fetch caching.
- [ ] Readiness checks app version compatibility, self-hosted font availability, all referenced bytes/hashes/decoding, and current known revisions. Online cloud pause/unavailability says “could not check updates,” while a previously verified complete copy remains playable. Missing/corrupt content is never ready.
- [ ] Defer activation/old-cache cleanup while any presenting client exists; new service-worker update is prompted, not automatic. Unknown/unresponsive client state defers safely. Preserve renderer/schema compatibility with stored packages and refuse unsupported future versions with recovery guidance.
- [ ] Keep offline routes independent of session refresh; show only the device-prepared profile. Explicit sign-out clears all app-managed prepared data for that profile and stops audience sessions. If cleanup fails, show the failure and prevent another profile from opening those caches; do not report successful cleanup.
- [ ] Automate persistent browser-context shutdown/relaunch with network disabled, partial/corrupt/media-quota scenarios, expired session and no API/OAuth calls, two-profile cleanup, update available during presenting, and prior snapshot recovery. Browser context offline toggling alone is not restart evidence.
- [ ] Run production-build offline e2e plus prior regressions; update/commit.

## Task 9 — S09: Portable metadata export/import and verified media relink

**Files — create:** src/features/transfer/{transfer-schema.ts,export-service.ts,import-service.ts,TransferDialog.tsx,RelinkMediaDialog.tsx}; tests/sprints/S09/{README.md,transfer.test.ts}, tests/integration/S09_import.test.ts, tests/e2e/S09_laptop-transfer.spec.ts, docs/sprints/S09.md.
**Modify:** service/media/offline UI, server import transaction in supabase/migrations/202610260006_import.sql, supabase/tests/S09_import.test.sql.
**Consumes:** document validation/service snapshot/media hashes.
**Produces:** exportServiceMetadata(serviceId:Id): Promise<Result<Blob>>; inspectTransfer(input:unknown): Result<TransferBundle>; importServiceMetadata(input:TransferBundle,destinationWorkspaceId:Id): Promise<Result<{serviceId:Id;missingMediaIds:Id[]}>>; relinkMedia(mediaId:Id,file:File): Promise<Result<void>>. TransferBundle={format:'church-service',version:1,snapshot:ServiceSnapshot}; export excludes credentials, tokens, signed URLs, private unrelated data, and media bytes.

- [ ] Test malformed/oversize/unknown-version packages, duplicate IDs, hostile text/filenames, forged workspace/owner IDs, unexpected signed URLs, and hash/size collisions. Import validates before writing; no HTML evaluation or automatic remote URL fetch.
- [ ] Implement metadata download plus plain instructions to transfer original media separately. Import remaps fresh cloud IDs atomically to the selected authorized workspace; copy content, not source ownership/membership. Required but absent local media is marked missing.
- [ ] Recompute media hash/size and verify decoding before relink; filename alone never matches. Import cannot update a master song or existing deck by forged ID.
- [ ] Test on two isolated browser data directories representing laptops: initial app/sign-in setup online, import metadata, missing assets block ready, correct files relink, prepare, then disconnected restart/playback. Record a physical second-device exercise in S10.
- [ ] Run unit/SQL/integration/e2e/build; document backup/restore instructions, evidence, and commit.

## Task 10 — S10: Rehearsal, accessibility, free-plan operations, and release

**Files — create:** docs/sprints/S10.md, tests/sprints/S10/README.md, docs/operations.md, docs/release-checklist.md, tests/e2e/S10_service-rehearsal.spec.ts, public/_headers (after checking hosting-compatible headers).
**Modify:** README.md/PROJECT.md/DESIGN.md as verified, sprint ledger; fix only observed defects in owning features.
**Consumes:** all earlier deliverables.
**Produces:** documented release candidate/build ID, acceptance matrix A01–A12 with evidence, and user-reviewed deployment checklist.

- [ ] Write full browser service rehearsal covering all five slide types, both lyric methods, shared/private isolation, image/freeform layout, local video, continuity, manual controls, blackout/audio, disconnect/restart, and recovery. Run against the production build with representative authorized fixtures.
- [ ] Run typecheck/lint/unit/SQL/integration/e2e/build, inspect production assets for demo/session/private credentials, and confirm test discovery. Record every unmet external or hardware check.
- [ ] Use break-ui on primary screens, final impeccable polish, and mobile-native checks only within the intended mobile browsing scope. Exercise long/non-Latin/missing data, keyboard, target sizes, reduced motion/transparency, blur fallback, composited contrast, and laptop glass/video performance. Do not redesign the approved direction.
- [ ] Conduct a physical laptop/projector service rehearsal from congregation distance, including actual audio routing, unsupported media recovery, network removal and browser restart, and second-laptop relink. Identify the cloud-account/backup owner and real supported browser versions.
- [ ] Document quota/capacity monitoring, pause restoration, database export/restore on free services, original-media backups, app cache cleanup, and owner transfer. Recheck provider limits and account billing settings; free caps apply to the shared application, not each church. No uptime/unlimited-use promise.
- [ ] Record user acceptance and concrete unresolved risks. Deploy only after explicit deployment authorization and provider setup; no purchase or billing upgrade. Preserve a known-good app release and offline service, apply compatible migrations, and verify deployed OAuth redirect/SPA/offline/media flows. Verify security headers allow required Supabase/Blob resources and block unnecessary framing/content execution.
- [ ] Mark Done only for accepted slices with evidence; final handoff lists live URL if actually deployed, known device/provider limits, backup ownership, and verified commands.

## Coverage and self-review

| Acceptance | Owning tasks |
| --- | --- |
| A01 | 1, 10 |
| A02 | 1–3, 5–6, 9–10 |
| A03 | 3–4, 6–7, 10 |
| A04 | 4–5, 10 |
| A05 | 3, 5, 10 |
| A06 | 6, 8, 10 |
| A07 | 7–8, 10 |
| A08 | 6, 8, 10 |
| A09 | 7, 10 |
| A10 | 1, 4, 7, 10 |
| A11 | 9–10 |
| A12 | 2, 6, 10 |

Planning self-review completed 2026-10-26: all twelve acceptance IDs map to tasks, each Review Focus item has an owning check, and shared type ownership/dependencies were corrected. Task 3 declares media contracts before Task 5 consumes them; Task 6 supplies the real resolver. This is a plan review, not evidence of executable test success. No independent subsystem requires a separate product plan: each slice serves the same prepare/present workflow. Keep the approved scope if refactoring task boundaries.

At every task: update its record/test map first; run a failing meaningful behavior test; implement the smallest complete slice; run the focused checks and required regressions; record evidence; commit if repository identity permits. Do not call a mock passing test proof of live integration. No task is complete while its critical acceptance is unverified.

## Sources and execution handoff

Primary documentation checked 2026-10-26: [Vite prerequisites](https://vite.dev/guide/), [Tailwind Vite plugin](https://tailwindcss.com/docs/installation/using-vite), [Supabase database functions](https://supabase.com/docs/guides/database/functions), [Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [idb](https://github.com/jakearchibald/idb), [React Router](https://reactrouter.com/start/declarative/installation), [Lucide React](https://lucide.dev/guide/react), [PWA injectManifest](https://vite-pwa-org.netlify.app/guide/inject-manifest), [Supabase CLI](https://supabase.com/docs/reference/cli/supabase-test-db). Recheck current package/license compatibility at installation.

**Recommended execution:** Native, one vertical slice at a time, because renderer/media/offline interfaces are tightly shared and external setup must be coordinated. This is a recommendation, not a selected method. An independent whole-change review is required before release. User may choose subagent-driven execution instead.

Next: user reviews this plan and chooses Native or subagent-driven execution. No product scaffolding/dependency installation begins during this planning turn.

