import type { Result } from './result';
export type MediaDescriptor = { id: string; workspaceId: string; kind: 'image' | 'video'; mime: string; bytes: number; sha256: string; revision: number; location: 'cloud' | 'local'; originalName: string };
export type ResolvedMedia = { url: string; release(): void };
export type MediaResolver = (id: string) => Promise<Result<ResolvedMedia>>;
