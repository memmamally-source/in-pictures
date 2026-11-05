import type { Album, Photo, ThemeId } from '@/domain/types';
import { Brand } from '@/config/brand';
import { PAGE_INCHES, PAGE_W } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { renderScene } from '@/render/canvas';
import { loadAlbumFonts } from '@/render/fonts';
import { buildScene } from '@/render/scene';
import { browserMeasure } from '@/render/text';
import { repo } from '@/services/repository';

import { QUALITY, bleedUnits, printPlan, type Quality } from './quality';

/**
 * Client-side PDF export. Each page is drawn from the same scene as the
 * preview onto a canvas at the chosen resolution, then embedded as a JPEG in
 * an 8 × 10 in PDF (jsPDF, loaded only when exporting). Text is part of the
 * page image, so the PDF looks exactly like the preview but its text isn't
 * selectable. 'print' adds 1/8 in bleed on every side (8.25 × 10.25 in pages),
 * pads to an even page count and can leave the cover out for printers that
 * make covers separately.
 */

export interface ExportOptions {
  album: Album;
  photos: Photo[];
  themeId: ThemeId;
  title: string;
  quality: Quality;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  /** Print only: include the cover as the first page (default true). */
  includeCover?: boolean;
}

export async function exportPdf({ album, photos, themeId, title, quality, onProgress, signal, includeCover = true }: ExportOptions): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), loadAlbumFonts()]);
  const theme = getTheme(themeId);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const q = QUALITY[quality];
  const pxPerUnit = (q.dpi * PAGE_INCHES.w) / PAGE_W;
  const bleed = bleedUnits(quality);
  const sheet = { w: PAGE_INCHES.w + 2 * q.bleedIn, h: PAGE_INCHES.h + 2 * q.bleedIn };
  const pdf = new jsPDF({ unit: 'in', format: [sheet.w, sheet.h], orientation: 'portrait', compress: true });
  pdf.setProperties({ title, creator: Brand.name });

  const pages = quality === 'print' ? printPlan(album, includeCover).pages : album.pages;
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const page = pages[i];
    // A blank page (added to make the count even) is plain paper in the album's colour.
    const scene = page ? buildScene({ page, theme, photos: byId, measure: browserMeasure, bleed }) : { background: theme.colors.page, ops: [] };
    const opened: ImageBitmap[] = [];
    const canvas = await renderScene(scene, pxPerUnit, async (photoId) => {
      const blob = (await repo.getBlob(photoId, quality === 'standard' ? 'display' : 'full')) ?? (await repo.getBlob(photoId, 'display'));
      if (!blob) throw new Error('Photo missing');
      const bmp = await createImageBitmap(blob);
      opened.push(bmp);
      return bmp;
    }, bleed);
    opened.forEach((b) => b.close());
    const jpeg = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode page'))), 'image/jpeg', q.jpeg));
    canvas.width = canvas.height = 0;
    if (i > 0) pdf.addPage([sheet.w, sheet.h], 'portrait');
    pdf.addImage(new Uint8Array(await jpeg.arrayBuffer()), 'JPEG', 0, 0, sheet.w, sheet.h, undefined, 'NONE');
    onProgress?.(i + 1, total);
    await new Promise((r) => setTimeout(r, 0)); // let the UI breathe between pages
  }
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function pdfFilename(title: string, quality?: Quality): string {
  const slug = title.replace(/[–—]/g, '-').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60);
  return `${slug || 'album'}${quality === 'print' ? '-print' : ''}.pdf`;
}
