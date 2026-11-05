import type { Album, Photo, ThemeId } from '@/domain/types';
import { Brand } from '@/config/brand';
import { PAGE_INCHES, PAGE_W } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { renderScene } from '@/render/canvas';
import { loadAlbumFonts } from '@/render/fonts';
import { buildScene } from '@/render/scene';
import { browserMeasure } from '@/render/text';
import { repo } from '@/services/repository';

import { QUALITY, type Quality } from './quality';

/**
 * Client-side PDF export. Each page is drawn from the same scene as the
 * preview onto a canvas at the chosen resolution, then embedded as a JPEG in
 * an 8 × 10 in PDF (jsPDF, loaded only when exporting). Text is part of the
 * page image, so the PDF looks exactly like the preview but its text isn't
 * selectable. No bleed is added: see docs/ARCHITECTURE.md (printing).
 */

export interface ExportOptions {
  album: Album;
  photos: Photo[];
  themeId: ThemeId;
  title: string;
  quality: Quality;
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export async function exportPdf({ album, photos, themeId, title, quality, onProgress, signal }: ExportOptions): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), loadAlbumFonts()]);
  const theme = getTheme(themeId);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const q = QUALITY[quality];
  const pxPerUnit = (q.dpi * PAGE_INCHES.w) / PAGE_W;
  const pdf = new jsPDF({ unit: 'in', format: [PAGE_INCHES.w, PAGE_INCHES.h], orientation: 'portrait', compress: true });
  pdf.setProperties({ title, creator: Brand.name });

  const total = album.pages.length;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const page = album.pages[i];
    const scene = buildScene({ page, theme, photos: byId, measure: browserMeasure });
    const opened: ImageBitmap[] = [];
    const canvas = await renderScene(scene, pxPerUnit, async (photoId) => {
      const blob = (await repo.getBlob(photoId, quality === 'high' ? 'full' : 'display')) ?? (await repo.getBlob(photoId, 'display'));
      if (!blob) throw new Error('Photo missing');
      const bmp = await createImageBitmap(blob);
      opened.push(bmp);
      return bmp;
    });
    opened.forEach((b) => b.close());
    const jpeg = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode page'))), 'image/jpeg', q.jpeg));
    canvas.width = canvas.height = 0;
    if (i > 0) pdf.addPage([PAGE_INCHES.w, PAGE_INCHES.h], 'portrait');
    pdf.addImage(new Uint8Array(await jpeg.arrayBuffer()), 'JPEG', 0, 0, PAGE_INCHES.w, PAGE_INCHES.h, undefined, 'NONE');
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

export function pdfFilename(title: string): string {
  const slug = title.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60);
  return `${slug || 'album'}.pdf`;
}
