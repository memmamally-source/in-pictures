import type { Album, BookFormat, Photo, Project, ThemeId } from '@/domain/types';
import { generateAlbum } from '@/engine/generate';
import { getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

import { DEMO_PHOTO_INFO, demoPhotoUrl } from './photos';

/**
 * The home-page example: a seaside summer laid out by the real album engine
 * in each style, using public-domain (CC0) photos from Wikimedia Commons.
 */

export const DEMO_PHOTOS: Photo[] = DEMO_PHOTO_INFO.map((x, i) => ({
  id: `demo-${x.name}`,
  projectId: 'demo',
  name: `${x.name}.jpg`,
  width: x.width,
  height: x.height,
  originalWidth: x.width * 3,
  originalHeight: x.height * 3,
  addedAt: i,
  order: i + 1,
  favourite: !!x.favourite,
  caption: x.caption,
  chapter: x.chapter,
}));

const IDS = new Set(DEMO_PHOTOS.map((p) => p.id));

export const demoSrc = (photoId: string): string | undefined => (IDS.has(photoId) ? demoPhotoUrl(photoId.slice(5)) : undefined);

export const DEMO_PHOTO_MAP = new Map(DEMO_PHOTOS.map((p) => [p.id, p]));

function demoProject(themeId: ThemeId, format: BookFormat): Project {
  const occasion = getOccasion('international-travel');
  const answers = {
    title: 'A Summer by the Sea', location: 'Seaside', startDate: '2026-07-04', endDate: '2026-07-11',
    groups: ['friends' as const], participants: 4, names: [], children: false, mood: 'joyful' as const, length: 'simple' as const, mode: 'have-photos' as const, extras: {},
  };
  return {
    id: 'demo', schemaVersion: 1, occasionId: occasion.id, answers, plan: buildPlan(occasion, answers), chapters: chaptersFor(occasion),
    themeId, format, step: 'album', createdAt: 0, updatedAt: 0, coverPhotoId: 'demo-harbour',
  };
}

const albums = new Map<string, Album>();

/** The example album in a style and shape (computed once each). */
export function demoAlbum(themeId: ThemeId, format: BookFormat = 'portrait'): Album {
  const key = `${themeId}:${format}`;
  let a = albums.get(key);
  if (!a) {
    a = generateAlbum({ project: demoProject(themeId, format), photos: DEMO_PHOTOS, seed: 4 });
    albums.set(key, a);
  }
  return a;
}
