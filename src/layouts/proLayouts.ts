import type { BookFormat } from '@/domain/types';

import { canvasSize, type DecorItem, type LayoutDef, type PhotoFrame, type Rect, type TextBox } from './schema';

/**
 * Professional photo-book layouts, generated for each book shape from a few
 * grid recipes, like the clean pages of a printed photo book: full-bleed
 * photos with hairline gutters, or a white border with even gaps, and
 * two-page spreads (including panoramas across the fold).
 *
 * Recipes describe splits as weights, so one recipe works for portrait,
 * landscape and square pages alike.
 */

type Split = { dir: 'row' | 'col'; weights: number[]; parts?: (Split | null)[] };

const GAP = 1.1; // hairline gutter between photos
const MARGIN = 6; // white-border family

function split(r: Rect, s: Split, gap: number): Rect[] {
  const total = s.weights.reduce((a, b) => a + b, 0);
  const size = s.dir === 'col' ? r.w : r.h;
  const free = size - gap * (s.weights.length - 1);
  const out: Rect[] = [];
  let at = s.dir === 'col' ? r.x : r.y;
  s.weights.forEach((w, i) => {
    const len = (free * w) / total;
    const cell = s.dir === 'col' ? { x: at, y: r.y, w: len, h: r.h } : { x: r.x, y: at, w: r.w, h: len };
    const sub = s.parts?.[i];
    out.push(...(sub ? split(cell, sub, gap) : [cell]));
    at += len + gap;
  });
  return out;
}

const col = (weights: number[], parts?: (Split | null)[]): Split => ({ dir: 'col', weights, parts });
const row = (weights: number[], parts?: (Split | null)[]): Split => ({ dir: 'row', weights, parts });

/** Single-page recipes, adapted to the page shape. */
function pageRecipes(f: BookFormat): { name: string; split: Split }[] {
  const wide = f === 'landscape';
  return [
    { name: 'one', split: row([1]) },
    { name: 'two', split: wide ? col([1, 1]) : row([1, 1]) },
    { name: 'two-alt', split: wide ? row([1, 1]) : col([1, 1]) },
    { name: 'hero-two', split: wide ? col([1.7, 1], [null, row([1, 1])]) : row([1.6, 1], [null, col([1, 1])]) },
    { name: 'three', split: wide ? col([1, 1, 1]) : row([1, 1, 1]) },
    { name: 'four', split: row([1, 1], [col([1, 1]), col([1, 1])]) },
    { name: 'hero-three', split: wide ? col([2, 1], [null, row([1, 1, 1])]) : row([1.8, 1], [null, col([1, 1, 1])]) },
    { name: 'five', split: row([1.3, 1], [col([1.5, 1]), col([1, 1, 1])]) },
    { name: 'six', split: wide ? row([1, 1], [col([1, 1, 1]), col([1, 1, 1])]) : row([1, 1, 1], [col([1, 1]), col([1, 1]), col([1, 1])]) },
  ];
}

/** Spread recipes (200 units wide). `fold` marks recipes whose photos cross the middle. */
function spreadRecipes(f: BookFormat): { name: string; split: Split; fold?: boolean }[] {
  const page = (s: Split | null) => s;
  return [
    { name: 'panorama', split: row([1]), fold: true },
    { name: 'pair', split: col([1, 1]) },
    { name: 'full-two', split: col([1, 1], [null, page(f === 'landscape' ? col([1, 1]) : row([1, 1]))]) },
    { name: 'full-hero-two', split: col([1, 1], [null, row([1.5, 1], [null, col([1, 1])])]) },
    { name: 'full-four', split: col([1, 1], [null, row([1, 1], [col([1, 1]), col([1, 1])])]) },
    { name: 'two-full', split: col([1, 1], [f === 'landscape' ? col([1, 1]) : row([1, 1]), null]) },
    { name: 'pano-top', split: row([1.6, 1], [null, col([1, 1, 1, 1])]), fold: true },
    { name: 'hero-two-four', split: col([1, 1], [row([1.5, 1], [null, col([1, 1])]), row([1, 1], [col([1, 1]), col([1, 1])])]) },
  ];
}

/** Keeps gutters on both sides of the fold for spreads that shouldn't cross it. */
function respectFold(rects: Rect[], gap: number): Rect[] {
  return rects.map((r) => {
    if (r.x < 100 && r.x + r.w > 100 && !(r.x <= 0.5 && r.x + r.w >= 199.5)) {
      // A cell straddling the fold by accident: pull it back to the larger side.
      return r.x + r.w / 2 < 100 ? { ...r, w: 100 - gap / 2 - r.x } : { ...r, w: r.x + r.w - 100 - gap / 2, x: 100 + gap / 2 };
    }
    return r;
  });
}

const frames = (rects: Rect[], bleed: boolean): PhotoFrame[] => {
  const biggest = rects.reduce((a, b, i) => (b.w * b.h > rects[a].w * rects[a].h ? i : a), 0);
  return rects.map((r, i) => ({ ...r, ...(bleed ? { frame: 'none' as const, shape: 'rect' as const } : {}), hero: i === biggest }));
};

function textBox(key: string, role: TextBox['role'], r: Rect, size: number, extra: Partial<TextBox> = {}): TextBox {
  return { key, role, ...r, size, align: 'center', ...extra };
}

function build(f: BookFormat): LayoutDef[] {
  const { h: H } = canvasSize(f);
  const out: LayoutDef[] = [];
  const formats: BookFormat[] = [f];
  const base = { pro: true, formats, texts: [] as TextBox[] };

  for (const recipe of pageRecipes(f)) {
    // Full-bleed with hairline gutters.
    const bleedRects = split({ x: 0, y: 0, w: 100, h: H }, recipe.split, GAP);
    out.push({ ...base, id: `pro-${f}-bleed-${recipe.name}`, name: `Edge to edge · ${bleedRects.length}`, kind: 'photos', bleed: true, photos: frames(bleedRects, true) });
    // White border with even gaps.
    const m = MARGIN;
    const whiteRects = split({ x: m, y: m, w: 100 - 2 * m, h: H - 2 * m }, recipe.split, 2);
    out.push({ ...base, id: `pro-${f}-white-${recipe.name}`, name: `White border · ${whiteRects.length}`, kind: 'photos', photos: frames(whiteRects, false) });
  }

  for (const recipe of spreadRecipes(f)) {
    const rects = split({ x: 0, y: 0, w: 200, h: H }, recipe.split, GAP);
    const fixed = recipe.fold ? rects : respectFold(rects, GAP);
    out.push({
      ...base,
      id: `pro-${f}-spread-${recipe.name}`,
      name: recipe.fold ? `Spread across the fold · ${fixed.length}` : `Spread · ${fixed.length}`,
      kind: 'photos',
      spread: true,
      bleed: true,
      weight: recipe.fold ? 1.05 : 1,
      photos: frames(fixed, true),
    });
  }

  // Covers.
  const titleSize = f === 'landscape' ? 7 : 8;
  out.push({
    ...base, id: `pro-${f}-cover-photo`, name: 'Photo cover', kind: 'cover', bleed: true,
    photos: [{ x: 0, y: 0, w: 100, h: H, frame: 'none', shape: 'rect', hero: true }],
    decor: [{ kind: 'shade-bottom', x: 0, y: H * 0.55, w: 100, h: H * 0.45 }],
    texts: [
      textBox('title', 'title', { x: 8, y: H - 26, w: 84, h: 14 }, titleSize, { color: 'onPhoto', maxLines: 2, align: 'left' }),
      textBox('subtitle', 'subtitle', { x: 8, y: H - 11, w: 84, h: 5 }, 2.6, { color: 'onPhoto', align: 'left' }),
    ],
  });
  out.push({
    ...base, id: `pro-${f}-cover-white`, name: 'Framed photo cover', kind: 'cover',
    photos: [{ x: 10, y: 10, w: 80, h: H - 34, hero: true }],
    texts: [
      textBox('title', 'title', { x: 8, y: H - 21, w: 84, h: 11 }, titleSize * 0.9, { maxLines: 1 }),
      textBox('subtitle', 'subtitle', { x: 8, y: H - 9.5, w: 84, h: 5 }, 2.6),
    ],
  });
  out.push({
    ...base, id: `pro-${f}-cover-poster`, name: 'Poster cover', kind: 'cover', poster: true, themes: ['graphic'],
    photos: [],
    decor: [{ kind: 'motif', x: 22, y: H * 0.38, w: 56, h: H * 0.5 }],
    texts: [
      textBox('title', 'title', { x: 7, y: 7, w: 86, h: H * 0.22 }, f === 'landscape' ? 14 : 17, { maxLines: 2, align: 'left' }),
      textBox('subtitle', 'subtitle', { x: 7, y: 7 + H * 0.23, w: 86, h: 7 }, 4.6, { align: 'left', color: 'ink' }),
      textBox('date', 'date', { x: 7, y: H - 11, w: 86, h: 5 }, 2.4, { align: 'left' }),
    ],
  });

  // Chapter openers.
  out.push({
    ...base, id: `pro-${f}-chapter-text`, name: 'Chapter title', kind: 'chapter', photos: [],
    decor: [{ kind: 'rule', x: 42, y: H / 2 + 10, w: 16, h: 2, color: 'accent' }],
    texts: [
      textBox('heading', 'heading', { x: 10, y: H / 2 - 10, w: 80, h: 16 }, 8, { maxLines: 2 }),
      textBox('date', 'date', { x: 10, y: H / 2 + 13, w: 80, h: 5 }, 2.6),
    ],
  });
  const wide = f === 'landscape';
  out.push({
    ...base, id: `pro-${f}-chapter-photo`, name: 'Chapter with photo', kind: 'chapter', bleed: true,
    photos: [wide ? { x: 0, y: 0, w: 55, h: H, frame: 'none', shape: 'rect', hero: true } : { x: 0, y: 0, w: 100, h: H * 0.6, frame: 'none', shape: 'rect', hero: true }],
    texts: wide
      ? [textBox('heading', 'heading', { x: 61, y: H / 2 - 12, w: 33, h: 20 }, 6.5, { align: 'left', maxLines: 3 }), textBox('date', 'date', { x: 61, y: H / 2 + 10, w: 33, h: 5 }, 2.4, { align: 'left' })]
      : [textBox('heading', 'heading', { x: 8, y: H * 0.68, w: 84, h: 14 }, 7.5, { maxLines: 2 }), textBox('date', 'date', { x: 8, y: H * 0.68 + 15, w: 84, h: 5 }, 2.6)],
  });

  // Closing pages.
  out.push({
    ...base, id: `pro-${f}-closing-text`, name: 'Closing words', kind: 'closing', photos: [],
    decor: [{ kind: 'rule', x: 42, y: H / 2 - 16, w: 16, h: 2, color: 'accent' }],
    texts: [
      textBox('title', 'title', { x: 10, y: H / 2 - 12, w: 80, h: 11 }, 6, { maxLines: 2 }),
      textBox('date', 'date', { x: 10, y: H / 2, w: 80, h: 5 }, 2.6),
      textBox('names', 'names', { x: 10, y: H / 2 + 6, w: 80, h: 6 }, 3.4),
      textBox('note', 'note', { x: 16, y: H / 2 + 14, w: 68, h: Math.min(24, H / 2 - 20) }, 3.6, { maxLines: 4 }),
    ],
  });
  out.push({
    ...base, id: `pro-${f}-closing-photo`, name: 'Closing photo', kind: 'closing',
    photos: [{ x: 14, y: 12, w: 72, h: H - 40, hero: true }],
    texts: [textBox('title', 'title', { x: 10, y: H - 25, w: 80, h: 9 }, 5, { maxLines: 1 }), textBox('date', 'date', { x: 10, y: H - 15, w: 80, h: 5 }, 2.6)],
  });

  return out;
}

export const PRO_LAYOUTS: LayoutDef[] = (['portrait', 'landscape', 'square'] as BookFormat[]).flatMap(build);

/** Decorations on spreads and non-portrait pages are positioned in portrait units; this maps them. */
export function scaleDecor(d: DecorItem, w: number, h: number): DecorItem {
  return { ...d, x: (d.x * w) / 100, w: (d.w * Math.min(w, 100)) / 100, y: (d.y * h) / 125, h: (d.h * Math.min(w, 100)) / 100 };
}
