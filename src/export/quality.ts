import type { Album, Photo, ThemeId } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
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

/** Page units per inch (the page is 100 units = 8 in wide). */
export const UNITS_PER_INCH = 12.5;

/** Bleed for a quality, in page units. */
export const bleedUnits = (q: Quality) => QUALITY[q].bleedIn * UNITS_PER_INCH;

export interface PrintPlan {
  /** Pages to print, in order; null = a blank page added to make the count even. */
  pages: (Album['pages'][number] | null)[];
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
  const pages: PrintPlan['pages'] = includeCover ? [...album.pages] : album.pages.slice(1);
  const blankAdded = pages.length % 2 === 1;
  if (blankAdded) pages.push(null);
  return { pages, blankAdded, belowTypicalMinimum: pages.length < TYPICAL_MIN_PAGES };
}

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
      const ppi = Math.round(effectiveDpi(Math.min(photo.width, photo.originalWidth), crop, inner.w));
      if (ppi < fairAt) issues.push({ page: pi, slot: si, photoId: photo.id, photoName: photo.name, ppi, level: ppi < lowAt ? 'low' : 'fair' });
    });
  });
  return { issues, emptyFrames, pages: album.pages.length };
}
