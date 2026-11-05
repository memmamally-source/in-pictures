import type { Photo } from '@/domain/types';

import { hamming } from './analysis';

/**
 * Chooses which photos go into a generated album. Near-duplicates (bursts,
 * the same shot twice) keep only the best one; clearly blurry shots are left
 * out when there are plenty of others. Photos the user has marked as
 * favourites, captioned or attached to a checklist idea are always kept.
 * Nothing is deleted: set-aside photos stay in the "not in the album" tray.
 */

export type SetAsideReason = 'similar' | 'blurry';

export interface Curated {
  keep: Photo[];
  setAside: { photo: Photo; reason: SetAsideReason; instead?: string }[];
}

const SIMILAR_BITS = 8; // of 64
const BURST_SECONDS = 90;
const BLURRY_RATIO = 0.22; // of the album's median sharpness
const MIN_FOR_BLUR_CHECK = 10;

const chosen = (p: Photo) => p.favourite || !!p.caption?.trim() || !!p.planItemId;

function secondsBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  return Math.abs(Date.parse(a) - Date.parse(b)) / 1000;
}

function similar(a: Photo, b: Photo): boolean {
  if (!a.hash || !b.hash) return false;
  if (hamming(a.hash, b.hash) > SIMILAR_BITS) return false;
  const dt = secondsBetween(a.takenAt, b.takenAt);
  return dt === null || dt <= BURST_SECONDS;
}

/** Higher is better: what the user chose first, then sharpness. */
function rank(p: Photo): number {
  return (p.favourite ? 1e9 : 0) + (p.caption?.trim() ? 1e8 : 0) + (p.planItemId ? 1e7 : 0) + (p.sharpness ?? 0);
}

export function curatePhotos(photos: Photo[]): Curated {
  const sorted = [...photos].sort((a, b) => a.order - b.order);
  const setAside: Curated['setAside'] = [];

  // 1. Group runs of near-identical neighbours; keep the best of each run.
  const groups: Photo[][] = [];
  for (const p of sorted) {
    const g = groups.at(-1);
    if (g && g.some((q) => similar(p, q))) g.push(p);
    else groups.push([p]);
  }
  let keep: Photo[] = [];
  for (const g of groups) {
    const best = g.reduce((a, b) => (rank(b) > rank(a) ? b : a));
    for (const p of g) {
      if (p === best || chosen(p)) keep.push(p);
      else setAside.push({ photo: p, reason: 'similar', instead: best.id });
    }
  }

  // 2. Leave out clearly blurry shots when there are plenty of others.
  const measured = keep.filter((p) => typeof p.sharpness === 'number').map((p) => p.sharpness!).sort((a, b) => a - b);
  if (keep.length >= MIN_FOR_BLUR_CHECK && measured.length >= MIN_FOR_BLUR_CHECK) {
    const median = measured[Math.floor(measured.length / 2)];
    const limit = median * BLURRY_RATIO;
    const next: Photo[] = [];
    for (const p of keep) {
      if (!chosen(p) && typeof p.sharpness === 'number' && p.sharpness < limit) setAside.push({ photo: p, reason: 'blurry' });
      else next.push(p);
    }
    keep = next;
  }

  return { keep: keep.sort((a, b) => a.order - b.order), setAside };
}

/** The photo's own crop centre, when analysis found one. */
export function photoFocal(p: Pick<Photo, 'focus'>): { x: number; y: number; zoom: number } | undefined {
  return p.focus ? { x: p.focus.x, y: p.focus.y, zoom: 1 } : undefined;
}
