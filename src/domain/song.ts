import type { Id } from './result';
export type Song = { id: Id; workspaceId: Id; title: string; lyrics: string; author: string | null; source: string | null; usageNotes: string | null; revision: number };
