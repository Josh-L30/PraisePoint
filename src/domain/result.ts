export type Id = string;
export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'CAPACITY'
  | 'NOT_FOUND'
  | 'UNSUPPORTED'
  | 'STORAGE_UNAVAILABLE'
  | 'NETWORK';
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: { code: ErrorCode; message: string } };
export function failure(code: ErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}
