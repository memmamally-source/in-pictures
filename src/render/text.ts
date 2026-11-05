import type { FontSpec } from '@/layouts/themes';

/**
 * Text fitting shared by both renderers. Line breaks are decided here with a
 * real font measurement (canvas measureText), so the page on screen and the
 * page in the PDF break lines in the same places.
 */

/** Width in pixels of `text` drawn with the CSS font string. */
export type Measure = (text: string, font: string) => number;

/** Pixels per page unit used while measuring (any value works; it cancels out). */
const K = 10;

export function cssFont(spec: FontSpec, sizePx: number): string {
  return `${spec.style === 'italic' ? 'italic ' : ''}${spec.weight} ${sizePx}px "${spec.family}"`;
}

export interface FittedText {
  lines: string[];
  /** Final font size in page units. */
  size: number;
}

function wrap(text: string, maxWidth: number, width: (s: string) => number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (!line || width(next) <= maxWidth) line = next;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

export function fitText(
  raw: string,
  spec: FontSpec,
  baseSize: number,
  box: { w: number; h: number },
  maxLines: number | undefined,
  measure: Measure,
): FittedText {
  const text = spec.upper ? raw.toUpperCase() : raw;
  const limit = maxLines ?? 99;
  const start = baseSize * (spec.scale ?? 1);
  const min = start * 0.55;
  let size = start;
  let lines: string[] = [];
  for (; size >= min; size *= 0.94) {
    const px = size * K;
    const font = cssFont(spec, px);
    const tracking = (spec.tracking ?? 0) * px;
    const width = (s: string) => measure(s, font) + tracking * s.length;
    lines = wrap(text, box.w * K, width);
    if (lines.length <= limit && lines.length * spec.lineHeight * size <= box.h + 0.01) return { lines, size };
  }
  size = min;
  const px = size * K;
  const font = cssFont(spec, px);
  const tracking = (spec.tracking ?? 0) * px;
  const width = (s: string) => measure(s, font) + tracking * s.length;
  lines = wrap(text, box.w * K, width);
  const fitLines = Math.max(1, Math.min(limit, Math.floor(box.h / (spec.lineHeight * size))));
  if (lines.length > fitLines) {
    lines = lines.slice(0, fitLines);
    let last = lines[fitLines - 1];
    while (last.length > 1 && width(`${last}…`) > box.w * K) last = last.slice(0, -1).trimEnd();
    lines[fitLines - 1] = `${last}…`;
  }
  return { lines, size };
}

/** Canvas-backed measurement for the browser; memoised because pages re-render often. */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();
export const browserMeasure: Measure = (text, font) => {
  const key = `${font}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 5;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  if (cache.size > 5000) cache.clear();
  cache.set(key, w);
  return w;
};

/** Call after web fonts finish loading so measurements are redone with the real fonts. */
export function clearMeasureCache() {
  cache.clear();
}
