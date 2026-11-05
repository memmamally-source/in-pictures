import type { AlbumPage, Photo } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
import { scaleDecor } from '@/layouts/proLayouts';
import { PAGE_H, PAGE_W, canvasSize, type BookFormat, type DecorColor, type FrameStyle, type Rect, type TextColor } from '@/layouts/schema';
import { ROLE_FONT, isDarkPage, type FontSpec, type ThemeDef } from '@/layouts/themes';

import { backgroundPaths, decorPaths, shapePath, stampPath, type PathPart } from './decor';
import { coverCrop, focalFor, innerRect, polaroidCaptionRect, type CropRect } from './geometry';
import { motifParts } from './motifs';
import { fitText, type Measure } from './text';

/**
 * Converts a page (layout + photos + text + theme) into a flat display list
 * in page units. The screen renderer (PageView) and the PDF renderer
 * (canvasRender) both draw this list, so they cannot drift apart.
 */

export interface Xform {
  cx: number;
  cy: number;
  rot: number; // degrees
}

export interface ResolvedPart {
  d: string;
  fill?: string;
  /** Vertical gradient from transparent to dark, for text over photos. */
  shade?: 'down' | 'up';
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface PathOp {
  t: 'path';
  parts: ResolvedPart[];
  xf?: Xform;
  /** Drawn shifted up and left by this many units (patterns that extend into the bleed). */
  shift?: number;
}

export interface FrameOp {
  t: 'frame';
  slot: number;
  box: Rect;
  inner: Rect;
  style: FrameStyle;
  /** Clip outline of the picture area. */
  clip: string;
  /** Outline of the frame paper (mat, polaroid, stamp, mount); absent for 'none'. */
  paper?: string;
  paperColor: string;
  shadow: boolean;
  xf?: Xform;
  photo: { id: string; aspect: number; crop: CropRect } | null;
  /** Draw the photo in black and white. */
  mono?: boolean;
  /** Mount corners and similar drawn over the picture. */
  over?: ResolvedPart[];
}

export interface TextOp {
  t: 'text';
  key: string;
  box: Rect;
  lines: string[];
  font: FontSpec;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  xf?: Xform;
}

export type Op = PathOp | FrameOp | TextOp;

export interface Scene {
  background: string;
  /** Size in page units: 100 wide (200 for a spread) by the shape's height. */
  width: number;
  height: number;
  ops: Op[];
}

export interface SceneInput {
  page: AlbumPage;
  theme: ThemeDef;
  photos: Map<string, Pick<Photo, 'width' | 'height' | 'caption' | 'focus'>>;
  measure: Measure;
  /**
   * Print bleed in page units. Edge-to-edge photos, edge decorations and the
   * paper pattern extend this far beyond the trim so a slightly off cut
   * never shows a white sliver. 0 for screen and ordinary PDFs.
   */
  bleed?: number;
  /** Book shape (default portrait). */
  format?: BookFormat;
}

/** Patterns that repeat evenly, so they can simply be drawn larger for the bleed. */
const EXTENDABLE = new Set(['dots', 'grid', 'kraft', 'linen', 'confetti']);

/** Grows a rectangle past every page edge it touches. */
export function extendToBleed(r: Rect, bleed: number, W = PAGE_W, H = PAGE_H): Rect {
  if (!bleed) return r;
  const e = 0.5;
  const left = r.x <= e ? bleed + r.x : 0;
  const top = r.y <= e ? bleed + r.y : 0;
  const right = r.x + r.w >= W - e ? bleed + (W - r.x - r.w) : 0;
  const bottom = r.y + r.h >= H - e ? bleed + (H - r.y - r.h) : 0;
  return { x: r.x - left, y: r.y - top, w: r.w + left + right, h: r.h + top + bottom };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildScene({ page, theme, photos, measure, bleed = 0, format = 'portrait' }: SceneInput): Scene {
  const layout = getLayout(page.layoutId);
  const { w: W, h: H } = canvasSize(format, layout.spread);
  const grow = (r: Rect) => extendToBleed(r, bleed, W, H);
  const dark = isDarkPage(theme, layout.kind === 'chapter' ? 'chapter' : 'other');
  const c = theme.colors;
  const palette = dark && theme.chapterInk ? theme.chapterInk : { ink: c.ink, muted: c.muted, accent: c.accent, accent2: c.accent2, pattern: c.pattern };
  const decorColor = (k: DecorColor | undefined): string =>
    ({ accent: palette.accent, accent2: palette.accent2, ink: palette.ink, muted: palette.muted, paper: c.page, mat: c.mat })[k ?? 'accent'];
  const textColor = (k: TextColor | undefined, role: string): string =>
    k === 'onPhoto' ? '#FFFFFF' : k ? { ink: palette.ink, muted: palette.muted, accent: palette.accent }[k] : role === 'date' || role === 'subtitle' ? palette.muted : palette.ink;

  const resolve = (parts: PathPart[], color: string): ResolvedPart[] =>
    parts.map((p) => {
      const pick = (v?: string) =>
        v === 'color' ? color : v === 'pattern' ? palette.pattern : v === 'accent' ? palette.accent : v === 'accent2' ? palette.accent2 : v;
      const shade = p.fill === 'shade' ? 'down' : p.fill === 'shade-top' ? 'up' : undefined;
      return { d: p.d, fill: shade ? undefined : pick(p.fill), shade, stroke: pick(p.stroke), strokeWidth: p.strokeWidth, opacity: p.opacity };
    });

  const ops: Op[] = [];
  const bgKind = layout.kind === 'chapter' ? theme.chapterBackground : theme.background;
  if (bleed && EXTENDABLE.has(bgKind)) {
    const parts = backgroundPaths(bgKind, W + 2 * bleed, H + 2 * bleed);
    if (parts.length) ops.push({ t: 'path', parts: resolve(parts, palette.pattern), shift: bleed });
  } else {
    const bgParts = backgroundPaths(bgKind, W, H);
    if (bgParts.length) ops.push({ t: 'path', parts: resolve(bgParts, palette.pattern) });
  }

  const decor = [...(layout.decor ?? [])];
  if (layout.kind === 'photos' && !layout.bleed && theme.pageDecor.length) {
    const extra = theme.pageDecor[hash(page.id) % theme.pageDecor.length];
    // Theme ornaments are placed in portrait units; map them onto other shapes and spreads.
    decor.push(...(W === PAGE_W && H === PAGE_H ? extra : extra.map((d) => scaleDecor(d, W, H))));
  }
  const xfOf = (r: Rect, rot: number | undefined): Xform | undefined => (rot ? { cx: r.x + r.w / 2, cy: r.y + r.h / 2, rot } : undefined);
  const pushDecor = (over: boolean) => {
    for (const d of decor) {
      if (!!d.over !== over) continue;
      const r = d.rotate ? d : grow(d);
      const parts = d.kind === 'motif' ? motifParts(page.motif, d) : resolve(decorPaths(d.kind, { ...d, ...r }), decorColor(d.color));
      ops.push({ t: 'path', parts, xf: xfOf(d, d.rotate) });
    }
  };

  // Shading such as 'shade-bottom' sits above photos and below text.
  const isShade = (d: { kind: string }) => d.kind === 'shade-bottom' || d.kind === 'shade-top';
  const shade = decor.filter(isShade);
  const decorNoShade = decor.filter((d) => !isShade(d));
  decor.length = 0;
  decor.push(...decorNoShade);

  pushDecor(false);

  const frameBoxes: { box: Rect; inner: Rect; xf?: Xform; style: FrameStyle }[] = [];
  layout.photos.forEach((frame, i) => {
    const style = frame.frame ?? theme.frame;
    const shape = frame.shape ?? theme.shape;
    const tilt = style === 'polaroid' ? Math.max(theme.tilt, 0.6) : theme.tilt;
    const rot = (frame.rotate ?? 0) * tilt;
    // Edge-to-edge photos run into the bleed (unrotated, unframed ones only).
    const placed = style === 'none' && !rot ? grow(frame) : frame;
    const inner = innerRect(placed, style);
    const slot = page.photos[i];
    const meta = slot?.photoId ? photos.get(slot.photoId) : undefined;
    let photo: FrameOp['photo'] = null;
    if (slot?.photoId && meta) {
      const aspect = meta.width / meta.height;
      const fa = inner.w / inner.h;
      photo = { id: slot.photoId, aspect, crop: coverCrop(aspect, fa, focalFor(slot.focal, meta, aspect, fa)) };
    }
    const xf = xfOf(frame, rot);
    const paper = style === 'none' ? undefined : style === 'stamp' ? stampPath(frame) : shapePath(frame, 'rect', 0);
    const over =
      style === 'mount' ? resolve(decorPaths('corners', { x: inner.x - 0.6, y: inner.y - 0.6, w: inner.w + 1.2, h: inner.h + 1.2 }), dark ? '#1c1a17' : '#2A2621') : undefined;
    ops.push({
      t: 'frame',
      slot: i,
      box: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
      inner,
      style,
      clip: shapePath(inner, style === 'none' || style === 'mount' ? shape : 'rect', theme.radius),
      paper,
      paperColor: c.mat,
      shadow: theme.shadow && style !== 'none',
      xf,
      photo,
      mono: !!slot?.mono,
      over,
    });
    frameBoxes.push({ box: frame, inner, xf, style });
  });

  for (const d of shade) ops.push({ t: 'path', parts: resolve(decorPaths(d.kind, grow(d)), '#000') });
  pushDecor(true);

  for (const tb of layout.texts) {
    let raw = '';
    if (tb.role === 'caption' || tb.photo !== undefined) {
      const id = page.photos[tb.photo ?? 0]?.photoId;
      raw = (id && photos.get(id)?.caption) || '';
    } else raw = page.text[tb.key] ?? '';
    // Covers without their own date line show it after the subtitle.
    if (tb.key === 'subtitle' && !layout.texts.some((t) => t.key === 'date') && page.text.date) raw = [raw.trim(), page.text.date].filter(Boolean).join(' · ');
    raw = raw.trim();
    if (!raw) continue;
    let box: Rect = tb;
    let xf = xfOf(tb, tb.rotate && theme.tilt ? tb.rotate : undefined);
    if (tb.inFrame && tb.photo !== undefined && frameBoxes[tb.photo]) {
      const fb = frameBoxes[tb.photo];
      box = polaroidCaptionRect(fb.box);
      xf = fb.xf;
    }
    const font = theme.fonts[ROLE_FONT[tb.role]];
    const fitted = fitText(raw, font, tb.size, box, tb.maxLines, measure);
    ops.push({ t: 'text', key: tb.key, box, lines: fitted.lines, font, size: fitted.size, color: tb.inFrame ? c.ink : textColor(tb.color, tb.role), align: tb.align, xf });
  }

  const posterColor = layout.poster && theme.coverColors?.length ? theme.coverColors[hash(page.text.title ?? page.id) % theme.coverColors.length] : undefined;
  return { background: posterColor ?? (layout.kind === 'chapter' ? c.chapterPage : c.page), ops, width: W, height: H };
}
