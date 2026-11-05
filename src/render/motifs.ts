import type { Rect } from '@/layouts/schema';

import type { ResolvedPart } from './scene';

/**
 * Flat illustrations for poster covers (Bold Graphic). Drawn in a 100 × 100
 * box and scaled into place, so they render identically on screen and in
 * the PDF. Colours are fixed per motif, like a printed design.
 */

type Part = { d: string; fill?: string; stroke?: string; sw?: number; opacity?: number };

const C = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
const E = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
const R = (x: number, y: number, w: number, h: number) => `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`;

const MOTIFS: Record<string, Part[]> = {
  lemon: [
    { d: 'M50 30C72 26 88 44 86 62C84 80 64 90 46 86C26 82 14 64 18 48C21 36 34 31 50 30Z', fill: '#F7D046' },
    { d: 'M60 40C70 42 76 50 77 58', stroke: '#FFF3B0', sw: 3 },
    { d: 'M50 30C46 18 52 8 66 6C70 20 62 28 50 30Z', fill: '#3E8E4B' },
    { d: 'M50 30C55 22 59 16 64 9', stroke: '#2B6B37', sw: 1.6 },
    { d: 'M50 30C47 27 46 24 47 21', stroke: '#6B4A2B', sw: 2.4 },
  ],
  tram: [
    { d: 'M30 18L50 4L70 18', stroke: '#2B2B2B', sw: 2 },
    { d: R(14, 22, 72, 52), fill: '#F2B632' },
    { d: R(14, 22, 72, 8), fill: '#E0A11E' },
    { d: `${R(20, 34, 14, 14)}${R(38, 34, 14, 14)}${R(56, 34, 12, 14)}${R(72, 34, 9, 22)}`, fill: '#4B8FC6' },
    { d: R(14, 60, 72, 6), fill: '#FFFFFF' },
    { d: `${C(30, 80, 6)}${C(70, 80, 6)}`, fill: '#2B2B2B' },
    { d: R(8, 86, 84, 3), fill: '#2B2B2B' },
  ],
  palm: [
    { d: C(70, 30, 16), fill: '#F29E4C' },
    { d: 'M48 92C50 70 46 52 40 36', stroke: '#7A4E2D', sw: 6 },
    { d: 'M40 36C28 26 14 28 6 38C20 34 30 36 40 36ZM40 36C46 22 60 16 74 20C60 24 50 28 40 36ZM40 36C30 18 34 8 44 4C42 16 42 26 40 36ZM40 36C54 34 66 40 72 52C60 44 50 40 40 36ZM40 36C30 42 22 54 22 66C30 54 34 44 40 36Z', fill: '#2E8B57' },
    { d: 'M20 92Q50 84 80 92Z', fill: '#E9C98A' },
  ],
  sunset: [
    { d: 'M18 56A32 32 0 0 1 82 56Z', fill: '#F26B4F' },
    { d: `${R(10, 60, 80, 5)}${R(18, 70, 64, 5)}${R(28, 80, 44, 5)}`, fill: '#2C6FA6' },
  ],
  mountain: [
    { d: C(76, 24, 10), fill: '#F7D046' },
    { d: 'M4 90L36 30L60 72L72 52L96 90Z', fill: '#2F4A73' },
    { d: 'M36 30L46 48L40 46L34 52L28 44Z', fill: '#FFFFFF' },
    { d: 'M72 52L79 64L74 62L70 66L66 61Z', fill: '#FFFFFF' },
    { d: 'M4 90Q30 80 50 86Q72 92 96 84L96 90Z', fill: '#3E8E4B' },
  ],
  plane: [
    { d: 'M10 70Q30 60 44 62', stroke: '#FFFFFF', sw: 2.4, opacity: 0.9 },
    { d: 'M20 78Q34 72 42 72', stroke: '#FFFFFF', sw: 2, opacity: 0.7 },
    { d: 'M40 58L84 30C90 27 95 31 91 36L58 66L60 86L52 84L46 70L34 72L30 64Z', fill: '#1E3A5F' },
    { d: 'M58 46L36 34L42 30L68 38Z', fill: '#1E3A5F' },
  ],
  heart: [
    { d: 'M50 86C22 66 10 50 14 34C18 20 34 14 50 28C66 14 82 20 86 34C90 50 78 66 50 86Z', fill: '#E04A5F' },
    { d: 'M28 30C24 34 22 40 24 46', stroke: '#FFFFFF', sw: 3, opacity: 0.7 },
  ],
  cake: [
    { d: R(18, 54, 64, 30), fill: '#FFFFFF' },
    { d: 'M18 54Q26 62 34 54Q42 62 50 54Q58 62 66 54Q74 62 82 54L82 58L18 58Z', fill: '#F29BB8' },
    { d: R(28, 32, 44, 22), fill: '#FDE7EF' },
    { d: 'M28 32Q36 40 44 32Q52 40 60 32Q66 38 72 32L72 36L28 36Z', fill: '#F29BB8' },
    { d: `${R(38, 18, 3, 14)}${R(49, 18, 3, 14)}${R(60, 18, 3, 14)}`, fill: '#6A3FF0' },
    { d: `${E(39.5, 14, 2.4, 4)}${E(50.5, 14, 2.4, 4)}${E(61.5, 14, 2.4, 4)}`, fill: '#F7B32B' },
    { d: R(12, 84, 76, 4), fill: '#C9A58A' },
  ],
  paw: [
    { d: 'M50 88C34 88 26 78 30 68C34 58 44 54 50 54C56 54 66 58 70 68C74 78 66 88 50 88Z', fill: '#2B2420' },
    { d: `${E(26, 46, 8, 11)}${E(42, 30, 8, 12)}${E(58, 30, 8, 12)}${E(74, 46, 8, 11)}`, fill: '#2B2420' },
  ],
  flower: [
    { d: 'M50 56Q48 76 52 96', stroke: '#3E8E4B', sw: 4 },
    { d: 'M51 80Q64 70 74 74Q64 84 51 80Z', fill: '#3E8E4B' },
    { d: `${C(50, 20, 13)}${C(69, 31, 13)}${C(69, 52, 13)}${C(50, 63, 13)}${C(31, 52, 13)}${C(31, 31, 13)}`, fill: '#F29BB8' },
    { d: C(50, 41.5, 11), fill: '#F7D046' },
  ],
  pine: [
    { d: 'M50 8L72 38L60 38L80 64L64 64L86 88L14 88L36 64L20 64L40 38L28 38Z', fill: '#2E7D4F' },
    { d: R(45, 88, 10, 8), fill: '#7A4E2D' },
    { d: 'M50 0L53 8L61 8L55 13L57 21L50 16L43 21L45 13L39 8L47 8Z', fill: '#F7D046' },
    { d: `${C(40, 52, 2.6)}${C(62, 72, 2.6)}${C(34, 78, 2.6)}${C(56, 44, 2.6)}`, fill: '#E04A5F' },
  ],
  skyline: [
    { d: `${R(6, 50, 16, 40)}${R(24, 30, 14, 60)}${R(40, 12, 12, 78)}${R(54, 38, 16, 52)}${R(72, 24, 12, 66)}${R(86, 56, 10, 34)}`, fill: '#2B3A55' },
    { d: 'M46 12L46 2', stroke: '#2B3A55', sw: 2 },
    { d: `${R(28, 36, 3, 4)}${R(33, 44, 3, 4)}${R(44, 22, 3, 4)}${R(44, 40, 3, 4)}${R(58, 46, 3, 4)}${R(64, 58, 3, 4)}${R(76, 32, 3, 4)}${R(76, 48, 3, 4)}${R(10, 60, 3, 4)}`, fill: '#F7D046' },
  ],
  moon: [
    { d: 'M62 14C40 16 26 36 30 58C34 80 56 92 76 86C58 84 44 68 46 48C48 32 54 22 62 14Z', fill: '#F7D046' },
    { d: 'M78 30L80 36L86 38L80 40L78 46L76 40L70 38L76 36ZM20 22L21.5 26L26 27.5L21.5 29L20 33L18.5 29L14 27.5L18.5 26Z', fill: '#FFFFFF' },
  ],
  camera: [
    { d: R(12, 30, 76, 50), fill: '#2B2B2B' },
    { d: R(30, 22, 18, 10), fill: '#2B2B2B' },
    { d: C(50, 55, 18), fill: '#FFFFFF' },
    { d: C(50, 55, 12), fill: '#4B8FC6' },
    { d: C(45, 50, 3.5), fill: '#FFFFFF', opacity: 0.8 },
    { d: R(70, 36, 10, 6), fill: '#F26B4F' },
  ],
  rings: [
    { d: C(40, 56, 20), stroke: '#D4A93A', sw: 6 },
    { d: C(62, 56, 20), stroke: '#E9C86A', sw: 6 },
    { d: 'M40 30L36 24L44 24Z', fill: '#FFFFFF' },
  ],
  boat: [
    { d: 'M50 10L50 66', stroke: '#2B2B2B', sw: 2.4 },
    { d: 'M52 14L80 62L52 62Z', fill: '#FFFFFF' },
    { d: 'M48 20L26 62L48 62Z', fill: '#F26B4F' },
    { d: 'M16 68L84 68L74 82L26 82Z', fill: '#1E3A5F' },
    { d: 'M6 88Q18 84 30 88T54 88T78 88T96 88', stroke: '#4B8FC6', sw: 3 },
  ],
  lighthouse: [
    { d: 'M40 30L60 30L66 88L34 88Z', fill: '#FFFFFF' },
    { d: 'M38.6 44L61.4 44L62.6 54L37.4 54ZM36.5 64L63.5 64L64.7 74L35.3 74Z', fill: '#E04A5F' },
    { d: R(42, 18, 16, 12), fill: '#F7D046' },
    { d: 'M40 18L50 8L60 18Z', fill: '#2B2B2B' },
    { d: 'M58 22L94 12L94 30Z', fill: '#F7D046', opacity: 0.55 },
    { d: 'M26 88L74 88L80 94L20 94Z', fill: '#55504A' },
  ],
  balloon: [
    { d: 'M34 54Q38 74 50 92M62 50Q60 72 50 92M50 44Q50 70 50 92', stroke: '#55504A', sw: 1.2 },
    { d: E(34, 36, 13, 16), fill: '#E04A5F' },
    { d: E(62, 32, 13, 16), fill: '#F7D046' },
    { d: E(50, 26, 13, 16), fill: '#2FA39A' },
  ],
};

export const MOTIF_NAMES = Object.keys(MOTIFS);

/** Scales an absolute-command SVG path from the 100 × 100 box into `r`. */
export function fitPath(d: string, r: Rect): string {
  const s = Math.min(r.w, r.h) / 100;
  const ox = r.x + (r.w - 100 * s) / 2;
  const oy = r.y + (r.h - 100 * s) / 2;
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let out = '';
  let cmd = '';
  let args: number[] = [];
  const f = (n: number) => Math.round(n * 100) / 100;
  const flush = () => {
    if (!cmd) return;
    const a = args;
    const pt = (i: number) => `${f(ox + a[i] * s)} ${f(oy + a[i + 1] * s)}`;
    if (cmd === 'Z') out += 'Z';
    else if (cmd === 'H') out += `H${f(ox + a[0] * s)}`;
    else if (cmd === 'V') out += `V${f(oy + a[0] * s)}`;
    else if (cmd === 'A') {
      for (let i = 0; i + 6 < a.length + 1; i += 7) out += `A${f(a[i] * s)} ${f(a[i + 1] * s)} ${a[i + 2]} ${a[i + 3]} ${a[i + 4]} ${pt(i + 5)}`;
    } else {
      out += cmd;
      const pts: string[] = [];
      for (let i = 0; i + 1 < a.length; i += 2) pts.push(pt(i));
      out += pts.join(' ');
    }
  };
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      flush();
      cmd = t.toUpperCase();
      args = [];
    } else args.push(Number(t));
  }
  flush();
  return out;
}

export function motifParts(name: string | undefined, r: Rect): ResolvedPart[] {
  const parts = MOTIFS[name ?? ''] ?? MOTIFS.camera;
  return parts.map((p) => ({ d: fitPath(p.d, r), fill: p.fill, stroke: p.stroke, strokeWidth: p.sw ? (p.sw * Math.min(r.w, r.h)) / 100 : undefined, opacity: p.opacity }));
}

/** Picks an illustration from where the album is set, else the occasion. */
export function chooseMotif(occasionId: string, place = '', title = ''): string {
  const text = `${place} ${title}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/sicil|amalfi|sorrento|capri|positano|lemon|menton|limoncello/, 'lemon'],
    [/lisbon|porto|san francisco|tram|budapest|prague/, 'tram'],
    [/lighthouse|maine|cape cod|brittany|nova scotia/, 'lighthouse'],
    [/sail|yacht|regatta|harbou?r|marina|boat/, 'boat'],
    [/bali|thailand|phuket|caribbean|bahamas|hawaii|maldives|mauritius|tropic|miami|zanzibar|fiji|cancun|jamaica|seychelles|barbados|key west/, 'palm'],
    [/greece|santorini|mykonos|crete|ibiza|mallorca|majorca|beach|coast|island|riviera|algarve|seaside|cornwall|croatia/, 'sunset'],
    [/alps|ski|mountain|swiss|switzerland|norway|iceland|patagonia|rockies|himalaya|dolomit|lake district|highlands|fuji/, 'mountain'],
    [/new york|london|tokyo|paris|city|chicago|dubai|singapore|hong kong|berlin|seoul/, 'skyline'],
    [/christmas|xmas|winter|noel|advent/, 'pine'],
  ];
  for (const [re, motif] of rules) if (re.test(text)) return motif;
  const byOccasion: Record<string, string> = {
    'international-travel': 'plane', staycation: 'sunset', honeymoon: 'heart', anniversary: 'heart', birthday: 'cake', wedding: 'rings',
    engagement: 'rings', graduation: 'flower', 'baby-first-year': 'moon', 'family-gathering': 'heart', 'theme-park': 'balloon',
    'road-trip': 'mountain', festival: 'balloon', seasonal: 'pine', friendship: 'flower', school: 'balloon', sport: 'flower',
    pets: 'paw', everyday: 'flower', 'date-night': 'heart', 'work-event': 'skyline', custom: 'camera',
  };
  return byOccasion[occasionId] ?? 'camera';
}
