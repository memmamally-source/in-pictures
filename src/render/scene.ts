import type { AlbumPage, Photo } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
import { PAGE_H, PAGE_W, type DecorColor, type FrameStyle, type Rect, type TextColor } from '@/layouts/schema';
import { ROLE_FONT, isDarkPage, type FontSpec, type ThemeDef } from '@/layouts/themes';

import { backgroundPaths, decorPaths, shapePath, stampPath, type PathPart } from './decor';
import { coverCrop, defaultFocal, innerRect, polaroidCaptionRect, type CropRect } from './geometry';
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
  shade?: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface PathOp {
  t: 'path';
  parts: ResolvedPart[];
  xf?: Xform;
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
  ops: Op[];
}

export interface SceneInput {
  page: AlbumPage;
  theme: ThemeDef;
  photos: Map<string, Pick<Photo, 'width' | 'height' | 'caption'>>;
  measure: Measure;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildScene({ page, theme, photos, measure }: SceneInput): Scene {
  const layout = getLayout(page.layoutId);
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
      return { d: p.d, fill: p.fill === 'shade' ? undefined : pick(p.fill), shade: p.fill === 'shade', stroke: pick(p.stroke), strokeWidth: p.strokeWidth, opacity: p.opacity };
    });

  const ops: Op[] = [];
  const bgKind = layout.kind === 'chapter' ? theme.chapterBackground : theme.background;
  const bgParts = backgroundPaths(bgKind, PAGE_W, PAGE_H);
  if (bgParts.length) ops.push({ t: 'path', parts: resolve(bgParts, palette.pattern) });

  const decor = [...(layout.decor ?? [])];
  if (layout.kind === 'photos' && !layout.bleed && theme.pageDecor.length) {
    decor.push(...theme.pageDecor[hash(page.id) % theme.pageDecor.length]);
  }
  const xfOf = (r: Rect, rot: number | undefined): Xform | undefined => (rot ? { cx: r.x + r.w / 2, cy: r.y + r.h / 2, rot } : undefined);
  const pushDecor = (over: boolean) => {
    for (const d of decor) {
      if (!!d.over !== over) continue;
      ops.push({ t: 'path', parts: resolve(decorPaths(d.kind, d), decorColor(d.color)), xf: xfOf(d, d.rotate) });
    }
  };

  // Shading such as 'shade-bottom' sits above photos and below text.
  const shade = decor.filter((d) => d.kind === 'shade-bottom');
  const decorNoShade = decor.filter((d) => d.kind !== 'shade-bottom');
  decor.length = 0;
  decor.push(...decorNoShade);

  pushDecor(false);

  const frameBoxes: { box: Rect; inner: Rect; xf?: Xform; style: FrameStyle }[] = [];
  layout.photos.forEach((frame, i) => {
    const style = frame.frame ?? theme.frame;
    const shape = frame.shape ?? theme.shape;
    const tilt = style === 'polaroid' ? Math.max(theme.tilt, 0.6) : theme.tilt;
    const rot = (frame.rotate ?? 0) * tilt;
    const inner = innerRect(frame, style);
    const slot = page.photos[i];
    const meta = slot?.photoId ? photos.get(slot.photoId) : undefined;
    let photo: FrameOp['photo'] = null;
    if (slot?.photoId && meta) {
      const aspect = meta.width / meta.height;
      const fa = inner.w / inner.h;
      photo = { id: slot.photoId, aspect, crop: coverCrop(aspect, fa, slot.focal ?? defaultFocal(aspect, fa)) };
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
      over,
    });
    frameBoxes.push({ box: frame, inner, xf, style });
  });

  for (const d of shade) ops.push({ t: 'path', parts: resolve(decorPaths(d.kind, d), '#000') });
  pushDecor(true);

  for (const tb of layout.texts) {
    let raw = '';
    if (tb.role === 'caption' || tb.photo !== undefined) {
      const id = page.photos[tb.photo ?? 0]?.photoId;
      raw = (id && photos.get(id)?.caption) || '';
    } else raw = page.text[tb.key] ?? '';
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

  return { background: layout.kind === 'chapter' ? c.chapterPage : c.page, ops };
}
