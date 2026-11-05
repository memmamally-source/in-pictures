import type { DecorKind, Rect } from '@/layouts/schema';
import type { BackgroundKind } from '@/layouts/themes';

/**
 * Vector ornaments and paper patterns as SVG path data in page units.
 * Both renderers consume the same strings (inline <svg> on screen, Path2D on
 * the export canvas), so decorations look identical in the preview and PDF.
 * Ornaments never contain text: anything readable comes from the user.
 */

export interface PathPart {
  d: string;
  fill?: string; // 'color' = the item's colour
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

const f = (n: number) => Math.round(n * 100) / 100;

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

function rect(x: number, y: number, w: number, h: number): string {
  return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
}

function star(cx: number, cy: number, outer: number, inner: number, points: number): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / points - Math.PI / 2;
    d += `${i ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** Small deterministic PRNG so patterns don't change between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function decorPaths(kind: DecorKind, r: Rect): PathPart[] {
  const { x, y, w, h } = r;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = Math.min(w, h);
  switch (kind) {
    case 'tape': {
      // Torn ends: a zig-zag on both short edges.
      const teeth = 5;
      let d = `M${f(x)} ${f(y)}`;
      d += `L${f(x + w)} ${f(y)}`;
      for (let i = 1; i <= teeth; i++) d += `L${f(x + w - (i % 2 ? 0.8 : 0))} ${f(y + (h * i) / teeth)}`;
      d += `L${f(x)} ${f(y + h)}`;
      for (let i = teeth - 1; i >= 0; i--) d += `L${f(x + (i % 2 ? 0.8 : 0))} ${f(y + (h * i) / teeth)}`;
      return [{ d: `${d}Z`, fill: 'color', opacity: 0.55 }];
    }
    case 'washi': {
      const parts: PathPart[] = [{ d: rect(x, y, w, h), fill: 'color', opacity: 0.5 }];
      let dots = '';
      for (let i = 0; i < 6; i++) dots += circle(x + (w * (i + 0.5)) / 6, cy, h * 0.14);
      parts.push({ d: dots, fill: '#ffffff', opacity: 0.7 });
      return parts;
    }
    case 'heart': {
      const d = `M${f(cx)} ${f(y + h * 0.95)}C${f(x - w * 0.15)} ${f(y + h * 0.45)} ${f(x + w * 0.15)} ${f(y - h * 0.1)} ${f(cx)} ${f(y + h * 0.28)}C${f(x + w * 0.85)} ${f(y - h * 0.1)} ${f(x + w * 1.15)} ${f(y + h * 0.45)} ${f(cx)} ${f(y + h * 0.95)}Z`;
      return [{ d, fill: 'color', opacity: 0.85 }];
    }
    case 'star':
      return [{ d: star(cx, cy, s / 2, s / 4.4, 5), fill: 'color', opacity: 0.85 }];
    case 'sparkle':
      return [{ d: star(cx, cy, s / 2, s / 9, 4) + star(x + w * 0.85, y + h * 0.15, s / 6, s / 22, 4), fill: 'color' }];
    case 'flower': {
      let d = '';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        d += circle(cx + Math.cos(a) * s * 0.26, cy + Math.sin(a) * s * 0.26, s * 0.22);
      }
      return [{ d, fill: 'color', opacity: 0.6 }, { d: circle(cx, cy, s * 0.14), fill: 'color' }];
    }
    case 'leaf': {
      const d = `M${f(x)} ${f(y + h)}Q${f(x)} ${f(y)} ${f(x + w)} ${f(y)}Q${f(x + w)} ${f(y + h)} ${f(x)} ${f(y + h)}Z`;
      return [{ d, fill: 'color', opacity: 0.7 }, { d: `M${f(x)} ${f(y + h)}L${f(x + w * 0.8)} ${f(y + h * 0.2)}`, stroke: '#ffffff', strokeWidth: s * 0.04, opacity: 0.7 }];
    }
    case 'sprig': {
      // A curved stem with leaves alternating along it, drawn bottom to top.
      const stem = `M${f(cx)} ${f(y + h)}Q${f(x + w * 0.2)} ${f(y + h * 0.5)} ${f(cx + w * 0.1)} ${f(y)}`;
      let leaves = '';
      for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        const px = cx + (x + w * 0.2 - cx) * 2 * t * (1 - t) + (w * 0.1) * t * t;
        const py = y + h - h * t;
        const dir = i % 2 ? 1 : -1;
        const lx = px + dir * w * 0.32;
        const ly = py - h * 0.06;
        leaves += `M${f(px)} ${f(py)}Q${f((px + lx) / 2)} ${f(py - h * 0.12)} ${f(lx)} ${f(ly)}Q${f((px + lx) / 2)} ${f(py + h * 0.04)} ${f(px)} ${f(py)}Z`;
      }
      return [{ d: stem, stroke: 'color', strokeWidth: s * 0.035 }, { d: leaves, fill: 'color', opacity: 0.75 }];
    }
    case 'postmark': {
      const r0 = h * 0.42;
      const ccx = x + r0 + 0.5;
      let waves = '';
      for (let i = 0; i < 4; i++) {
        const yy = y + h * (0.26 + i * 0.16);
        waves += `M${f(ccx + r0 + 1.5)} ${f(yy)}`;
        for (let k = 0; k < 4; k++) {
          const sx = ccx + r0 + 1.5 + ((w - 2 * r0 - 2) * k) / 4;
          const step = (w - 2 * r0 - 2) / 4;
          waves += `Q${f(sx + step / 4)} ${f(yy - 1)} ${f(sx + step / 2)} ${f(yy)}T${f(sx + step)} ${f(yy)}`;
        }
      }
      return [
        { d: circle(ccx, cy, r0), stroke: 'color', strokeWidth: 0.5, opacity: 0.7 },
        { d: circle(ccx, cy, r0 * 0.72), stroke: 'color', strokeWidth: 0.3, opacity: 0.7 },
        { d: waves, stroke: 'color', strokeWidth: 0.45, opacity: 0.7 },
      ];
    }
    case 'plane': {
      const d = `M${f(x)} ${f(cy)}L${f(x + w)} ${f(y + h * 0.35)}L${f(x + w * 0.45)} ${f(cy + h * 0.05)}L${f(x + w * 0.35)} ${f(y + h)}L${f(x + w * 0.28)} ${f(cy + h * 0.1)}Z`;
      return [{ d, fill: 'color', opacity: 0.8 }];
    }
    case 'compass':
      return [
        { d: circle(cx, cy, s * 0.48), stroke: 'color', strokeWidth: s * 0.04, opacity: 0.7 },
        { d: `M${f(cx)} ${f(y + s * 0.08)}L${f(cx + s * 0.1)} ${f(cy)}L${f(cx)} ${f(y + h - s * 0.08)}L${f(cx - s * 0.1)} ${f(cy)}Z`, fill: 'color', opacity: 0.8 },
      ];
    case 'divider': {
      const d = `M${f(x)} ${f(cy)}H${f(cx - h * 0.7)}M${f(cx + h * 0.7)} ${f(cy)}H${f(x + w)}`;
      return [{ d, stroke: 'color', strokeWidth: 0.3 }, { d: `M${f(cx)} ${f(cy - h * 0.4)}L${f(cx + h * 0.4)} ${f(cy)}L${f(cx)} ${f(cy + h * 0.4)}L${f(cx - h * 0.4)} ${f(cy)}Z`, fill: 'color' }];
    }
    case 'flourish': {
      const d = `M${f(x)} ${f(cy)}C${f(x + w * 0.2)} ${f(y)} ${f(x + w * 0.3)} ${f(y + h)} ${f(cx)} ${f(cy)}C${f(x + w * 0.7)} ${f(y)} ${f(x + w * 0.8)} ${f(y + h)} ${f(x + w)} ${f(cy)}`;
      return [{ d, stroke: 'color', strokeWidth: 0.35 }, { d: circle(cx, cy, h * 0.16), fill: 'color' }];
    }
    case 'double-border':
      return [
        { d: rect(x, y, w, h), stroke: 'color', strokeWidth: 0.45 },
        { d: rect(x + 1.4, y + 1.4, w - 2.8, h - 2.8), stroke: 'color', strokeWidth: 0.2 },
      ];
    case 'corners': {
      // Classic photo-album corner mounts.
      const c = Math.min(w, h) * 0.12;
      const d =
        `M${f(x)} ${f(y)}h${f(c)}L${f(x)} ${f(y + c)}Z` +
        `M${f(x + w)} ${f(y)}v${f(c)}L${f(x + w - c)} ${f(y)}Z` +
        `M${f(x + w)} ${f(y + h)}h${f(-c)}L${f(x + w)} ${f(y + h - c)}Z` +
        `M${f(x)} ${f(y + h)}v${f(-c)}L${f(x + c)} ${f(y + h)}Z`;
      return [{ d, fill: 'color' }];
    }
    case 'airmail': {
      let red = '';
      let blue = '';
      const step = 6;
      for (let i = 0, px = x - h; px < x + w; i++, px += step) {
        const seg = `M${f(px)} ${f(y + h)}L${f(px + h)} ${f(y)}L${f(px + h + step / 2)} ${f(y)}L${f(px + step / 2)} ${f(y + h)}Z`;
        if (i % 2) blue += seg;
        else red += seg;
      }
      return [{ d: red, fill: '#D7263D', opacity: 0.9 }, { d: blue, fill: '#1F4E8C', opacity: 0.9 }];
    }
    case 'confetti':
    case 'dots-row': {
      let d = '';
      const n = Math.max(3, Math.round(w / 4));
      for (let i = 0; i < n; i++) d += circle(x + (w * (i + 0.5)) / n, cy, h * 0.3);
      return [{ d, fill: 'color', opacity: 0.6 }];
    }
    case 'sun': {
      let rays = '';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rays += `M${f(cx + Math.cos(a) * s * 0.32)} ${f(cy + Math.sin(a) * s * 0.32)}L${f(cx + Math.cos(a) * s * 0.48)} ${f(cy + Math.sin(a) * s * 0.48)}`;
      }
      return [{ d: circle(cx, cy, s * 0.24), fill: 'color', opacity: 0.8 }, { d: rays, stroke: 'color', strokeWidth: s * 0.04, opacity: 0.8 }];
    }
    case 'strip':
      return [{ d: rect(x, y, w, h), fill: 'color' }];
    case 'rule':
      return [{ d: `M${f(x)} ${f(cy)}H${f(x + w)}`, stroke: 'color', strokeWidth: 0.25 }];
    case 'scallop-border': {
      let d = '';
      const r0 = 1.2;
      for (let px = x + r0; px < x + w; px += r0 * 2) d += circle(px, y, r0) + circle(px, y + h, r0);
      for (let py = y + r0; py < y + h; py += r0 * 2) d += circle(x, py, r0) + circle(x + w, py, r0);
      return [{ d, fill: 'color', opacity: 0.5 }];
    }
    case 'shade-bottom':
      return [{ d: rect(x, y, w, h), fill: 'shade' }];
  }
}

/** Perforated postage-stamp outline (the paper behind a 'stamp' frame). */
export function stampPath(r: Rect): string {
  const hole = Math.max(0.55, Math.min(r.w, r.h) * 0.022);
  const step = hole * 2.6;
  const nx = Math.max(4, Math.round(r.w / step));
  const ny = Math.max(4, Math.round(r.h / step));
  const sx = r.w / nx;
  const sy = r.h / ny;
  let d = `M${f(r.x)} ${f(r.y)}`;
  for (let i = 0; i < nx; i++) {
    const mx = r.x + sx * (i + 0.5);
    d += `L${f(mx - hole)} ${f(r.y)}A${f(hole)} ${f(hole)} 0 0 0 ${f(mx + hole)} ${f(r.y)}`;
  }
  d += `L${f(r.x + r.w)} ${f(r.y)}`;
  for (let i = 0; i < ny; i++) {
    const my = r.y + sy * (i + 0.5);
    d += `L${f(r.x + r.w)} ${f(my - hole)}A${f(hole)} ${f(hole)} 0 0 0 ${f(r.x + r.w)} ${f(my + hole)}`;
  }
  d += `L${f(r.x + r.w)} ${f(r.y + r.h)}`;
  for (let i = nx - 1; i >= 0; i--) {
    const mx = r.x + sx * (i + 0.5);
    d += `L${f(mx + hole)} ${f(r.y + r.h)}A${f(hole)} ${f(hole)} 0 0 0 ${f(mx - hole)} ${f(r.y + r.h)}`;
  }
  d += `L${f(r.x)} ${f(r.y + r.h)}`;
  for (let i = ny - 1; i >= 0; i--) {
    const my = r.y + sy * (i + 0.5);
    d += `L${f(r.x)} ${f(my + hole)}A${f(hole)} ${f(hole)} 0 0 0 ${f(r.x)} ${f(my - hole)}`;
  }
  return `${d}Z`;
}

/** Clip outline for a photo shape. */
export function shapePath(r: Rect, shape: 'rect' | 'rounded' | 'arch' | 'circle', radius: number): string {
  if (shape === 'circle') {
    const rx = r.w / 2;
    const ry = r.h / 2;
    return `M${f(r.x)} ${f(r.y + ry)}a${f(rx)} ${f(ry)} 0 1 0 ${f(r.w)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-r.w)} 0Z`;
  }
  if (shape === 'arch') {
    const rr = Math.min(r.w / 2, r.h);
    return `M${f(r.x)} ${f(r.y + r.h)}V${f(r.y + rr)}A${f(rr)} ${f(rr)} 0 0 1 ${f(r.x + r.w)} ${f(r.y + rr)}V${f(r.y + r.h)}Z`;
  }
  if (shape === 'rounded' && radius > 0) {
    const k = Math.min(radius, r.w / 2, r.h / 2);
    return `M${f(r.x + k)} ${f(r.y)}H${f(r.x + r.w - k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + r.w)} ${f(r.y + k)}V${f(r.y + r.h - k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + r.w - k)} ${f(r.y + r.h)}H${f(r.x + k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x)} ${f(r.y + r.h - k)}V${f(r.y + k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + k)} ${f(r.y)}Z`;
  }
  return rect(r.x, r.y, r.w, r.h);
}

/** Paper patterns, generated once per kind (deterministic). */
const patternCache = new Map<string, PathPart[]>();
export function backgroundPaths(kind: BackgroundKind, W: number, H: number): PathPart[] {
  const key = `${kind}:${W}x${H}`;
  const hit = patternCache.get(key);
  if (hit) return hit;
  let parts: PathPart[] = [];
  const rnd = mulberry32(kind.length * 7919);
  switch (kind) {
    case 'dots': {
      let d = '';
      for (let yy = 5; yy < H; yy += 5) for (let xx = 5; xx < W; xx += 5) d += circle(xx, yy, 0.28);
      parts = [{ d, fill: 'pattern', opacity: 0.9 }];
      break;
    }
    case 'grid': {
      let d = '';
      for (let xx = 5; xx < W; xx += 5) d += `M${xx} 0V${H}`;
      for (let yy = 5; yy < H; yy += 5) d += `M0 ${yy}H${W}`;
      parts = [{ d, stroke: 'pattern', strokeWidth: 0.12, opacity: 0.9 }];
      break;
    }
    case 'lines': {
      let d = '';
      for (let yy = 12; yy < H; yy += 6) d += `M0 ${yy}H${W}`;
      parts = [{ d, stroke: 'pattern', strokeWidth: 0.15 }, { d: `M12 0V${H}`, stroke: '#FF7A7A', strokeWidth: 0.25 }];
      break;
    }
    case 'kraft': {
      let d = '';
      for (let i = 0; i < 260; i++) {
        const px = rnd() * W;
        const py = rnd() * H;
        const a = rnd() * Math.PI;
        const len = 0.6 + rnd() * 1.8;
        d += `M${f(px)} ${f(py)}l${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}`;
      }
      parts = [{ d, stroke: 'pattern', strokeWidth: 0.18, opacity: 0.9 }];
      break;
    }
    case 'linen': {
      let d = '';
      for (let yy = 0.8; yy < H; yy += 1.6) d += `M0 ${f(yy)}H${W}`;
      for (let xx = 0.8; xx < W; xx += 1.6) d += `M${f(xx)} 0V${H}`;
      parts = [{ d, stroke: 'pattern', strokeWidth: 0.08, opacity: 0.45 }];
      break;
    }
    case 'confetti': {
      let d1 = '';
      let d2 = '';
      for (let i = 0; i < 70; i++) {
        const px = rnd() * W;
        const py = rnd() * H;
        const r0 = 0.35 + rnd() * 0.5;
        if (i % 2) d1 += circle(px, py, r0);
        else d2 += rect(px, py, r0 * 1.8, r0 * 0.7);
      }
      parts = [{ d: d1, fill: 'accent', opacity: 0.5 }, { d: d2, fill: 'accent2', opacity: 0.45 }];
      break;
    }
    case 'deckle':
      parts = [{ d: rect(2.5, 2.5, W - 5, H - 5), stroke: 'pattern', strokeWidth: 0.6 }];
      break;
    case 'plain':
      parts = [];
  }
  patternCache.set(key, parts);
  return parts;
}
