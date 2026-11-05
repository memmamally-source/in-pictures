import { describe, expect, it } from 'vitest';

import type { Answers, Photo, Project, ThemeId } from '@/domain/types';
import { getLayout, LAYOUTS, layoutsFor } from '@/layouts/layouts';
import { PAGE_H, PAGE_W } from '@/layouts/schema';
import { THEMES, recommendThemes } from '@/layouts/themes';
import { coverCrop, cropLoss, effectiveDpi, innerRect } from '@/render/geometry';
import { buildScene } from '@/render/scene';
import { fitText } from '@/render/text';
import { getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

import { addPage, applyTheme, changeLayout, movePage, placePhoto, removePage, shufflePage, unusedPhotos, usedPhotoIds } from './edit';
import { buildSections, formatDateRange, generateAlbum, paginate } from './generate';

const answers = (over: Partial<Answers> = {}): Answers => ({
  title: 'Honeymoon in Greece', location: 'Greece', group: 'couple', participants: 2, names: ['Anna', 'Ben'], children: false,
  mood: 'romantic', length: 'standard', mode: 'have-photos', extras: {}, ...over,
});

function project(over: Partial<Project> = {}): Project {
  const occasion = getOccasion('honeymoon');
  const a = over.answers ?? answers();
  return {
    id: 'proj_1', schemaVersion: 1, occasionId: occasion.id, answers: a, plan: buildPlan(occasion, a), chapters: chaptersFor(occasion),
    themeId: 'minimal', step: 'album', createdAt: 0, updatedAt: 0, ...over,
  };
}

/** Deterministic mix of landscape, portrait and square photos. */
function photos(n: number, over: (i: number) => Partial<Photo> = () => ({})): Photo[] {
  const shapes = [[4000, 3000], [3000, 4000], [4000, 3000], [3024, 4032], [3000, 3000], [4032, 2268]];
  return Array.from({ length: n }, (_, i) => {
    const [w, h] = shapes[i % shapes.length];
    return { id: `ph${i}`, projectId: 'proj_1', name: `IMG_${i}.jpg`, width: w, height: h, originalWidth: w, originalHeight: h, addedAt: i, order: i, favourite: false, ...over(i) };
  });
}

const measure = (text: string, font: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.5;

describe('layout library', () => {
  it('has well over 30 layouts covering every required kind', () => {
    expect(LAYOUTS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const n of [1, 2, 3, 4, 5, 6]) expect(layoutsFor('scrapbook', 'photos', n).length + layoutsFor('minimal', 'photos', n).length).toBeGreaterThan(1);
  });

  it('keeps every frame, caption and ornament on the page', () => {
    for (const l of LAYOUTS) {
      for (const r of [...l.photos, ...l.texts.filter((t) => !t.inFrame), ...(l.decor ?? [])]) {
        expect(r.x, l.id).toBeGreaterThanOrEqual(0);
        expect(r.y, l.id).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w, l.id).toBeLessThanOrEqual(PAGE_W + 0.01);
        expect(r.y + r.h, l.id).toBeLessThanOrEqual(PAGE_H + 0.01);
      }
      if (l.kind === 'photos') expect(l.photos.some((p) => p.hero), `${l.id} needs a hero slot`).toBe(true);
    }
  });

  it('gives every theme a cover, chapter, closing and a layout for 1–6 photos', () => {
    for (const t of THEMES) {
      for (const kind of ['cover', 'chapter', 'closing'] as const) expect(layoutsFor(t.id, kind).length, `${t.id} ${kind}`).toBeGreaterThan(0);
      for (let n = 1; n <= 6; n++) expect(layoutsFor(t.id, 'photos', n).length, `${t.id} ${n}`).toBeGreaterThan(0);
    }
  });

  it('makes themes genuinely different (exclusive layouts, fonts, frames)', () => {
    const exclusive = (id: ThemeId) => LAYOUTS.filter((l) => l.themes?.length && l.themes.includes(id) && l.themes.length <= 2).length;
    for (const t of THEMES) expect(exclusive(t.id), t.id).toBeGreaterThan(0);
    expect(new Set(THEMES.map((t) => `${t.fonts.title.family}|${t.frame}|${t.background}`)).size).toBe(6);
  });

  it('recommends themes from the occasion and mood', () => {
    expect(recommendThemes(['romantic', 'travel', 'minimal'], 'romantic')[0]).toBe('romantic');
    expect(recommendThemes(['travel', 'minimal'], 'adventurous')[0]).toBe('travel');
  });
});

describe('geometry', () => {
  it('crops to cover and respects the focal point', () => {
    expect(coverCrop(4 / 3, 4 / 3)).toEqual({ sx: 0, sy: 0, sw: 1, sh: 1 });
    const c = coverCrop(2, 1, { x: 0, y: 0.5, zoom: 1 });
    expect(c.sw).toBeCloseTo(0.5);
    expect(c.sx).toBe(0);
    const right = coverCrop(2, 1, { x: 1, y: 0.5, zoom: 1 });
    expect(right.sx).toBeCloseTo(0.5);
    const zoomed = coverCrop(1, 1, { x: 0.5, y: 0.5, zoom: 2 });
    expect(zoomed).toEqual({ sx: 0.25, sy: 0.25, sw: 0.5, sh: 0.5 });
  });

  it('measures crop loss and print resolution', () => {
    expect(cropLoss(1, 1)).toBe(0);
    expect(cropLoss(4 / 3, 3 / 4)).toBeCloseTo(0.4375);
    expect(effectiveDpi(3000, { sx: 0, sy: 0, sw: 1, sh: 1 }, 100)).toBe(375);
  });

  it('insets frames by style', () => {
    const box = { x: 0, y: 0, w: 50, h: 60 };
    expect(innerRect(box, 'none')).toEqual(box);
    const pol = innerRect(box, 'polaroid');
    expect(pol.y + pol.h).toBeLessThan(box.h - 8);
  });

  it('fits text by shrinking, then truncating', () => {
    const spec = { family: 'X', weight: 400, lineHeight: 1.2 };
    const short = fitText('Hello', spec, 5, { w: 50, h: 10 }, 2, measure);
    expect(short).toEqual({ lines: ['Hello'], size: 5 });
    const long = fitText('word '.repeat(80), spec, 5, { w: 40, h: 10 }, 2, measure);
    expect(long.lines.length).toBeLessThanOrEqual(2);
    expect(long.lines.at(-1)!.endsWith('…')).toBe(true);
  });
});

describe('sections', () => {
  it('groups by chapter / checklist prompt, keeping story order and the ending last', () => {
    const p = project();
    const items = Object.fromEntries(p.plan.map((i) => [i.shotId, i.id]));
    const tags = [{ planItemId: items['final-day'] }, { planItemId: items['first-view'] }, {}, { chapter: 'flavours' }, { planItemId: items['departure'] }];
    const ph = photos(10, (i) => tags[i % 5]);
    const s = buildSections(p, ph);
    // Unsorted photos (no dates) form one untitled run just before the ending.
    expect(s.map((x) => x.title)).toEqual(['Just married', 'Arriving', 'Long dinners', undefined, 'The last day']);
    expect(s.map((x) => x.photos.length)).toEqual([2, 2, 2, 2, 2]);
  });

  it('sorts unsorted photos into capture days and folds lone photos into neighbours', () => {
    const p = project();
    const first = p.plan.find((i) => i.shotId === 'first-view')!.id;
    const ph = photos(9, (i) => (i === 0 ? { planItemId: first, takenAt: '2026-06-01T09:00:00' } : { takenAt: `2026-06-0${i < 5 ? 1 : 2}T1${i}:00:00` }));
    const s = buildSections(p, ph);
    expect(s.map((x) => x.title)).toEqual(['Monday 1 June', 'Tuesday 2 June']);
    expect(s[0].photos.map((x) => x.id)).toContain('ph0');
  });

  it('falls back to capture days, then to a single section', () => {
    const p = project();
    const byDay = buildSections(p, photos(6, (i) => ({ takenAt: `2026-06-0${1 + Math.floor(i / 3)}T10:00:00` })));
    expect(byDay.map((s) => s.title)).toEqual(['Monday 1 June', 'Tuesday 2 June']);
    expect(buildSections(p, photos(5))).toHaveLength(1);
  });

  it('formats date ranges', () => {
    expect(formatDateRange('2026-06-01', '2026-06-08')).toBe('1–8 June 2026');
    expect(formatDateRange('2026-05-28', '2026-06-03')).toBe('28 May – 3 June 2026');
    expect(formatDateRange('2025-12-30', '2026-01-02')).toBe('30 Dec 2025 – 2 Jan 2026');
    expect(formatDateRange('2026-06-06')).toBe('6 June 2026');
  });
});

describe('album generation', () => {
  it('builds cover → pages → closing and uses every photo exactly once', () => {
    for (const theme of THEMES) {
      const ph = photos(37);
      const album = generateAlbum({ project: project({ themeId: theme.id }), photos: ph, seed: 1 });
      const kinds = album.pages.map((pg) => getLayout(pg.layoutId).kind);
      expect(kinds[0]).toBe('cover');
      expect(kinds.at(-1)).toBe('closing');
      const interiorIds = album.pages.slice(1).flatMap((pg) => pg.photos.map((s) => s.photoId));
      expect(new Set(interiorIds).size).toBe(interiorIds.length);
      expect(usedPhotoIds(album).size).toBe(37);
      for (const pg of album.pages) {
        const l = getLayout(pg.layoutId);
        expect(!l.themes || l.themes.includes(theme.id), `${theme.id} got ${l.id}`).toBe(true);
        expect(pg.photos).toHaveLength(l.photos.length);
      }
    }
  });

  it('is deterministic for a seed and varies with another seed', () => {
    const ph = photos(30);
    const strip = (a: ReturnType<typeof generateAlbum>) => a.pages.map((p) => [p.layoutId, p.photos.map((s) => s.photoId)]);
    const a = generateAlbum({ project: project(), photos: ph, seed: 7 });
    const b = generateAlbum({ project: project(), photos: ph, seed: 7 });
    const c = generateAlbum({ project: project(), photos: ph, seed: 8 });
    expect(strip(a)).toEqual(strip(b));
    expect(strip(a)).not.toEqual(strip(c));
  });

  it('mixes statement pages with collages and avoids repeating a layout back to back', () => {
    const album = generateAlbum({ project: project(), photos: photos(60), seed: 3 });
    const interior = album.pages.filter((p) => getLayout(p.layoutId).kind === 'photos');
    const counts = new Set(interior.map((p) => p.photos.length));
    expect(counts.size).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < interior.length; i++) expect(interior[i].layoutId === interior[i - 1].layoutId && interior[i].photos.length > 2).toBe(false);
  });

  it('respects album length: short albums are denser', () => {
    const ph = photos(48);
    const pagesFor = (length: Answers['length']) => generateAlbum({ project: project({ answers: answers({ length }) }), photos: ph, seed: 1 }).pages.length;
    expect(pagesFor('short')).toBeLessThan(pagesFor('standard'));
    expect(pagesFor('standard')).toBeLessThan(pagesFor('long'));
  });

  it('avoids heavy crops: every placed photo keeps most of its area', () => {
    const album = generateAlbum({ project: project(), photos: photos(40), seed: 2 });
    const byId = new Map(photos(40).map((p) => [p.id, p]));
    const theme = THEMES[0];
    for (const pg of album.pages) {
      const l = getLayout(pg.layoutId);
      pg.photos.forEach((s, i) => {
        const p = byId.get(s.photoId!)!;
        const r = innerRect(l.photos[i], l.photos[i].frame ?? theme.frame);
        expect(cropLoss(p.width / p.height, r.w / r.h), `${l.id}`).toBeLessThan(0.5);
      });
    }
  });

  it('only uses caption layouts when captions exist, and shows supplied captions', () => {
    const none = generateAlbum({ project: project(), photos: photos(20), seed: 1 });
    expect(none.pages.some((p) => getLayout(p.layoutId).captions === 'required')).toBe(false);
    const captioned = photos(12, (i) => (i < 3 ? { caption: `Caption ${i}` } : {}));
    const album = generateAlbum({ project: project(), photos: captioned, seed: 1 });
    const shown = album.pages.filter((pg) => {
      const l = getLayout(pg.layoutId);
      return pg.photos.some((s, i) => s.photoId && ['ph0', 'ph1', 'ph2'].includes(s.photoId) && l.texts.some((t) => t.photo === i));
    });
    expect(shown.length).toBeGreaterThan(0);
  });

  it('never invents text: only the user’s title, place, dates, names and note appear', () => {
    const album = generateAlbum({ project: project({ answers: answers({ closingNote: '' , names: [] }) }), photos: photos(4), seed: 1 });
    const texts = album.pages.flatMap((p) => Object.values(p.text)).filter(Boolean);
    expect(texts.sort()).toEqual(['Greece', 'Honeymoon in Greece', 'Honeymoon in Greece'].sort());
  });

  it('places favourites in large frames', () => {
    const ph = photos(30, (i) => ({ favourite: i === 13 }));
    const album = generateAlbum({ project: project(), photos: ph, seed: 5 });
    const page = album.pages.find((p) => p.photos.some((s) => s.photoId === 'ph13'))!;
    const l = getLayout(page.layoutId);
    const slot = page.photos.findIndex((s) => s.photoId === 'ph13');
    expect(l.photos.length === 1 || l.photos[slot].hero || l.kind !== 'photos').toBe(true);
  });

  it('uses chapter openers sparingly and only for real sections', () => {
    const p = project({ answers: answers({ length: 'short' }) });
    const ids = Object.fromEntries(p.plan.map((i) => [i.shotId, i.id]));
    const keys = ['departure', 'first-view', 'local-food', 'sunset', 'final-day'];
    const ph = photos(40, (i) => ({ planItemId: ids[keys[i % 5]] }));
    const album = generateAlbum({ project: p, photos: ph, seed: 1 });
    const chapters = album.pages.filter((pg) => getLayout(pg.layoutId).kind === 'chapter');
    expect(chapters.length).toBeGreaterThan(0);
    expect(chapters.length).toBeLessThanOrEqual(2);
    expect(generateAlbum({ project: project(), photos: photos(9), seed: 1 }).pages.some((pg) => getLayout(pg.layoutId).kind === 'chapter')).toBe(false);
  });

  it('handles tiny and empty albums', () => {
    expect(generateAlbum({ project: project(), photos: [], seed: 1 }).pages.length).toBe(2);
    const one = generateAlbum({ project: project(), photos: photos(1), seed: 1 });
    expect(one.pages.length).toBeGreaterThanOrEqual(2);
  });

  it('scales to large albums', () => {
    const t = performance.now();
    const album = generateAlbum({ project: project(), photos: photos(400), seed: 1 });
    expect(usedPhotoIds(album).size).toBe(400);
    expect(performance.now() - t).toBeLessThan(4000);
  });

  it('paginate covers every photo', () => {
    const ph = photos(17);
    const pages = paginate(ph, { themeId: 'polaroid', density: 2.5, rand: () => 0.5 });
    expect(pages.flatMap((p) => p.slots.map((s) => s.photoId)).sort()).toEqual(ph.map((p) => p.id).sort());
  });
});

describe('editing', () => {
  const ph = photos(20);
  const base = () => generateAlbum({ project: project(), photos: ph, seed: 1 });

  it('moves, adds and removes pages', () => {
    const a = base();
    const moved = movePage(a, 1, 2);
    expect(moved.pages[2].id).toBe(a.pages[1].id);
    const withPhotos = a.pages.findIndex((p, i) => i > 0 && p.photos.length > 0);
    const removed = removePage(a, withPhotos);
    expect(removed.pages).toHaveLength(a.pages.length - 1);
    expect(unusedPhotos(removed, ph).length).toBeGreaterThan(0);
    const added = addPage(removed, 0, 'p1-framed', ph);
    expect(added.pages[1].photos.every((s) => s.photoId)).toBe(true);
    expect(usedPhotoIds(added).size).toBeGreaterThan(usedPhotoIds(removed).size);
  });

  it('changes layout, keeping photos and returning extras to the tray', () => {
    const a = base();
    const idx = a.pages.findIndex((p) => p.photos.length >= 3);
    const smaller = changeLayout(a, idx, 'p1-framed', ph);
    expect(smaller.pages[idx].photos[0].photoId).toBe(a.pages[idx].photos[0].photoId);
    expect(unusedPhotos(smaller, ph).length).toBe(a.pages[idx].photos.length - 1 + unusedPhotos(a, ph).length);
  });

  it('places a photo by swapping so nothing is duplicated or lost', () => {
    const a = base();
    const p1 = a.pages[1].photos[0].photoId!;
    const lastIdx = a.pages.length - 2;
    const other = a.pages[lastIdx].photos[0].photoId!;
    const b = placePhoto(a, 1, 0, other);
    expect(b.pages[1].photos[0].photoId).toBe(other);
    expect(b.pages[lastIdx].photos[0].photoId).toBe(p1);
    expect(usedPhotoIds(b).size).toBe(usedPhotoIds(a).size);
  });

  it('shuffles a page to a different layout with the same photos', () => {
    const a = base();
    const idx = a.pages.findIndex((p) => p.photos.length >= 2 && getLayout(p.layoutId).kind === 'photos');
    const b = shufflePage(a, idx, ph, 'minimal');
    expect(b.pages[idx].layoutId).not.toBe(a.pages[idx].layoutId);
    expect([...b.pages[idx].photos.map((s) => s.photoId)].sort()).toEqual([...a.pages[idx].photos.map((s) => s.photoId)].sort());
  });

  it('re-themes without losing photos or text', () => {
    const a = generateAlbum({ project: project({ themeId: 'polaroid' }), photos: ph, seed: 1 });
    const b = applyTheme(a, 'heritage', ph);
    expect(usedPhotoIds(b)).toEqual(usedPhotoIds(a));
    for (const pg of b.pages) {
      const l = getLayout(pg.layoutId);
      expect(!l.themes || l.themes.includes('heritage'), l.id).toBe(true);
    }
    expect(b.pages[0].text).toEqual(a.pages[0].text);
  });
});

describe('scene', () => {
  it('builds the same display list for every theme without errors, including captions in polaroids', () => {
    const ph = photos(10, (i) => ({ caption: i === 0 ? 'Oia at dusk' : undefined }));
    const map = new Map(ph.map((p) => [p.id, p]));
    for (const theme of THEMES) {
      for (const layout of layoutsFor(theme.id)) {
        const page = { id: 'x', layoutId: layout.id, photos: layout.photos.map((_, i) => ({ photoId: ph[i].id })), text: { title: 'T', subtitle: 'S', heading: 'H', date: 'D', names: 'N', note: 'Note' } };
        const scene = buildScene({ page, theme, photos: map, measure });
        expect(scene.ops.filter((o) => o.t === 'frame')).toHaveLength(layout.photos.length);
        if (layout.texts.some((t) => t.inFrame)) expect(scene.ops.some((o) => o.t === 'text' && o.lines.join(' ') === 'Oia at dusk')).toBe(true);
      }
    }
  });
});
