/**
 * On-device photo analysis, run once at import on a small copy of each
 * photo. Pure functions over pixel arrays so they're testable.
 *
 *  - dHash: a 64-bit "difference hash" for spotting near-duplicates (bursts,
 *    the same shot taken twice);
 *  - sharpness: variance of the Laplacian (low = blurry);
 *  - focus: where the interesting part of the picture is, from skin tones,
 *    detail and colour — a heuristic in the spirit of "smart crop". It is
 *    not face recognition, and nothing leaves the device.
 */

export interface PhotoAnalysis {
  hash: string;
  sharpness: number;
  focus: { x: number; y: number };
}

export function toGray(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  return g;
}

/** Box-average resample of a grayscale image. */
function resample(g: Float32Array, w: number, h: number, tw: number, th: number): Float32Array {
  const out = new Float32Array(tw * th);
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor((ty * h) / th);
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h) / th));
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor((tx * w) / tw);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w) / tw));
      let s = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += g[y * w + x];
      out[ty * tw + tx] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

/** 64-bit difference hash as 16 hex characters. */
export function dHash(g: Float32Array, w: number, h: number): string {
  const s = resample(g, w, h, 9, 8);
  let hex = '';
  for (let row = 0; row < 8; row++) {
    let byte = 0;
    for (let col = 0; col < 8; col++) byte = (byte << 1) | (s[row * 9 + col] > s[row * 9 + col + 1] ? 1 : 0);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

/** Number of differing bits between two hashes (0 = identical, 64 = opposite). */
export function hamming(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < 16; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Variance of the Laplacian: higher = sharper. Compare photos analysed at the same size. */
export function sharpness(g: Float32Array, w: number, h: number): number {
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      sum += l;
      sum2 += l * l;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

/** Rough skin-tone test (works across a wide range of skin colours in normal light). */
function skinScore(r: number, g: number, b: number): number {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  if (y < 40 || y > 250) return 0;
  // Distance from the centre of the usual skin cluster in CbCr.
  const d = Math.hypot((cb - 110) / 18, (cr - 152) / 14);
  return d < 1 ? 1 - d : 0;
}

/**
 * Where to centre a crop, as fractions (0..1). Skin and fine detail pull the
 * point; a gentle bias towards the upper-middle reflects how people compose.
 */
export function focusPoint(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): { x: number; y: number } {
  const g = toGray(rgba, w, h);
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const r = rgba[i * 4];
      const gg = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const edge = Math.abs(4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w]) / 255;
      const max = Math.max(r, gg, b);
      const sat = max ? (max - Math.min(r, gg, b)) / max : 0;
      const fx = x / w;
      const fy = y / h;
      const bias = 1 - 0.6 * Math.abs(fx - 0.5) - 0.5 * Math.abs(fy - 0.42);
      const score = (skinScore(r, gg, b) * 2.2 + edge * 1.2 + sat * 0.25) * bias;
      const s2 = score * score;
      sx += fx * s2;
      sy += fy * s2;
      total += s2;
    }
  }
  if (total < 1e-6) return { x: 0.5, y: 0.45 };
  const clamp = (v: number) => Math.max(0.15, Math.min(0.85, v));
  return { x: clamp(sx / total), y: clamp(sy / total) };
}

export function analyse(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): PhotoAnalysis {
  const g = toGray(rgba, w, h);
  return { hash: dHash(g, w, h), sharpness: Math.round(sharpness(g, w, h) * 10) / 10, focus: focusPoint(rgba, w, h) };
}
