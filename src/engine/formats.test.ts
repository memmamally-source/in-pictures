import { describe, expect, it } from 'vitest';

import type { Answers, BookFormat, Photo, Project } from '@/domain/types';
import { printPlan } from '@/export/quality';
import { ALL_LAYOUTS, getLayout, layoutsFor } from '@/layouts/layouts';
import { PRO_LAYOUTS } from '@/layouts/proLayouts';
import { canvasSize, unitsPerInch } from '@/layouts/schema';
import { THEMES } from '@/layouts/themes';
import { chooseMotif, fitPath, MOTIF_NAMES, motifParts } from '@/render/motifs';
import { buildScene } from '@/render/scene';
import { getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

import { bookViews, pageLabels } from './book';
import { applyTheme, usedPhotoIds } from './edit';
import { generateAlbum } from './generate';

const FORMATS: BookFormat[] = ['portrait', 'landscape', 'square'];
const measure = (text: string, font: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.5;

const answers = (over: Partial<Answers> = {}): Answers => ({
  title: 'Summer in Sicily', location: 'Sicily, Italy', groups: ['couple'], participants: 2, names: [], children: false, mood: 'joyful', length: 'deluxe', mode: 'have-photos', extras: {}, ...over,
});
function project(themeId: Project['themeId'], format: BookFormat): Project {
  const o = getOccasion('international-travel');
  const a = answers();
  return { id: 'p', schemaVersion: 1, occasionId: o.id, answers: a, plan: buildPlan(o, a), chapters: chaptersFor(o), themeId, format, step: 'album', createdAt: 0, updatedAt: 0 };
}
const photos = (n: number): Photo[] =>
  Array.from({ length: n }, (_, i) => {
    const [w, h] = [[4000, 3000], [3000, 4000], [4032, 2268], [3000, 3000]][i % 4];
    return { id: `ph${i}`, projectId: 'p', name: `${i}.jpg`, width: w, height: h, originalWidth: w, originalHeight: h, addedAt: i, order: i, favourite: false, takenAt: `2026-07-0${1 + Math.floor(i / 12)}T10:${String(i % 60).padStart(2, '0')}:00` };
  });

describe('book shapes', () => {
  it('gives every style a cover, chapter, closing and 1–6 photo pages in every shape', () => {
    for (const t of THEMES) for (const f of FORMATS) {
      for (const kind of ['cover', 'chapter', 'closing'] as const) expect(layoutsFor(t.id, kind, undefined, f).length, `${t.id}/${f}/${kind}`).toBeGreaterThan(0);
      for (let n = 1; n <= 6; n++) expect(layoutsFor(t.id, 'photos', n, f).filter((l) => !l.spread).length, `${t.id}/${f}/${n}`).toBeGreaterThan(0);
    }
  });

  it('keeps generated layouts on the page, with text 1/4 in inside the trim', () => {
    for (const l of PRO_LAYOUTS) {
      const f = l.formats![0];
      const { w, h } = canvasSize(f, l.spread);
      const safe = 0.25 * unitsPerInch(f);
      for (const r of [...l.photos, ...(l.decor ?? [])]) {
        expect(r.x, l.id).toBeGreaterThanOrEqual(-0.01);
        expect(r.y, l.id).toBeGreaterThanOrEqual(-0.01);
        expect(r.x + r.w, l.id).toBeLessThanOrEqual(w + 0.01);
        expect(r.y + r.h, l.id).toBeLessThanOrEqual(h + 0.01);
      }
      for (const t of l.texts) expect(t.x >= safe && t.y >= safe && t.x + t.w <= w - safe && t.y + t.h <= h - safe, `${l.id}/${t.key}`).toBe(true);
      if (l.kind === 'photos') expect(l.photos.filter((p) => p.hero)).toHaveLength(1);
    }
    expect(new Set(ALL_LAYOUTS.map((l) => l.id)).size).toBe(ALL_LAYOUTS.length);
  });

  it('designs professional albums with two-page spreads that always face each other', () => {
    for (const f of FORMATS) {
      const ph = photos(40);
      const album = generateAlbum({ project: project('gallery', f), photos: ph, seed: 2 });
      expect(album.format).toBe(f);
      const spreads = album.pages.filter((p) => getLayout(p.layoutId).spread);
      expect(spreads.length, f).toBeGreaterThan(0);
      // No spread is ever split by a lone page waiting for a partner.
      const views = bookViews(album.pages);
      views.slice(0, -1).forEach((v) => expect(v.left !== undefined && v.right === undefined, f).toBe(false));
      for (const pg of album.pages) {
        const l = getLayout(pg.layoutId);
        expect((l.formats ?? ['portrait']).includes(f), `${f}: ${l.id}`).toBe(true);
        expect(l.pro, l.id).toBe(true);
      }
      expect(usedPhotoIds(album).size).toBe(40);
    }
  });

  it('uses generated layouts for every style on landscape and square books', () => {
    const album = generateAlbum({ project: project('scrapbook', 'square'), photos: photos(20), seed: 1 });
    for (const pg of album.pages) expect(getLayout(pg.layoutId).formats).toEqual(['square']);
  });

  it('prints spreads as left and right pages, keeping them facing and the count even', () => {
    const album = generateAlbum({ project: project('gallery', 'landscape'), photos: photos(30), seed: 3 });
    const plan = printPlan(album, true);
    expect(plan.pages.length % 2).toBe(0);
    plan.pages.forEach((p, i) => {
      if (p?.half === 'left') {
        expect(i % 2, 'a spread starts on a left-hand page').toBe(1);
        expect(plan.pages[i + 1]).toEqual({ page: p.page, half: 'right' });
      }
    });
    const labels = pageLabels(album.pages);
    expect(labels[0]).toBe('Cover');
    expect(labels.some((l) => l.includes('–'))).toBe(true);
  });

  it('builds spread scenes 200 units wide', () => {
    const spread = PRO_LAYOUTS.find((l) => l.id === 'pro-landscape-spread-panorama')!;
    const scene = buildScene({ page: { id: 's', layoutId: spread.id, photos: [{ photoId: 'ph0' }], text: {} }, theme: THEMES.find((t) => t.id === 'gallery')!, photos: new Map(photos(1).map((p) => [p.id, p])), measure, format: 'landscape' });
    expect(scene.width).toBe(200);
    expect(scene.height).toBeCloseTo(77.27, 1);
  });
});

describe('poster covers (Bold Graphic)', () => {
  it('puts the place in big letters with an illustration that fits it', () => {
    const album = generateAlbum({ project: project('graphic', 'portrait'), photos: photos(20), seed: 1 });
    const cover = album.pages[0];
    expect(getLayout(cover.layoutId).poster).toBe(true);
    expect(cover.text.title).toBe('Sicily');
    expect(cover.text.subtitle).toBe('Travel');
    expect(cover.motif).toBe('lemon');
    expect(usedPhotoIds(album).size).toBe(20); // the cover photo isn't needed, so every photo is inside
  });

  it('chooses illustrations from the place, then the occasion', () => {
    expect(chooseMotif('international-travel', 'Lisbon')).toBe('tram');
    expect(chooseMotif('honeymoon', 'Bali')).toBe('palm');
    expect(chooseMotif('wedding')).toBe('rings');
    expect(chooseMotif('pets')).toBe('paw');
    for (const m of MOTIF_NAMES) expect(motifParts(m, { x: 0, y: 0, w: 50, h: 50 }).length).toBeGreaterThan(0);
  });

  it('scales illustration paths into place', () => {
    expect(fitPath('M0 0L100 100Z', { x: 10, y: 20, w: 50, h: 50 })).toBe('M10 20L60 70Z');
    expect(fitPath('M0 50A50 50 0 1 0 100 50', { x: 0, y: 0, w: 10, h: 10 })).toBe('M0 5A5 5 0 1 0 10 5');
  });

  it('switches cover type when the style changes', () => {
    const graphic = generateAlbum({ project: project('graphic', 'portrait'), photos: photos(12), seed: 1 });
    const gallery = applyTheme(graphic, 'gallery', photos(12));
    expect(getLayout(gallery.pages[0].layoutId).poster).toBeFalsy();
    expect(gallery.pages[0].photos[0].photoId).toBeTruthy();
    const back = applyTheme(gallery, 'graphic', photos(12), { posterText: { title: 'Sicily', subtitle: 'Travel', date: '' } });
    expect(getLayout(back.pages[0].layoutId).poster).toBe(true);
    expect(back.pages[0].text.title).toBe('Sicily');
  });
});
