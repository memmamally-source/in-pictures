import type { Album, Photo, ThemeId } from '@/domain/types';
import { Brand } from '@/config/brand';
import { FORMATS, PAGE_W, canvasSize } from '@/layouts/schema';
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
  const format = album.format ?? 'portrait';
  const inches = FORMATS[format].inches;
  const pxPerUnit = (q.dpi * inches.w) / PAGE_W;
  const bleed = bleedUnits(quality, format);
  const sheet = { w: inches.w + 2 * q.bleedIn, h: inches.h + 2 * q.bleedIn };
  const orientation = sheet.w > sheet.h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ unit: 'in', format: [sheet.w, sheet.h], orientation, compress: true });
  pdf.setProperties({ title, creator: Brand.name });

  // Every quality prints spreads as two pages; print adds blanks to keep spreads facing.
  const plan = printPlan(album, quality !== 'print' || includeCover);
  // Only print files need an even page count.
  const pages = quality === 'print' || plan.pages.at(-1) !== null ? plan.pages : plan.pages.slice(0, -1);
  const total = pages.length;
  const pageSize = canvasSize(format);
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError');
    const entry = pages[i];
    // A blank page is plain paper in the album's colour.
    const scene = entry
      ? buildScene({ page: entry.page, theme, photos: byId, measure: browserMeasure, bleed, format })
      : { background: theme.colors.page, ops: [], width: pageSize.w, height: pageSize.h };
    const opened: ImageBitmap[] = [];
    const canvas = await renderScene(scene, pxPerUnit, async (photoId) => {
      const blob = (await repo.getBlob(photoId, quality === 'standard' ? 'display' : 'full')) ?? (await repo.getBlob(photoId, 'display'));
      if (!blob) throw new Error('Photo missing');
      const bmp = await createImageBitmap(blob);
      opened.push(bmp);
      return bmp;
    }, bleed);
    opened.forEach((b) => b.close());
    // Half of a spread: cut the page out of the spread canvas (each half keeps bleed on all sides).
    const out = entry?.half ? cropCanvas(canvas, entry.half === 'left' ? 0 : 100 * pxPerUnit, (pageSize.w + 2 * bleed) * pxPerUnit) : canvas;
    const jpeg = await new Promise<Blob>((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('Could not encode page'))), 'image/jpeg', q.jpeg));
    canvas.width = canvas.height = 0;
    out.width = out.height = 0;
    if (i > 0) pdf.addPage([sheet.w, sheet.h], orientation);
    pdf.addImage(new Uint8Array(await jpeg.arrayBuffer()), 'JPEG', 0, 0, sheet.w, sheet.h, undefined, 'NONE');
    onProgress?.(i + 1, total);
    await new Promise((r) => setTimeout(r, 0)); // let the UI breathe between pages
  }
  return pdf.output('blob');
}

function cropCanvas(src: HTMLCanvasElement, x: number, w: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = src.height;
  c.getContext('2d')!.drawImage(src, Math.round(x), 0, c.width, c.height, 0, 0, c.width, c.height);
  return c;
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
