import { describe, expect, it } from 'vitest';

import type { Answers, Photo, Project } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
import { ALBUM_KINDS, THEMES, getTheme, recommendThemes, themesOfKind } from '@/layouts/themes';
import { OCCASIONS, getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

import { usedPhotoIds } from './edit';
import { generateAlbum } from './generate';
import { suggestedFormat, switchTheme } from './kinds';

const answers: Answers = { title: 'Our wedding', groups: ['couple'], participants: 2, names: [], children: false, mood: 'romantic', length: 'deluxe', mode: 'have-photos', extras: {} };
const photos: Photo[] = Array.from({ length: 20 }, (_, i) => {
  const [w, h] = [[4000, 3000], [3000, 4000], [3000, 3000]][i % 3];
  return { id: `ph${i}`, projectId: 'p', name: `${i}.jpg`, width: w, height: h, originalWidth: w, originalHeight: h, addedAt: i, order: i, favourite: false };
});
function project(themeId: Project['themeId']): Project {
  const o = getOccasion('wedding');
  const p: Project = { id: 'p', schemaVersion: 1, occasionId: o.id, answers, plan: buildPlan(o, answers), chapters: chaptersFor(o), themeId, format: suggestedFormat(themeId, o.id), step: 'album', createdAt: 0, updatedAt: 0 };
  return { ...p, album: generateAlbum({ project: p, photos, seed: 2 }) };
}

describe('two kinds of album', () => {
  it('puts every style in exactly one kind, with a real choice in each', () => {
    for (const k of ALBUM_KINDS) expect(themesOfKind(k.id).length).toBeGreaterThanOrEqual(4);
    expect(themesOfKind('photobook').length + themesOfKind('scrapbook').length).toBe(THEMES.length);
    expect(themesOfKind('photobook').map((t) => t.id)).toEqual(expect.arrayContaining(['gallery', 'graphic', 'brag']));
    expect(themesOfKind('scrapbook').map((t) => t.id)).toEqual(expect.arrayContaining(['scrapbook', 'polaroid']));
  });

  it('only suggests styles of the chosen kind, for every occasion', () => {
    for (const o of OCCASIONS)
      for (const k of ALBUM_KINDS) {
        const ranked = recommendThemes(o.themes, 'joyful', k.id);
        expect(ranked.length).toBe(themesOfKind(k.id).length);
        for (const id of ranked) expect(getTheme(id).kind).toBe(k.id);
      }
  });

  it('gives photo albums the occasion’s shape and scrapbooks their own', () => {
    expect(suggestedFormat('gallery', 'wedding')).toBe('square');
    expect(suggestedFormat('brag', 'wedding')).toBe('square');
    expect(suggestedFormat('scrapbook', 'wedding')).toBe('portrait');
    expect(suggestedFormat('polaroid', 'international-travel')).toBe('portrait');
  });

  it('keeps the pages when switching style within a kind', () => {
    const p = project('gallery');
    const next = switchTheme(p, 'graphic', photos);
    expect(next.format).toBe(p.format);
    expect(next.album!.pages.slice(1).map((pg) => pg.id)).toEqual(p.album!.pages.slice(1).map((pg) => pg.id));
  });

  it('redesigns the book, keeping every photo, when switching kind', () => {
    const p = project('gallery');
    const next = switchTheme(p, 'scrapbook', photos);
    expect(next.themeId).toBe('scrapbook');
    expect(next.format).toBe('portrait');
    expect(next.album!.format ?? 'portrait').toBe('portrait');
    expect(usedPhotoIds(next.album!)).toEqual(usedPhotoIds(p.album!));
    for (const pg of next.album!.pages) expect(getLayout(pg.layoutId).pro).toBeFalsy();
  });
});
