-- Replace the workspace-only prefix index with FK coverage for reservation lookups.
create index quota_reservations_workspace_media on private.quota_reservations(workspace_id,media_id);
drop index private.quota_reservations_workspace;
