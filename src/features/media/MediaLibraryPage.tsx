import { FilePicker } from '../../components/FilePicker';
import { Modal } from '../../components/Modal';
import { RelinkMediaDialog } from '../transfer/RelinkMediaDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Film, ImagePlus, Upload, FolderOpen } from 'lucide-react';
import type { MediaAsset } from '../../../supabase/functions/_shared/media-contract';
import type { Workspace } from '../workspaces/workspace-service';
import {
  createMediaService,
  type MediaService,
  type MediaUsage,
  type MediaManagement,
} from './media-service';
import { MediaThumbnail } from './MediaPicker';
import { useContentGuard } from '../songs/use-content-guard';
import type { Result } from '../../domain/result';
export function MediaLibraryPage({
  workspace,
  profileId,
  workspaces = [],
  service: provided,
}: {
  workspace: Workspace;
  profileId: string;
  workspaces?: Workspace[];
  service?: MediaService;
}) {
  const service = useMemo(() => provided ?? createMediaService(profileId), [provided, profileId]);
  const [usage, setUsage] = useState<MediaUsage | null>(null),
    [management, setManagement] = useState<MediaManagement[]>([]);
  const [items, setItems] = useState<MediaAsset[]>([]),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null),
    [location, setLocation] = useState<'local' | 'cloud'>('local'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [notice, setNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<MediaAsset | null>(null),
    [copying, setCopying] = useState<MediaAsset | null>(null),
    [destination, setDestination] = useState('');
  const input = useRef<HTMLInputElement>(null),
    working = useRef(false),
    mounted = useRef(true),
    guard = useContentGuard(!!file, busy);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      void service.list(workspace.id, page).then((result) => {
        if (!active) return;
        if (result.ok) {
          setItems(result.value.items);
          setMore(result.value.hasMore);
        } else {
          setItems([]);
          setError(result.error.message);
        }
        setLoading(false);
      });
    });
    return () => {
      active = false;
    };
  }, [workspace.id, page, version, service]);
  useEffect(() => {
    let active = true;
    void Promise.all([service.getUsage(workspace.id), service.getManagement(workspace.id)]).then(
      ([quota, pending]) => {
        if (!active) return;
        if (quota.ok) setUsage(quota.value);
        else {
          setUsage(null);
          setError(quota.error.message);
        }
        if (pending.ok) setManagement(pending.value);
        else {
          setManagement([]);
          setError(pending.error.message);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [workspace.id, version, service]);
  async function run<T>(
    operation: () => Promise<Result<T>>,
    success: string,
    onSuccess?: () => void,
  ) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await operation();
      if (!mounted.current) return;
      if (result.ok) {
        setNotice(success);
        onSuccess?.();
        setVersion((v) => v + 1);
      } else setError(result.error.message);
    } catch {
      if (mounted.current)
        setError(
          'This operation could not be confirmed. Keep the original and refresh before retrying.',
        );
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <div className="page-content media-library" aria-busy={busy}>
      <header className="page-heading">
        <div>
          <h1>Media library</h1>
          <p>Images and videos for your presentations.</p>
        </div>
      </header>
      {guard}
      {error && !deleting && !copying && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-message" role="status">
          {notice}
        </p>
      )}
      {usage && (
        <p className="media-usage-note">
          Cloud storage: {((usage.workspaceUsed + usage.workspaceReserved) / 1048576).toFixed(2)} /
          50 MiB · App total:{' '}
          {((usage.applicationUsed + usage.applicationReserved) / 1048576).toFixed(2)} / 500 MiB
        </p>
      )}
      <section className="glass content-editor media-import">
        <div>
          <h2>Import media</h2>
          <p>Keep videos on this laptop, or share still images with your workspace.</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (file)
              void run(
                () =>
                  location === 'cloud'
                    ? service.uploadImage(file, workspace.id)
                    : service.importLocalMedia(file, workspace.id),
                'Media imported.',
                () => {
                  setFile(null);
                  if (input.current) input.current.value = '';
                  setPage(0);
                },
              );
          }}
        >
          <FilePicker
            inputRef={input}
            label="Choose media file"
            filename={file?.name}
            hint="Images or worship videos"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            disabled={busy}
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              if (next?.type.startsWith('video/')) setLocation('local');
              setNotice(null);
              setError(null);
            }}
          />
          <fieldset disabled={busy} className="media-storage-choice">
            <legend>Save to</legend>
            <label>
              <input
                type="radio"
                name="media-location"
                checked={location === 'local'}
                onChange={() => setLocation('local')}
              />
              <FolderOpen size={17} />
              This laptop
            </label>
            <label>
              <input
                type="radio"
                name="media-location"
                checked={location === 'cloud'}
                disabled={file?.type.startsWith('video/')}
                onChange={() => setLocation('cloud')}
              />
              <Upload size={17} />
              Workspace cloud · images only
            </label>
          </fieldset>
          <details className="media-help">
            <summary>File limits & backup tips</summary>
            <p className="field-help">
              Images: JPEG, PNG or WebP, up to 5 MiB and 4 megapixels. Videos: MP4 or WebM, up to
              128 MiB; H.264/AAC MP4 is recommended. Keep the originals for backup and other
              laptops.
            </p>
          </details>
          <button className="button button-primary" disabled={!file || busy}>
            <ImagePlus size={17} />
            {busy ? 'Checking media…' : 'Import media'}
          </button>
        </form>
      </section>
      {loading ? (
        <p role="status">Loading media…</p>
      ) : !items.length ? (
        <section className="library-empty glass">
          <Film />
          <h2>No media yet</h2>
          <p>Choose an image or video above to get started.</p>
        </section>
      ) : (
        <div className="content-list">
          {items.map((asset) => (
            <article className="content-row glass media-row" key={asset.id}>
              <MediaThumbnail key={asset.id + ':' + version} asset={asset} service={service} />
              <div>
                <h2>{asset.originalName}</h2>
                <p>
                  {asset.kind === 'video' ? 'Video' : 'Still image'} ·{' '}
                  {(asset.bytes / 1024 / 1024).toFixed(2)} MiB ·{' '}
                  {asset.location === 'cloud' ? 'Workspace cloud' : 'This laptop'}
                </p>
                <RelinkMediaDialog
                  asset={asset}
                  busy={busy}
                  onSelect={(original) =>
                    void run(
                      () => service.relinkMedia(asset.id, original),
                      'Original file verified on this laptop.',
                    )
                  }
                />
              </div>
              <div className="action-row">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() => service.verifyMedia(asset.id), 'File verified on this laptop.')
                  }
                >
                  Verify file
                </button>
                {workspaces.length > 0 && (
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => {
                      setCopying(asset);
                      setDestination(
                        workspaces.find((w) => w.id !== workspace.id)?.id ?? workspace.id,
                      );
                    }}
                  >
                    Copy to workspace
                  </button>
                )}
                {workspace.role === 'owner' && (
                  <button
                    className="text-button text-button-danger"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setDeleting(asset);
                    }}
                  >
                    Delete media
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {(page > 0 || more) && (
        <nav className="library-pagination" aria-label="Media pages">
          <button
            className="button"
            disabled={busy || page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous page
          </button>
          <span>Page {page + 1}</span>
          <button className="button" disabled={busy || !more} onClick={() => setPage((p) => p + 1)}>
            Next page
          </button>
        </nav>
      )}
      <details className="glass content-editor media-maintenance" open={management.length > 0}>
        <summary>Upload recovery{management.length > 0 ? ' · ' + management.length : ''}</summary>
        <p>Retry interrupted uploads or reclaim attempts older than 15 minutes.</p>
        {management.map((item) => (
          <article className="media-unfinished" key={item.asset.id}>
            <h3>{item.asset.originalName}</h3>
            <p>
              {item.state === 'deleting'
                ? 'Deletion awaiting confirmation'
                : item.state === 'aborting'
                  ? 'Upload awaiting safe cleanup'
                  : 'Upload reserved'}
              {item.expiresAt ? ' · Expires ' + new Date(item.expiresAt).toLocaleString() : ''}
            </p>
            {item.state === 'uploading' && item.createdBy === profileId && (
              <div className="media-relink">
                <FilePicker
                  label="Retry with the exact original image"
                  hint="Retry original image"
                  accept={item.asset.mime}
                  disabled={busy}
                  onChange={(event) => {
                    const original = event.target.files?.[0];
                    if (original)
                      void run(() => service.retryImage(item.asset, original), 'Upload recovered.');
                    event.target.value = '';
                  }}
                />
              </div>
            )}
            {item.state === 'deleting' && workspace.role === 'owner' && (
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void run(() => service.deleteMedia(item.asset.id), 'Media deletion confirmed.')
                }
              >
                Resume media deletion
              </button>
            )}
          </article>
        ))}
        {management.length > 0 && <p className="field-help">Up to 25 recent attempts.</p>}
        <button
          className="button"
          disabled={busy}
          onClick={() =>
            void run(
              () => service.cleanupUploads(),
              'Expired uploads checked and safely reclaimed where possible.',
            )
          }
        >
          Reclaim expired uploads
        </button>
      </details>
      {deleting && (
        <Modal
          className="confirmation-panel"
          role="alertdialog"
          aria-labelledby="delete-media-heading"
          onCancel={() => setDeleting(null)}
          busy={busy}
        >
          <h2 id="delete-media-heading">Confirm Deletion</h2>
          <p>
            <strong>{deleting.originalName}</strong>
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p>
            This permanently deletes the file and its media record. If a presentation uses it,
            remove that reference first.
          </p>
          <div className="action-row">
            <button
              className="button button-danger"
              disabled={busy}
              onClick={() =>
                void run(
                  () => service.deleteMedia(deleting.id),
                  'Media deleted.',
                  () => setDeleting(null),
                )
              }
            >
              Confirm media deletion
            </button>
            <button className="button" disabled={busy} onClick={() => setDeleting(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {copying && (
        <Modal
          className="confirmation-panel"
          role="dialog"
          aria-labelledby="copy-media-heading"
          onCancel={() => setCopying(null)}
          busy={busy}
        >
          <h2 id="copy-media-heading">Copy {copying.originalName}</h2>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p>
            This creates independent media in the destination. Local files must be available on this
            laptop.
          </p>
          <label className="field-label">
            Destination workspace
            <select
              className="field-input"
              disabled={busy}
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <div className="action-row">
            <button
              className="button button-primary"
              disabled={busy || !destination}
              onClick={() =>
                void run(
                  () => service.copyMedia(copying.id, destination),
                  'Independent media copy created.',
                  () => setCopying(null),
                )
              }
            >
              Create media copy
            </button>
            <button className="button" disabled={busy} onClick={() => setCopying(null)}>
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
