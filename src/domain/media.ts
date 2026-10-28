import type { Result } from './result';
import type {MediaAsset} from '../../supabase/functions/_shared/media-contract';
export type MediaDescriptor = MediaAsset;
export type ResolvedMedia = { url: string; release(): void };
export type MediaResolver = (id: string) => Promise<Result<ResolvedMedia>>;
