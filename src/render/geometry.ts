import type { Focal } from '@/domain/types';
import type { FrameStyle, PhotoFrame, Rect } from '@/layouts/schema';

/** Where the picture sits inside a frame box, after borders. */
export function innerRect(box: Rect, style: FrameStyle): Rect {
  const m = Math.min(box.w, box.h);
  switch (style) {
    case 'mat': {
      const b = Math.max(1, Math.min(2.4, m * 0.045));
      return { x: box.x + b, y: box.y + b, w: box.w - 2 * b, h: box.h - 2 * b };
    }
    case 'polaroid': {
      const side = box.w * 0.06;
      const bottom = box.w * 0.2;
      return { x: box.x + side, y: box.y + side, w: box.w - 2 * side, h: box.h - side - bottom };
    }
    case 'stamp': {
      const b = m * 0.075;
      return { x: box.x + b, y: box.y + b, w: box.w - 2 * b, h: box.h - 2 * b };
    }
    case 'mount': {
      const b = Math.max(0.8, m * 0.03);
      return { x: box.x + b, y: box.y + b, w: box.w - 2 * b, h: box.h - 2 * b };
    }
    default:
      return { ...box };
  }
}

/** The caption strip at the bottom of a polaroid. */
export function polaroidCaptionRect(box: Rect): Rect {
  const inner = innerRect(box, 'polaroid');
  const top = inner.y + inner.h;
  return { x: inner.x, y: top + 0.4, w: inner.w, h: box.y + box.h - top - 0.8 };
}

export interface CropRect {
  /** Source rectangle as fractions of the image (0..1). */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Object-fit: cover with a focal point and zoom. Returns which part of the
 * image is visible in a frame of the given aspect. Shared by the screen
 * renderer (CSS percentages) and the PDF renderer (drawImage source rect).
 */
export function coverCrop(imageAspect: number, frameAspect: number, focal: Focal = { x: 0.5, y: 0.5, zoom: 1 }): CropRect {
  const zoom = Math.max(1, Math.min(4, focal.zoom || 1));
  let sw = 1;
  let sh = 1;
  if (imageAspect > frameAspect) sw = frameAspect / imageAspect; // image wider: crop the sides
  else sh = imageAspect / frameAspect; // image taller: crop top/bottom
  sw /= zoom;
  sh /= zoom;
  const clamp = (v: number, size: number) => Math.max(0, Math.min(1 - size, v - size / 2));
  return { sx: clamp(focal.x, sw), sy: clamp(focal.y, sh), sw, sh };
}

/** Share of the photo cut away when it fills a frame (0 = perfect fit). */
export function cropLoss(imageAspect: number, frameAspect: number): number {
  return 1 - Math.min(imageAspect / frameAspect, frameAspect / imageAspect);
}

/**
 * Default focal point. There is no face detection in this version; as a
 * simple heuristic, when a tall photo is cropped to a wider frame we keep
 * the upper part in view, where faces usually are in people photos.
 */
export function defaultFocal(imageAspect: number, frameAspect: number): Focal {
  return { x: 0.5, y: imageAspect < frameAspect ? 0.4 : 0.5, zoom: 1 };
}

export function frameAspect(frame: PhotoFrame, style: FrameStyle): number {
  const r = innerRect(frame, style);
  return r.w / r.h;
}

/** Effective print resolution of a photo in a slot, in pixels per inch. */
export function effectiveDpi(photoPixelsWide: number, crop: CropRect, slotWidthUnits: number, unitsPerInch = 12.5): number {
  const inches = slotWidthUnits / unitsPerInch;
  return (photoPixelsWide * crop.sw) / inches;
}
