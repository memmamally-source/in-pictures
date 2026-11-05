import { describe, expect, it } from 'vitest';

import type { Album, Photo } from '@/domain/types';
import { LAYOUTS } from '@/layouts/layouts';
import { PAGE_H, PAGE_W } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { buildScene, extendToBleed, type FrameOp, type PathOp } from '@/render/scene';

import { bleedUnits, printPlan, UNITS_PER_INCH } from './quality';

const measure = (text: string, font: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.5;
const SAFE = 0.25 * UNITS_PER_INCH; // 1/4 in inside the trim

describe('print-ready output', () => {
  it('uses 1/8 in bleed only for print', () => {
    expect(bleedUnits('print')).toBeCloseTo(1.5625);
    expect(bleedUnits('high')).toBe(0);
  });

  it('keeps every text box at least 1/4 in inside the trim', () => {
    const tooClose: string[] = [];
    for (const l of LAYOUTS) {
      for (const t of l.texts) {
        if (t.inFrame) continue;
        if (t.x < SAFE || t.y < SAFE || PAGE_W - (t.x + t.w) < SAFE || PAGE_H - (t.y + t.h) < SAFE) tooClose.push(`${l.id}/${t.key}`);
      }
    }
    expect(tooClose).toEqual([]);
  });

  it('extends edge-touching rectangles into the bleed and leaves others alone', () => {
    const b = 1.5625;
    expect(extendToBleed({ x: 0, y: 0, w: 100, h: 125 }, b)).toEqual({ x: -b, y: -b, w: 100 + 2 * b, h: 125 + 2 * b });
    expect(extendToBleed({ x: 0, y: 44, w: 100, h: 81 }, b)).toEqual({ x: -b, y: 44, w: 100 + 2 * b, h: 81 + b });
    expect(extendToBleed({ x: 10, y: 10, w: 80, h: 80 }, b)).toEqual({ x: 10, y: 10, w: 80, h: 80 });
  });

  it('builds bleed pages: full-bleed photos and patterns grow, framed photos do not', () => {
    const photo: Photo = { id: 'p', projectId: 'x', name: 'p.jpg', width: 3000, height: 4000, originalWidth: 3000, originalHeight: 4000, addedAt: 0, order: 0, favourite: false };
    const photos = new Map([['p', photo]]);
    const bleed = bleedUnits('print');
    const full = buildScene({ page: { id: 'a', layoutId: 'p1-bleed', photos: [{ photoId: 'p' }], text: {} }, theme: getTheme('minimal'), photos, measure, bleed });
    const f = full.ops.find((o): o is FrameOp => o.t === 'frame')!;
    expect(f.inner.x).toBeCloseTo(-bleed);
    expect(f.inner.w).toBeCloseTo(100 + 2 * bleed);
    const framed = buildScene({ page: { id: 'b', layoutId: 'p1-framed', photos: [{ photoId: 'p' }], text: {} }, theme: getTheme('scrapbook'), photos, measure, bleed });
    const g = framed.ops.find((o): o is FrameOp => o.t === 'frame')!;
    expect(g.box.x).toBe(10);
    const pattern = framed.ops.find((o): o is PathOp => o.t === 'path' && !!o.shift);
    expect(pattern?.shift).toBeCloseTo(bleed); // kraft paper continues into the bleed
  });

  it('pads to an even page count and can leave the cover out', () => {
    const page = (id: string) => ({ id, layoutId: 'p1-framed', photos: [], text: {} });
    const album: Album = { seed: 1, generatedAt: 0, pages: ['c', '1', '2', '3', '4'].map(page) };
    const withCover = printPlan(album, true);
    expect(withCover.pages).toHaveLength(6);
    expect(withCover.blankAdded).toBe(true);
    expect(withCover.pages.at(-1)).toBeNull();
    const noCover = printPlan(album, false);
    expect(noCover.pages).toHaveLength(4);
    expect(noCover.blankAdded).toBe(false);
    expect(noCover.belowTypicalMinimum).toBe(true);
  });
});
