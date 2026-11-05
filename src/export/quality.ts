import type { Album, Photo, ThemeId } from '@/domain/types';
import { getLayout } from '@/layouts/layouts';
import { getTheme } from '@/layouts/themes';
import { coverCrop, defaultFocal, effectiveDpi, innerRect } from '@/render/geometry';

/**
 * Pre-export checks. Effective resolution = pixels of the photo that end up
 * in the frame ÷ printed width of the frame in inches. Around 300 ppi is the
 * usual target for photo printing; under ~150 ppi softness becomes visible
 * in print. Screen viewing needs far less.
 */

export type Quality = 'standard' | 'high';

export const QUALITY = {
  standard: { dpi: 150, jpeg: 0.85, label: 'Standard', help: 'For screens and sharing. Smaller file.' },
  high: { dpi: 300, jpeg: 0.92, label: 'High quality', help: '300 dpi pages for home printing or keeping. Larger file.' },
} as const;

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
  const [lowAt, fairAt] = quality === 'high' ? [150, 220] : [72, 100];
  album.pages.forEach((page, pi) => {
    const layout = getLayout(page.layoutId);
    layout.photos.forEach((frame, si) => {
      const slot = page.photos[si];
      const photo = slot?.photoId ? byId.get(slot.photoId) : undefined;
      if (!photo) return void emptyFrames.push({ page: pi, slot: si });
      const inner = innerRect(frame, frame.frame ?? theme.frame);
      const ia = photo.width / photo.height;
      const fa = inner.w / inner.h;
      const crop = coverCrop(ia, fa, slot.focal ?? defaultFocal(ia, fa));
      const ppi = Math.round(effectiveDpi(Math.min(photo.width, photo.originalWidth), crop, inner.w));
      if (ppi < fairAt) issues.push({ page: pi, slot: si, photoId: photo.id, photoName: photo.name, ppi, level: ppi < lowAt ? 'low' : 'fair' });
    });
  });
  return { issues, emptyFrames, pages: album.pages.length };
}
