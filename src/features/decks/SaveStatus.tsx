import type { ErrorCode } from '../../domain/result';
export function SaveStatus({
  dirty,
  busy,
  error,
  revision,
}: {
  dirty: boolean;
  busy: boolean;
  error: { code: ErrorCode; message: string } | null;
  revision: number;
}) {
  return error ? (
    <p className="form-message form-error" role="alert">
      {error.message}
    </p>
  ) : (
    <p className="save-status" role="status">
      {busy
        ? 'Saving… Keep this tab open.'
        : dirty
          ? 'Unsaved changes · kept in this tab'
          : 'Saved · revision ' + revision}
    </p>
  );
}
