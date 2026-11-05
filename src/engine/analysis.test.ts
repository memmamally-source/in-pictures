import { describe, expect, it } from 'vitest';

import type { Photo } from '@/domain/types';

import { analyse, dHash, focusPoint, hamming, sharpness, toGray } from './analysis';
import { curatePhotos } from './curate';

/** Builds an RGBA image from a colour function. */
function image(w: number, h: number, f: (x: number, y: number) => [number, number, number]) {
  const a = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = f(x, y);
      a.set([r, g, b, 255], (y * w + x) * 4);
    }
  return a;
}
const W = 96;
const H = 72;
const scene = (shift = 0) => image(W, H, (x, y) => (y < 30 + shift ? [120, 170, 230] : x < 50 ? [60, 140, 70] : [200, 180, 120]));
const checker = image(W, H, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? [255, 255, 255] : [0, 0, 0]);
function blur(src: Uint8ClampedArray, r: number) {
  return image(W, H, (x, y) => {
    let s = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = Math.min(W - 1, Math.max(0, x + dx)), yy = Math.min(H - 1, Math.max(0, y + dy));
      s += src[(yy * W + xx) * 4]; n++;
    }
    const v = s / n;
    return [v, v, v];
  });
}

describe('photo analysis', () => {
  it('gives near-identical shots near-identical hashes and different scenes different ones', () => {
    const a = dHash(toGray(scene(), W, H), W, H);
    const b = dHash(toGray(scene(1), W, H), W, H);
    const c = dHash(toGray(checker, W, H), W, H);
    expect(a).toHaveLength(16);
    expect(hamming(a, a)).toBe(0);
    expect(hamming(a, b)).toBeLessThanOrEqual(8);
    expect(hamming(a, c)).toBeGreaterThan(12);
  });

  it('scores a blurred copy as much less sharp', () => {
    const sharp = sharpness(toGray(checker, W, H), W, H);
    const soft = sharpness(toGray(blur(checker, 3), W, H), W, H);
    expect(soft).toBeLessThan(sharp * 0.2);
  });

  it('moves the crop centre towards skin tones and detail', () => {
    // A face-coloured patch in the upper right of a plain sky.
    const img = image(W, H, (x, y) => (x > 62 && x < 82 && y > 10 && y < 30 ? [224, 172, 140] : [150, 200, 240]));
    const f = focusPoint(img, W, H);
    expect(f.x).toBeGreaterThan(0.6);
    expect(f.y).toBeLessThan(0.45);
    expect(focusPoint(image(W, H, () => [128, 128, 128]), W, H)).toEqual({ x: 0.5, y: 0.45 });
  });

  it('returns everything together', () => {
    const r = analyse(scene(), W, H);
    expect(r.hash).toMatch(/^[0-9a-f]{16}$/);
    expect(r.sharpness).toBeGreaterThan(0);
  });
});

describe('choosing photos for the album', () => {
  const base = (i: number, over: Partial<Photo> = {}): Photo => ({
    id: `p${i}`, projectId: 'x', name: `${i}.jpg`, width: 4000, height: 3000, originalWidth: 4000, originalHeight: 3000,
    addedAt: i, order: i, favourite: false, hash: (i * 0x9e3779b1 >>> 0).toString(16).padStart(8, '0').repeat(2), sharpness: 100, ...over,
  });

  it('keeps the sharpest of a burst and sets the rest aside', () => {
    const burst = 'ffffffff00000000';
    const photos = [
      base(1),
      base(2, { hash: burst, sharpness: 40, takenAt: '2026-06-01T10:00:00' }),
      base(3, { hash: burst, sharpness: 90, takenAt: '2026-06-01T10:00:01' }),
      base(4, { hash: 'ffffffff00000001', sharpness: 60, takenAt: '2026-06-01T10:00:02' }),
      base(5),
    ];
    const r = curatePhotos(photos);
    expect(r.keep.map((p) => p.id)).toEqual(['p1', 'p3', 'p5']);
    expect(r.setAside).toEqual([
      expect.objectContaining({ reason: 'similar', instead: 'p3' }),
      expect.objectContaining({ reason: 'similar', instead: 'p3' }),
    ]);
  });

  it('never sets aside favourites, captioned or checklist photos', () => {
    const burst = 'ffffffff00000000';
    const photos = [base(1, { hash: burst }), base(2, { hash: burst, favourite: true }), base(3, { hash: burst, caption: 'Us' }), base(4, { hash: burst, planItemId: 'x' })];
    expect(curatePhotos(photos).keep.map((p) => p.id)).toEqual(['p2', 'p3', 'p4']); // only the unmarked copy goes
  });

  it('does not treat the same view hours apart as a duplicate', () => {
    const h = 'ffffffff00000000';
    const photos = [base(1, { hash: h, takenAt: '2026-06-01T09:00:00' }), base(2, { hash: h, takenAt: '2026-06-01T18:00:00' })];
    expect(curatePhotos(photos).keep).toHaveLength(2);
  });

  it('leaves out clearly blurry shots only when there are plenty of others', () => {
    const many = Array.from({ length: 12 }, (_, i) => base(i, { sharpness: i === 5 ? 5 : 100 + i }));
    const r = curatePhotos(many);
    expect(r.setAside).toEqual([expect.objectContaining({ reason: 'blurry', photo: expect.objectContaining({ id: 'p5' }) })]);
    const few = many.slice(0, 6);
    expect(curatePhotos(few).setAside).toEqual([]);
  });

  it('keeps photos added before analysis existed', () => {
    const old = Array.from({ length: 12 }, (_, i) => base(i, { hash: undefined, sharpness: undefined }));
    expect(curatePhotos(old).keep).toHaveLength(12);
  });
});
