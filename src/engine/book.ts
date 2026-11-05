import type { AlbumPage } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';

/**
 * How pages sit in the open book. The cover is alone on the right; after
 * that pages pair up left/right, and a two-page spread fills both sides.
 * If edits leave a single page waiting for a partner before a spread, it is
 * shown (and printed) next to a blank page.
 */
export interface View {
  left?: number;
  right?: number;
  spread?: number;
}

export function bookViews(pages: AlbumPage[]): View[] {
  if (!pages.length) return [];
  const views: View[] = [{ right: 0 }];
  let pending: number | undefined;
  for (let i = 1; i < pages.length; i++) {
    if (getLayout(pages[i].layoutId).spread) {
      if (pending !== undefined) views.push({ left: pending });
      pending = undefined;
      views.push({ spread: i });
    } else if (pending === undefined) pending = i;
    else {
      views.push({ left: pending, right: i });
      pending = undefined;
    }
  }
  if (pending !== undefined) views.push({ left: pending });
  return views;
}

/** One page at a time (phones), but spreads stay whole. */
export function singleViews(pages: AlbumPage[]): View[] {
  return pages.map((p, i) => (getLayout(p.layoutId).spread ? { spread: i } : { right: i }));
}

export const pagesIn = (v: View): number[] => (v.spread !== undefined ? [v.spread] : [v.left, v.right].filter((x): x is number => x !== undefined));

export function viewIndexOf(views: View[], page: number): number {
  const i = views.findIndex((v) => pagesIn(v).includes(page));
  return i === -1 ? 0 : i;
}

/** Printed page numbers for labels: "Cover", "3", "4–5" (a spread is two pages). */
export function pageLabels(pages: AlbumPage[]): string[] {
  let n = 0;
  return pages.map((p, i) => {
    if (i === 0) return 'Cover';
    if (getLayout(p.layoutId).spread) {
      n += 2;
      return `${n - 1}–${n}`;
    }
    n += 1;
    return String(n);
  });
}
