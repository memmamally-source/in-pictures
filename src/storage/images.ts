import { readExif } from './exif';

/**
 * Turns a picked file into three stored versions:
 *   thumb   480 px  – grids and the editor tray
 *   display 1600 px – album pages on screen
 *   full    ≤3600 px – PDF export (3000 px covers a full 8 × 10 in page at 300 dpi)
 * Photos are decoded one at a time and canvases are released straight away,
 * so a batch of large phone photos doesn't exhaust memory on iPhone Safari.
 */

export const SIZES = { thumb: 480, display: 1600, full: 3600 } as const;

export interface Processed {
  thumb: Blob;
  display: Blob;
  full: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  takenAt?: string;
}

export const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic,image/heif';

export class UnsupportedImageError extends Error {}

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      // Browsers apply the EXIF orientation by default ('from-image').
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // Fall through to <img>, which some browsers decode more formats with (e.g. HEIC on Safari).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new UnsupportedImageError('This browser can’t open this image format. Try JPG, PNG or WebP (on iPhone, “Most Compatible” camera format).');
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality));
}

async function resize(source: CanvasImageSource, w: number, h: number, max: number, quality: number): Promise<{ blob: Blob; w: number; h: number }> {
  const scale = Math.min(1, max / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black
  ctx.fillRect(0, 0, tw, th);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, tw, th);
  const blob = await toBlob(canvas, quality);
  canvas.width = canvas.height = 0; // free the backing store now (matters on iOS)
  return { blob, w: tw, h: th };
}

export async function processImage(file: File): Promise<Processed> {
  let takenAt: string | undefined;
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) {
    takenAt = readExif(await file.slice(0, 256 * 1024).arrayBuffer()).takenAt;
  }
  const img = await decode(file);
  try {
    const full = await resize(img.source, img.width, img.height, SIZES.full, 0.9);
    const display = await resize(img.source, img.width, img.height, SIZES.display, 0.85);
    const thumb = await resize(img.source, img.width, img.height, SIZES.thumb, 0.8);
    return {
      full: full.blob,
      display: display.blob,
      thumb: thumb.blob,
      width: full.w,
      height: full.h,
      originalWidth: img.width,
      originalHeight: img.height,
      takenAt,
    };
  } finally {
    img.close();
  }
}

export function isProbablyImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
}
