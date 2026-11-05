import type { AlbumLength } from '@/domain/types';

/** Placeholder title for a Quick album until its photos' dates are known. */
export const QUICK_TITLE = 'My album';

/** Album size from how many photos there are (sets how full the pages are). */
export function sizeForCount(n: number): AlbumLength {
  return n <= 24 ? 'simple' : n <= 70 ? 'deluxe' : 'extravagant';
}
