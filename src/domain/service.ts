import type { Id } from './result';
import type { Slide } from './slide';
import type { MediaDescriptor } from './media';
export type ServiceItem = { id: Id; deckId: Id; label: string; position: number };
export type ServicePlan = {
  id: Id;
  workspaceId: Id;
  title: string;
  date: string | null;
  revision: number;
  items: ServiceItem[];
};
export type ServiceSection = {
  id: Id;
  deckId: Id;
  label: string;
  startIndex: number;
  slideCount: number;
  sourceSongId: Id | null;
};
export type ServiceSnapshot = {
  schemaVersion: 1;
  serviceId: Id;
  workspaceId: Id;
  sourceRevision: string;
  title: string;
  slides: Slide[];
  media: MediaDescriptor[];
  sections: ServiceSection[];
};
