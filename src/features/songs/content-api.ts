import { z } from 'zod';
import { failure, type Result } from '../../domain/result';
export const contentId = z.uuid().transform((value) => value.toLowerCase());
export const contentRevision = z.number().int().min(0).max(2147483646);
export const contentTitle = z.string().trim().min(1).max(120);
export function contentError(error: unknown): Result<never> {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case '40001':
    case '23505':
      return failure(
        'CONFLICT',
        'A newer version exists. Your draft is still here. Reload the latest version and review it before saving again.',
      );
    case '23503': {
      const message =
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string'
          ? error.message
          : '';
      // Only our deliberately authored, bounded dependency messages reach the UI.
      return failure(
        'CONFLICT',
        /^(Song ".*" is referenced by presentations: |Presentation is used by services: )/.test(
          message,
        ) && message.length <= 2600
          ? message
          : 'This item is still referenced. Remove its references before deleting it.',
      );
    }
    case '42501':
    case 'PGRST116':
      return failure(
        'FORBIDDEN',
        'This item is unavailable or you no longer have permission to change it.',
      );
    case '28000':
    case 'PGRST301':
      return failure('UNAUTHENTICATED', 'Sign in with Google again to continue.');
    case '53000':
    case '53100':
      return failure(
        'CAPACITY',
        'The free document capacity is full. Your draft is still here. Ask the owner to free space.',
      );
    case 'P0001':
      return failure(
        'CAPACITY',
        'The write limit has been reached. Keep your draft and try again in a minute.',
      );
    case '22023':
    case '22003':
      return failure(
        'VALIDATION',
        'Check the words, slide count, dates and item order. Your draft has not been discarded.',
      );
    default:
      return failure(
        'NETWORK',
        'This change could not be confirmed. Keep your draft, check your connection and retry.',
      );
  }
}
export const invalidContent = () =>
  failure(
    'VALIDATION',
    'This content could not be verified. Check the fields or refresh before continuing.',
  );
