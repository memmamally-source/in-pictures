import type { ThemeId } from '@/domain/types';

import type { DecorItem, LayoutDef, PhotoFrame, TextBox } from './schema';

/**
 * The layout library (page units: 100 × 125). Layouts are shared between
 * themes wherever they suit them; style-specific compositions (scattered
 * polaroids, arches, stamps, mounts) are limited with `themes`.
 *
 * To add a layout: append an object here. Tests check every frame stays on
 * the page and every theme still has a layout for each photo count.
 */

const P = (x: number, y: number, w: number, h: number, extra: Partial<PhotoFrame> = {}): PhotoFrame => ({ x, y, w, h, ...extra });
const T = (key: string, role: TextBox['role'], x: number, y: number, w: number, h: number, size: number, extra: Partial<TextBox> = {}): TextBox => ({
  key, role, x, y, w, h, size, align: 'center', ...extra,
});
const D = (kind: DecorItem['kind'], x: number, y: number, w: number, h: number, extra: Partial<DecorItem> = {}): DecorItem => ({ kind, x, y, w, h, ...extra });
const cap = (photo: number, x: number, y: number, w: number, h: number, extra: Partial<TextBox> = {}) =>
  T(`caption${photo}`, 'caption', x, y, w, h, 3.4, { photo, maxLines: 3, ...extra });
const polaroidCap = (photo: number) => T(`caption${photo}`, 'caption', 0, 0, 0, 0, 3.6, { photo, inFrame: true, maxLines: 1 });

const SCRAP: ThemeId[] = ['scrapbook', 'polaroid'];
const NOT_SCRAP: ThemeId[] = ['minimal', 'romantic', 'travel', 'heritage'];

export const LAYOUTS: LayoutDef[] = [
  // ── Covers ────────────────────────────────────────────────
  {
    id: 'cover-bleed', name: 'Full-bleed cover', kind: 'cover', bleed: true, themes: ['minimal', 'travel', 'romantic'],
    photos: [P(0, 0, 100, 125, { frame: 'none', shape: 'rect', hero: true })],
    decor: [D('shade-bottom', 0, 70, 100, 55)],
    texts: [T('title', 'title', 8, 92, 84, 15, 8.5, { color: 'onPhoto', maxLines: 2 }), T('subtitle', 'subtitle', 8, 108, 84, 7, 3, { color: 'onPhoto' })],
  },
  {
    id: 'cover-framed', name: 'Framed cover', kind: 'cover',
    photos: [P(10, 10, 80, 82, { hero: true })],
    texts: [T('title', 'title', 8, 96, 84, 14, 8, { maxLines: 2 }), T('subtitle', 'subtitle', 8, 111, 84, 6, 3)],
  },
  {
    id: 'cover-editorial', name: 'Editorial cover', kind: 'cover', themes: ['minimal', 'travel', 'heritage'],
    photos: [P(0, 44, 100, 81, { frame: 'none', shape: 'rect', hero: true })],
    texts: [T('title', 'title', 8, 9, 84, 24, 10.5, { align: 'left', maxLines: 2 }), T('subtitle', 'subtitle', 8, 34, 84, 6, 3, { align: 'left' })],
    bleed: true,
  },
  {
    id: 'cover-polaroid', name: 'Polaroid cover', kind: 'cover', themes: SCRAP,
    photos: [P(15, 11, 70, 82, { frame: 'polaroid', rotate: -3, hero: true })],
    decor: [D('tape', 40, 7, 20, 7, { rotate: -5, over: true, color: 'accent' }), D('sparkle', 80, 90, 10, 10, { color: 'accent2' })],
    texts: [T('title', 'title', 8, 98, 84, 15, 8, { rotate: -1, maxLines: 2 }), T('subtitle', 'subtitle', 8, 113, 84, 6, 3)],
  },
  {
    id: 'cover-arch', name: 'Arched cover', kind: 'cover', themes: ['romantic'],
    photos: [P(20, 12, 60, 76, { shape: 'arch', frame: 'none', hero: true })],
    decor: [D('sprig', 6, 64, 22, 28, { color: 'accent', rotate: -12 }), D('sprig', 72, 64, 22, 28, { color: 'accent', rotate: 192 })],
    texts: [T('title', 'title', 8, 92, 84, 15, 8, { maxLines: 2 }), T('subtitle', 'subtitle', 8, 108, 84, 6, 3)],
  },
  {
    id: 'cover-stamp', name: 'Passport cover', kind: 'cover', themes: ['travel'],
    photos: [P(13, 34, 74, 74, { frame: 'stamp', rotate: 2, hero: true })],
    decor: [D('postmark', 60, 24, 34, 20, { color: 'accent', over: true, rotate: -8 }), D('airmail', 0, 0, 100, 3)],
    texts: [T('subtitle', 'subtitle', 8, 8, 84, 6, 3), T('title', 'title', 8, 14, 84, 16, 8.5, { maxLines: 2 }), T('date', 'date', 8, 113, 84, 6, 3)],
  },
  {
    id: 'cover-heritage', name: 'Mounted cover', kind: 'cover', themes: ['heritage'],
    photos: [P(19, 33, 62, 62, { frame: 'mount', hero: true })],
    decor: [D('double-border', 5, 5, 90, 115, { color: 'accent' }), D('flourish', 34, 99, 32, 5, { color: 'accent' })],
    texts: [T('title', 'title', 12, 12, 76, 16, 8, { maxLines: 2 }), T('subtitle', 'subtitle', 12, 106, 76, 6, 3)],
  },

  // ── Chapter openers ───────────────────────────────────────
  {
    id: 'chapter-centered', name: 'Chapter title', kind: 'chapter', photos: [],
    decor: [D('divider', 38, 77, 24, 4, { color: 'accent' })],
    texts: [T('date', 'date', 8, 50, 84, 5, 2.8), T('heading', 'heading', 10, 57, 80, 18, 9, { maxLines: 2 })],
  },
  {
    id: 'chapter-photo-top', name: 'Chapter with photo', kind: 'chapter',
    photos: [P(0, 0, 100, 74, { frame: 'none', shape: 'rect', hero: true })], bleed: true, themes: ['minimal', 'travel', 'romantic', 'polaroid'],
    texts: [T('heading', 'heading', 8, 82, 84, 16, 8.5, { maxLines: 2 }), T('date', 'date', 8, 100, 84, 5, 2.8)],
  },
  {
    id: 'chapter-side', name: 'Chapter, photo beside', kind: 'chapter', bleed: true, themes: ['minimal', 'travel', 'heritage'],
    photos: [P(0, 0, 54, 125, { frame: 'none', shape: 'rect', hero: true })],
    texts: [T('heading', 'heading', 59, 46, 35, 28, 7, { align: 'left', maxLines: 3 }), T('date', 'date', 59, 76, 35, 5, 2.6, { align: 'left' })],
  },
  {
    id: 'chapter-polaroid', name: 'Chapter polaroid', kind: 'chapter', themes: SCRAP,
    photos: [P(21, 14, 58, 68, { frame: 'polaroid', rotate: 3, hero: true })],
    decor: [D('tape', 42, 10, 16, 6, { rotate: 4, over: true, color: 'accent2' })],
    texts: [T('heading', 'heading', 8, 90, 84, 16, 8.5, { rotate: -1, maxLines: 2 }), T('date', 'date', 8, 107, 84, 5, 2.8)],
  },
  {
    id: 'chapter-arch', name: 'Chapter arch', kind: 'chapter', themes: ['romantic', 'heritage'],
    photos: [P(28, 14, 44, 58, { shape: 'arch', frame: 'none', hero: true })],
    decor: [D('flourish', 34, 102, 32, 5, { color: 'accent' })],
    texts: [T('heading', 'heading', 10, 80, 80, 16, 8, { maxLines: 2 }), T('date', 'date', 10, 96, 80, 5, 2.8)],
  },

  // ── One photo ─────────────────────────────────────────────
  { id: 'p1-bleed', name: 'Full page', kind: 'photos', bleed: true, themes: ['minimal', 'travel', 'romantic', 'polaroid'], weight: 0.8, photos: [P(0, 0, 100, 125, { frame: 'none', shape: 'rect', hero: true })], texts: [] },
  { id: 'p1-framed', name: 'Single framed', kind: 'photos', photos: [P(10, 12, 80, 101, { hero: true })], texts: [] },
  { id: 'p1-landscape', name: 'Single landscape', kind: 'photos', photos: [P(8, 31, 84, 63, { hero: true })], texts: [] },
  {
    id: 'p1-caption', name: 'Photo with caption', kind: 'photos', captions: 'required',
    photos: [P(10, 9, 80, 88, { hero: true })], texts: [cap(0, 10, 101, 80, 16, { size: 3.8 })],
  },
  {
    id: 'p1-story', name: 'Photo and story', kind: 'photos', captions: 'required', themes: NOT_SCRAP,
    photos: [P(0, 0, 100, 72, { frame: 'none', shape: 'rect', hero: true })], bleed: true,
    texts: [cap(0, 12, 80, 76, 36, { role: 'body', size: 4.2, maxLines: 6, align: 'left' })],
  },
  {
    id: 'p1-polaroid', name: 'Single polaroid', kind: 'photos', themes: SCRAP, captions: 'soft',
    photos: [P(13, 14, 74, 90, { frame: 'polaroid', rotate: -2, hero: true })],
    decor: [D('tape', 38, 10, 24, 7, { rotate: 3, over: true, color: 'accent' })],
    texts: [polaroidCap(0)],
  },
  {
    id: 'p1-arch', name: 'Single arch', kind: 'photos', themes: ['romantic'], captions: 'soft',
    photos: [P(16, 12, 68, 92, { shape: 'arch', frame: 'none', hero: true })],
    texts: [cap(0, 12, 108, 76, 10, { maxLines: 2 })],
  },
  {
    id: 'p1-stamp', name: 'Postcard', kind: 'photos', themes: ['travel'], captions: 'required',
    photos: [P(12, 14, 76, 74, { frame: 'stamp', rotate: -1.5, hero: true })],
    decor: [D('postmark', 62, 5, 30, 18, { color: 'accent', over: true, rotate: 10 })],
    texts: [cap(0, 12, 94, 76, 22, { size: 3.8, align: 'left', maxLines: 4 })],
  },

  { id: 'p1-gallery', name: 'Gallery white space', kind: 'photos', themes: ['minimal'], weight: 0.9, photos: [P(22, 24, 56, 72, { hero: true })], texts: [] },

  // ── Two photos ────────────────────────────────────────────
  { id: 'p2-stack', name: 'Two stacked', kind: 'photos', photos: [P(8, 8, 84, 53, { hero: true }), P(8, 64, 84, 53)], texts: [] },
  { id: 'p2-diagonal', name: 'Two on a diagonal', kind: 'photos', photos: [P(7, 7, 44, 58, { hero: true }), P(49, 60, 44, 58)], texts: [] },
  { id: 'p2-square-pair', name: 'Two squares', kind: 'photos', themes: ['minimal', 'travel', 'romantic', 'polaroid'], photos: [P(8, 8, 56, 56, { hero: true }), P(36, 61, 56, 56)], texts: [] },
  {
    id: 'p2-captions', name: 'Two with captions', kind: 'photos', captions: 'required',
    photos: [P(8, 7, 84, 47, { hero: true }), P(8, 64, 84, 47)],
    texts: [cap(0, 8, 55, 84, 7, { maxLines: 2 }), cap(1, 8, 112, 84, 7, { maxLines: 2 })],
  },
  {
    id: 'p2-overlap', name: 'Two overlapping', kind: 'photos', themes: SCRAP,
    photos: [P(6, 8, 60, 60, { rotate: -4, hero: true }), P(36, 54, 58, 60, { rotate: 4 })],
    decor: [D('tape', 50, 50, 16, 6, { rotate: 35, over: true, color: 'accent2' }), D('heart', 10, 104, 9, 9, { color: 'accent' })],
    texts: [],
  },
  {
    id: 'p2-polaroids', name: 'Two polaroids', kind: 'photos', themes: SCRAP, captions: 'soft',
    photos: [P(7, 8, 52, 62, { frame: 'polaroid', rotate: -5, hero: true }), P(41, 54, 52, 62, { frame: 'polaroid', rotate: 4 })],
    decor: [D('star', 70, 16, 10, 10, { color: 'accent' }), D('sparkle', 14, 92, 8, 8, { color: 'accent2' })],
    texts: [polaroidCap(0), polaroidCap(1)],
  },
  {
    id: 'p2-mounted', name: 'Two mounted', kind: 'photos', themes: ['heritage'],
    photos: [P(16, 10, 68, 49, { frame: 'mount', hero: true }), P(16, 66, 68, 49, { frame: 'mount' })],
    decor: [D('double-border', 5, 5, 90, 115, { color: 'accent' })], texts: [],
  },

  {
    id: 'p2-editorial', name: 'Editorial pair', kind: 'photos', themes: ['minimal'], bleed: true,
    photos: [P(0, 0, 60, 125, { frame: 'none', shape: 'rect', hero: true }), P(66, 72, 26, 35)], texts: [],
  },

  // ── Three photos ──────────────────────────────────────────
  { id: 'p3-hero-top', name: 'Large above, two below', kind: 'photos', photos: [P(8, 8, 84, 57, { hero: true }), P(8, 68, 41, 49), P(51, 68, 41, 49)], texts: [] },
  { id: 'p3-hero-bottom', name: 'Two above, large below', kind: 'photos', photos: [P(8, 8, 41, 49), P(51, 8, 41, 49), P(8, 60, 84, 57, { hero: true })], texts: [] },
  { id: 'p3-tall-left', name: 'Tall and two', kind: 'photos', themes: ['minimal', 'travel', 'heritage', 'romantic'], photos: [P(8, 8, 56, 109, { hero: true }), P(67, 8, 25, 53), P(67, 64, 25, 53)], texts: [] },
  {
    id: 'p3-scatter', name: 'Three scattered', kind: 'photos', themes: SCRAP,
    photos: [P(6, 6, 56, 42, { rotate: -4, hero: true }), P(38, 40, 56, 42, { rotate: 3 }), P(8, 76, 56, 42, { rotate: -2 })],
    decor: [D('tape', 26, 3, 16, 6, { rotate: -8, over: true, color: 'accent' }), D('heart', 78, 96, 10, 10, { color: 'accent2' })],
    texts: [],
  },
  {
    id: 'p3-strip', name: 'Photo-booth strip', kind: 'photos', themes: SCRAP, weight: 0.9,
    photos: [P(33, 11, 34, 33, { frame: 'none', shape: 'rect' }), P(33, 47, 34, 33, { frame: 'none', shape: 'rect', hero: true }), P(33, 83, 34, 33, { frame: 'none', shape: 'rect' })],
    decor: [D('strip', 30, 7, 40, 113, { color: 'mat' }), D('sparkle', 12, 20, 10, 10, { color: 'accent' }), D('star', 78, 96, 10, 10, { color: 'accent2' })],
    texts: [],
  },
  {
    id: 'p3-polaroids', name: 'Three polaroids', kind: 'photos', themes: ['polaroid'], captions: 'soft',
    photos: [P(5, 5, 46, 54, { frame: 'polaroid', rotate: -6, hero: true }), P(49, 18, 46, 54, { frame: 'polaroid', rotate: 5 }), P(22, 66, 46, 54, { frame: 'polaroid', rotate: -2 })],
    texts: [polaroidCap(0), polaroidCap(1), polaroidCap(2)],
  },
  {
    id: 'p3-arch-hero', name: 'Arch and two', kind: 'photos', themes: ['romantic'],
    photos: [P(22, 7, 56, 68, { shape: 'arch', frame: 'none', hero: true }), P(8, 80, 41, 37), P(51, 80, 41, 37)], texts: [],
  },
  {
    id: 'p3-mounted', name: 'Three mounted', kind: 'photos', themes: ['heritage'],
    photos: [P(14, 10, 72, 50, { frame: 'mount', hero: true }), P(14, 66, 34, 48, { frame: 'mount' }), P(52, 66, 34, 48, { frame: 'mount' })],
    decor: [D('double-border', 5, 5, 90, 115, { color: 'accent' })], texts: [],
  },

  { id: 'p3-editorial-row', name: 'Editorial row', kind: 'photos', themes: ['minimal'], photos: [P(8, 40, 27, 40), P(36.5, 40, 27, 40, { hero: true }), P(65, 40, 27, 40)], texts: [] },

  // ── Four photos ───────────────────────────────────────────
  { id: 'p4-grid', name: 'Four grid', kind: 'photos', photos: [P(8, 8, 41, 53, { hero: true }), P(51, 8, 41, 53), P(8, 64, 41, 53), P(51, 64, 41, 53)], texts: [] },
  { id: 'p4-hero-top', name: 'Large and three', kind: 'photos', photos: [P(8, 8, 84, 63, { hero: true }), P(8, 74, 26, 43), P(37, 74, 26, 43), P(66, 74, 26, 43)], texts: [] },
  { id: 'p4-hero-left', name: 'Tall and three', kind: 'photos', themes: NOT_SCRAP, photos: [P(8, 8, 56, 109, { hero: true }), P(67, 8, 25, 35), P(67, 45, 25, 35), P(67, 82, 25, 35)], texts: [] },
  { id: 'p4-mosaic', name: 'Four mosaic', kind: 'photos', photos: [P(8, 8, 52, 60, { hero: true }), P(63, 8, 29, 60), P(8, 71, 32, 46), P(43, 71, 49, 46)], texts: [] },
  {
    id: 'p4-polaroids', name: 'Four polaroids', kind: 'photos', themes: SCRAP, captions: 'soft',
    photos: [
      P(5, 5, 44, 53, { frame: 'polaroid', rotate: -5, hero: true }), P(51, 7, 44, 53, { frame: 'polaroid', rotate: 4 }),
      P(4, 64, 44, 53, { frame: 'polaroid', rotate: 3 }), P(51, 66, 44, 53, { frame: 'polaroid', rotate: -3 }),
    ],
    texts: [polaroidCap(0), polaroidCap(1), polaroidCap(2), polaroidCap(3)],
  },

  // ── Five photos ───────────────────────────────────────────
  { id: 'p5-hero', name: 'Large and four', kind: 'photos', photos: [P(8, 8, 84, 56, { hero: true }), P(8, 67, 41, 24), P(51, 67, 41, 24), P(8, 93, 41, 24), P(51, 93, 41, 24)], texts: [] },
  { id: 'p5-mosaic', name: 'Five mosaic', kind: 'photos', photos: [P(8, 8, 52, 60, { hero: true }), P(63, 8, 29, 28.5), P(63, 39.5, 29, 28.5), P(8, 71, 32, 46), P(43, 71, 49, 46)], texts: [] },
  {
    id: 'p5-scatter', name: 'Five scattered', kind: 'photos', themes: SCRAP,
    photos: [P(5, 5, 50, 38, { rotate: -4, hero: true }), P(50, 8, 44, 34, { rotate: 5 }), P(8, 44, 40, 34, { rotate: 3 }), P(46, 44, 48, 38, { rotate: -3 }), P(18, 82, 56, 38, { rotate: 2 })],
    decor: [D('tape', 64, 4, 14, 5, { rotate: 20, over: true, color: 'accent2' }), D('heart', 82, 100, 9, 9, { color: 'accent' })],
    texts: [],
  },

  // ── Six photos ────────────────────────────────────────────
  { id: 'p6-grid', name: 'Six grid', kind: 'photos', photos: [0, 1, 2].flatMap((r) => [P(8, 8 + r * 37, 41, 34, r === 0 ? { hero: true } : {}), P(51, 8 + r * 37, 41, 34)]), texts: [] },
  { id: 'p6-hero', name: 'Large and five', kind: 'photos', themes: ['minimal', 'travel', 'romantic', 'polaroid', 'scrapbook'], photos: [P(8, 8, 84, 50, { hero: true }), P(8, 61, 26, 27), P(37, 61, 26, 27), P(66, 61, 26, 27), P(8, 91, 41, 26), P(51, 91, 41, 26)], texts: [] },
  {
    id: 'p6-polaroids', name: 'Six polaroids', kind: 'photos', themes: SCRAP,
    photos: [0, 1, 2].flatMap((r) => [
      P(7, 4 + r * 39, 40, 40, { frame: 'polaroid', rotate: r % 2 ? 3 : -3, hero: r === 0 }),
      P(53, 6 + r * 39, 40, 40, { frame: 'polaroid', rotate: r % 2 ? -4 : 4 }),
    ]),
    texts: [],
  },

  // ── Closing ───────────────────────────────────────────────
  {
    id: 'closing-text', name: 'Closing words', kind: 'closing', photos: [],
    decor: [D('divider', 38, 46, 24, 4, { color: 'accent' })],
    texts: [
      T('title', 'title', 10, 53, 80, 13, 7, { maxLines: 2 }), T('date', 'date', 10, 67, 80, 5, 2.8),
      T('names', 'names', 10, 74, 80, 6, 3.6), T('note', 'note', 14, 86, 72, 26, 4, { maxLines: 5 }),
    ],
  },
  {
    id: 'closing-photo', name: 'Closing photo', kind: 'closing',
    photos: [P(16, 12, 68, 72, { hero: true })],
    texts: [T('title', 'title', 10, 91, 80, 10, 6, { maxLines: 1 }), T('date', 'date', 10, 102, 80, 5, 2.8), T('note', 'note', 12, 109, 76, 10, 3.4, { maxLines: 2 })],
  },
];

export const LAYOUT_BY_ID: Record<string, LayoutDef> = Object.fromEntries(LAYOUTS.map((l) => [l.id, l]));

export function getLayout(id: string): LayoutDef {
  const l = LAYOUT_BY_ID[id];
  if (!l) throw new Error(`Unknown layout ${id}`);
  return l;
}

export function layoutsFor(theme: ThemeId, kind?: LayoutDef['kind'], photoCount?: number): LayoutDef[] {
  return LAYOUTS.filter(
    (l) => (!l.themes || l.themes.includes(theme)) && (!kind || l.kind === kind) && (photoCount === undefined || l.photos.length === photoCount),
  );
}
