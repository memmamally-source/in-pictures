
import type { ResolvedPart, Scene, Xform } from './scene';
import { cssFont } from './text';
import { linePositions } from './textLayout';

/**
 * Draws a scene onto a canvas at `pxPerUnit` resolution, for the PDF. Uses the
 * same display list as the on-screen SVG.
 */

export type ImageLoader = (photoId: string) => Promise<CanvasImageSource & { width: number; height: number }>;

function withXf(ctx: CanvasRenderingContext2D, xf: Xform | undefined, draw: () => void) {
  ctx.save();
  if (xf) {
    ctx.translate(xf.cx, xf.cy);
    ctx.rotate((xf.rot * Math.PI) / 180);
    ctx.translate(-xf.cx, -xf.cy);
  }
  draw();
  ctx.restore();
}

function drawParts(ctx: CanvasRenderingContext2D, parts: ResolvedPart[]) {
  for (const p of parts) {
    const path = new Path2D(p.d);
    ctx.save();
    ctx.globalAlpha = p.opacity ?? 1;
    if (p.shade) {
      const box = boundsOf(p.d);
      const g = p.shade === 'up' ? ctx.createLinearGradient(0, box.y1, 0, box.y0) : ctx.createLinearGradient(0, box.y0, 0, box.y1);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, p.shade === 'up' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.55)');
      ctx.fillStyle = g;
      ctx.fill(path);
    } else if (p.fill) {
      ctx.fillStyle = p.fill;
      ctx.fill(path);
    }
    if (p.stroke) {
      ctx.strokeStyle = p.stroke;
      ctx.lineWidth = p.strokeWidth ?? 0.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke(path);
    }
    ctx.restore();
  }
}

/** Vertical extent of a path made of absolute M/H/V/L commands (enough for shade rects). */
function boundsOf(d: string): { y0: number; y1: number } {
  const m = /^M([\d.-]+) ([\d.-]+)h[\d.-]+v([\d.-]+)/.exec(d);
  if (m) return { y0: Number(m[2]), y1: Number(m[2]) + Number(m[3]) };
  return { y0: 0, y1: 1000 };
}

/** `bleed` (page units) adds that much paper on every side, for print. Build the scene with the same bleed. */
/** The cropped part of an image in black and white (pixel by pixel, so it works in every browser). */
function grayscale(img: CanvasImageSource & { width: number; height: number }, crop: { sx: number; sy: number; sw: number; sh: number }): HTMLCanvasElement | null {
  const w = Math.max(1, Math.round(crop.sw * img.width));
  const h = Math.max(1, Math.round(crop.sh * img.height));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  g.drawImage(img, crop.sx * img.width, crop.sy * img.height, w, h, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
  g.putImageData(data, 0, 0);
  return c;
}

export async function renderScene(scene: Scene, pxPerUnit: number, load: ImageLoader, bleed = 0): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((scene.width + 2 * bleed) * pxPerUnit);
  canvas.height = Math.round((scene.height + 2 * bleed) * pxPerUnit);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.scale(pxPerUnit, pxPerUnit);
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, scene.width + 2 * bleed, scene.height + 2 * bleed);
  ctx.translate(bleed, bleed);
  ctx.imageSmoothingQuality = 'high';

  for (const op of scene.ops) {
    if (op.t === 'path') {
      withXf(ctx, op.xf, () => {
        if (op.shift) ctx.translate(-op.shift, -op.shift);
        drawParts(ctx, op.parts);
      });
    } else if (op.t === 'frame') {
      const img = op.photo ? await load(op.photo.id).catch(() => null) : null;
      withXf(ctx, op.xf, () => {
        if (op.shadow) {
          ctx.save();
          ctx.shadowColor = 'rgba(58,42,26,0.22)';
          ctx.shadowBlur = 1.4 * pxPerUnit;
          ctx.shadowOffsetY = 0.5 * pxPerUnit;
          ctx.fillStyle = op.paper ? op.paperColor : '#fff';
          ctx.fill(new Path2D(op.paper ?? op.clip));
          ctx.restore();
        } else if (op.paper) {
          ctx.fillStyle = op.paperColor;
          ctx.fill(new Path2D(op.paper));
        }
        if (img && op.photo) {
          const { crop } = op.photo;
          ctx.save();
          ctx.clip(new Path2D(op.clip));
          const src = op.mono ? grayscale(img, crop) : null;
          if (src) ctx.drawImage(src, op.inner.x, op.inner.y, op.inner.w, op.inner.h);
          else ctx.drawImage(img, crop.sx * img.width, crop.sy * img.height, crop.sw * img.width, crop.sh * img.height, op.inner.x, op.inner.y, op.inner.w, op.inner.h);
          if (src) src.width = src.height = 0;
          ctx.restore();
        }
        if (op.over) drawParts(ctx, op.over);
      });
    } else {
      withXf(ctx, op.xf, () => {
        // Draw text at 10× font size under a 1/10 scale: avoids tiny fractional font sizes.
        ctx.save();
        ctx.scale(0.1, 0.1);
        ctx.font = cssFont(op.font, op.size * 10);
        ctx.fillStyle = op.color;
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = op.align;
        const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
        if (op.font.tracking && 'letterSpacing' in c) c.letterSpacing = `${op.font.tracking * op.size * 10}px`;
        for (const l of linePositions(op)) ctx.fillText(l.text, l.x * 10, l.y * 10);
        ctx.restore();
      });
    }
  }
  return canvas;
}
