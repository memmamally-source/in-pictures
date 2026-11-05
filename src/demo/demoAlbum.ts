import type { Album, BookFormat, Photo, Project, ThemeId } from '@/domain/types';
import { generateAlbum } from '@/engine/generate';
import { getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

import { sceneUrl, type DemoScene, type SceneKind } from './scenes';

/**
 * The home-page example: an imaginary seaside summer, laid out by the real
 * album engine in each style. Illustrations stand in for photos.
 */

const L = [800, 600] as const;
const P = [600, 800] as const;
const Q = [700, 700] as const;
const W = [960, 540] as const;

const SHOTS: [SceneKind, readonly [number, number], string, { caption?: string; favourite?: boolean }?][] = [
  ['village', P, 'arrival', { favourite: true }],
  ['harbour', L, 'arrival'],
  ['beach', W, 'exploring', { caption: 'First swim of the summer' }],
  ['palms', P, 'exploring'],
  ['mountains', L, 'exploring'],
  ['flowers', P, 'exploring'],
  ['table', Q, 'flavours'],
  ['lemons', Q, 'flavours'],
  ['cake', Q, 'flavours', { caption: 'Birthday cake by the sea' }],
  ['balloons', P, 'together'],
  ['ferris', L, 'together'],
  ['couple', L, 'together', { favourite: true }],
  ['night', P, 'last-day'],
  ['sea-sunset', L, 'last-day'],
];

export const DEMO_PHOTOS: Photo[] = SHOTS.map(([kind, [w, h], chapter, extra], i) => ({
  id: `demo-${kind}`,
  projectId: 'demo',
  name: `${kind}.svg`,
  width: w,
  height: h,
  originalWidth: w * 4,
  originalHeight: h * 4,
  addedAt: i,
  order: i + 1,
  favourite: !!extra?.favourite,
  caption: extra?.caption,
  chapter,
}));

const SCENES = new Map<string, DemoScene>(SHOTS.map(([kind, [w, h]]) => [`demo-${kind}`, { kind, width: w, height: h }]));

export const demoSrc = (photoId: string): string | undefined => {
  const s = SCENES.get(photoId);
  return s && sceneUrl(s);
};

export const DEMO_PHOTO_MAP = new Map(DEMO_PHOTOS.map((p) => [p.id, p]));

function demoProject(themeId: ThemeId, format: BookFormat): Project {
  const occasion = getOccasion('international-travel');
  const answers = {
    title: 'Summer on the Amalfi Coast', location: 'Amalfi Coast', startDate: '2026-07-04', endDate: '2026-07-11',
    groups: ['friends' as const], participants: 4, names: [], children: false, mood: 'joyful' as const, length: 'simple' as const, mode: 'have-photos' as const, extras: {},
  };
  return {
    id: 'demo', schemaVersion: 1, occasionId: occasion.id, answers, plan: buildPlan(occasion, answers), chapters: chaptersFor(occasion),
    themeId, format, step: 'album', createdAt: 0, updatedAt: 0, coverPhotoId: 'demo-village',
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
