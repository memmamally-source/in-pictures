import type { Album, BookFormat, Photo, ThemeId } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
import { unitsPerInch } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { coverCrop, effectiveDpi, focalFor, innerRect } from '@/render/geometry';

/**
 * Pre-export checks. Effective resolution = pixels of the photo that end up
 * in the frame ÷ printed width of the frame in inches. Around 300 ppi is the
 * usual target for photo printing; under ~150 ppi softness becomes visible
 * in print. Screen viewing needs far less.
 */

export type Quality = 'standard' | 'high' | 'print';

export const QUALITY: Record<Quality, { dpi: number; jpeg: number; bleedIn: number; label: string; help: string }> = {
  standard: { dpi: 150, jpeg: 0.85, bleedIn: 0, label: 'Standard', help: 'For screens and sharing. Smaller file.' },
  high: { dpi: 300, jpeg: 0.92, bleedIn: 0, label: 'High quality', help: '300 dpi pages for home printing or keeping. Larger file.' },
  print: {
    dpi: 300,
    jpeg: 0.95,
    bleedIn: 0.125,
    label: 'Print-ready',
    help: 'For ordering a printed book: 8 × 10 in pages at 300 dpi with 1/8 in bleed on every side (8.25 × 10.25 in files), sRGB colour.',
  },
};

/** Page units per inch for the classic portrait book (100 units = 8 in). */
export const UNITS_PER_INCH = 12.5;

/** Bleed for a quality, in page units. */
export const bleedUnits = (q: Quality, format: BookFormat = 'portrait') => QUALITY[q].bleedIn * unitsPerInch(format);

/** One printed page: a whole page, or one half of a two-page spread. */
export interface PrintPage {
  page: Album['pages'][number];
  half?: 'left' | 'right';
}

export interface PrintPlan {
  /** Pages to print, in order; null = a blank page (to keep spreads facing, or make the count even). */
  pages: (PrintPage | null)[];
  blankAdded: boolean;
  /** Below the minimum many photo-book printers ask for. */
  belowTypicalMinimum: boolean;
}

/** Typical minimum page count for printed photo books (it varies by printer). */
export const TYPICAL_MIN_PAGES = 20;

/**
 * Printed books are bound in sheets, so the page count must be even. Some
 * printers make the cover separately from a template sized to their spine;
 * then the cover page is left out of the interior file.
 */
export function printPlan(album: Album, includeCover: boolean): PrintPlan {
  // Position 0 is the cover (a right-hand page); spreads start on left-hand
  // pages (odd positions), as in the on-screen book.
  const seq: (PrintPage | null)[] = [{ page: album.pages[0] }];
  let blankAdded = false;
  for (const page of album.pages.slice(1)) {
    if (getLayout(page.layoutId).spread) {
      if (seq.length % 2 === 0) {
        seq.push(null); // keep the spread facing
        blankAdded = true;
      }
      seq.push({ page, half: 'left' }, { page, half: 'right' });
    } else seq.push({ page });
  }
  const pages = includeCover ? seq : seq.slice(1);
  if (pages.length % 2 === 1) {
    pages.push(null);
    blankAdded = true;
  }
  return { pages, blankAdded, belowTypicalMinimum: pages.length < TYPICAL_MIN_PAGES };
}

/** Printed page count of an album (a spread is two pages). */
export const printedPageCount = (album: Album) => album.pages.reduce((n, p) => n + (getLayout(p.layoutId).spread ? 2 : 1), 0);

export interface ResolutionIssue {
  page: number;
  slot: number;
  photoId: string;
  photoName: string;
  ppi: number;
  level: 'low' | 'fair';
}

export interface ExportCheck {
  issues: ResolutionIssue[];
  emptyFrames: { page: number; slot: number }[];
  pages: number;
}

export function checkAlbum(album: Album, photos: Photo[], themeId: ThemeId, quality: Quality): ExportCheck {
  const perInch = unitsPerInch(album.format);
  const theme = getTheme(themeId);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const issues: ResolutionIssue[] = [];
  const emptyFrames: ExportCheck['emptyFrames'] = [];
  const [lowAt, fairAt] = quality === 'standard' ? [72, 100] : [150, 220];
  album.pages.forEach((page, pi) => {
    const layout = getLayout(page.layoutId);
    layout.photos.forEach((frame, si) => {
      const slot = page.photos[si];
      const photo = slot?.photoId ? byId.get(slot.photoId) : undefined;
      if (!photo) return void emptyFrames.push({ page: pi, slot: si });
      const inner = innerRect(frame, frame.frame ?? theme.frame);
      const ia = photo.width / photo.height;
      const fa = inner.w / inner.h;
      const crop = coverCrop(ia, fa, focalFor(slot.focal, photo, ia, fa));
      const ppi = Math.round(effectiveDpi(Math.min(photo.width, photo.originalWidth), crop, inner.w, perInch));
      if (ppi < fairAt) issues.push({ page: pi, slot: si, photoId: photo.id, photoName: photo.name, ppi, level: ppi < lowAt ? 'low' : 'fair' });
    });
  });
  return { issues, emptyFrames, pages: album.pages.length };
}
