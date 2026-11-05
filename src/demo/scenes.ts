/**
 * Illustrated stand-ins for photos, used only by the home-page showcase so
 * people can see what an album looks like before adding their own. Flat
 * vector scenes, generated in code (no stock photos, nothing downloaded).
 */

export type SceneKind =
  | 'sea-sunset' | 'village' | 'beach' | 'table' | 'mountains' | 'night' | 'flowers' | 'cake'
  | 'balloons' | 'ferris' | 'palms' | 'harbour' | 'couple' | 'lemons';

export interface DemoScene {
  kind: SceneKind;
  width: number;
  height: number;
}

const svg = (w: number, h: number, body: string, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;

const sky = (id: string, top: string, bottom: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

function body(kind: SceneKind, w: number, h: number): string {
  switch (kind) {
    case 'sea-sunset':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.62}" cy="${h * 0.52}" r="${h * 0.16}" fill="#FFE38A"/>
         <rect y="${h * 0.6}" width="${w}" height="${h * 0.4}" fill="#3A5BA8"/>
         ${[0.66, 0.74, 0.83, 0.92].map((y, i) => `<rect x="${w * (0.4 + i * 0.03)}" y="${h * y}" width="${w * (0.44 - i * 0.06)}" height="${h * 0.012}" rx="3" fill="#FFD27A" opacity="${0.9 - i * 0.18}"/>`).join('')}
         <path d="M${w * 0.2} ${h * 0.66}h${w * 0.12}l-${w * 0.02} ${h * 0.04}h-${w * 0.08}z" fill="#1E2A4A"/><path d="M${w * 0.26} ${h * 0.66}V${h * 0.52}l${w * 0.05} ${h * 0.12}z" fill="#FFF4E0"/>`,
        sky('s', '#FF8A5B', '#FFC56E'));
    case 'village':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="#2D6FD6"/>
         ${[[0.05, 0.5, 0.3, 0.3], [0.3, 0.42, 0.28, 0.38], [0.55, 0.55, 0.38, 0.25], [0.12, 0.64, 0.4, 0.16], [0.6, 0.38, 0.25, 0.2]]
           .map(([x, y, bw, bh]) => `<rect x="${w * x}" y="${h * y}" width="${w * bw}" height="${h * bh}" fill="#FFFFFF" stroke="#E6EEF8" stroke-width="2"/><rect x="${w * (x + bw * 0.4)}" y="${h * (y + bh * 0.45)}" width="${w * bw * 0.18}" height="${h * bh * 0.3}" fill="#2D6FD6"/>`).join('')}
         <path d="M${w * 0.36} ${h * 0.42}a${w * 0.08} ${w * 0.08} 0 0 1 ${w * 0.16} 0z" fill="#1F55C4"/><rect x="${w * 0.435}" y="${h * 0.28}" width="${w * 0.01}" height="${h * 0.06}" fill="#fff"/>
         <path d="M${w * 0.66} ${h * 0.38}a${w * 0.06} ${w * 0.06} 0 0 1 ${w * 0.12} 0z" fill="#1F55C4"/>
         <circle cx="${w * 0.85}" cy="${h * 0.13}" r="${w * 0.07}" fill="#FFF1A8"/>`,
        sky('s', '#62C4FF', '#C8EDFF'));
    case 'beach':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><rect y="${h * 0.45}" width="${w}" height="${h * 0.22}" fill="#14B8C6"/>
         <path d="M0 ${h * 0.62}q${w * 0.25} -${h * 0.06} ${w * 0.5} 0t${w * 0.5} 0V${h}H0z" fill="#FFE3A6"/>
         <path d="M${w * 0.6} ${h * 0.52}a${w * 0.16} ${w * 0.1} 0 0 1 ${w * 0.32} 0z" fill="#FF5C7A"/><path d="M${w * 0.68} ${h * 0.52}a${w * 0.08} ${w * 0.1} 0 0 1 ${w * 0.16} 0z" fill="#FFFFFF" opacity=".85"/>
         <rect x="${w * 0.755}" y="${h * 0.52}" width="${w * 0.01}" height="${h * 0.3}" fill="#6B4A2B"/>
         <rect x="${w * 0.18}" y="${h * 0.78}" width="${w * 0.22}" height="${h * 0.06}" rx="4" fill="#6A3FF0"/><circle cx="${w * 0.1}" cy="${h * 0.15}" r="${w * 0.05}" fill="#FFF7B0"/>`,
        sky('s', '#7FD3FF', '#E6F7FF'));
    case 'table':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="#F3E4CF"/>
         ${[[0.3, 0.32, 0.17, '#FFFFFF'], [0.7, 0.3, 0.14, '#FFFFFF'], [0.5, 0.7, 0.19, '#FFFFFF']].map(([x, y, r, c]) => `<circle cx="${w * +x}" cy="${h * +y}" r="${w * +r}" fill="${c}" stroke="#E7D3B8" stroke-width="3"/>`).join('')}
         <circle cx="${w * 0.3}" cy="${h * 0.32}" r="${w * 0.1}" fill="#FF8A5B"/><circle cx="${w * 0.27}" cy="${h * 0.29}" r="${w * 0.03}" fill="#3FA37C"/>
         <circle cx="${w * 0.7}" cy="${h * 0.3}" r="${w * 0.08}" fill="#FFD166"/><circle cx="${w * 0.5}" cy="${h * 0.7}" r="${w * 0.12}" fill="#E85D75"/>
         <circle cx="${w * 0.12}" cy="${h * 0.75}" r="${w * 0.06}" fill="#9DDCF7" opacity=".8"/><circle cx="${w * 0.88}" cy="${h * 0.68}" r="${w * 0.05}" fill="#C7A2FF" opacity=".8"/>
         <rect x="${w * 0.84}" y="${h * 0.08}" width="${w * 0.03}" height="${h * 0.16}" rx="3" fill="#B0B6C3"/>`);
    case 'mountains':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.78}" cy="${h * 0.22}" r="${h * 0.09}" fill="#FFF2B3"/>
         <path d="M0 ${h * 0.7}L${w * 0.22} ${h * 0.3}L${w * 0.42} ${h * 0.62}L${w * 0.6} ${h * 0.25}L${w} ${h * 0.68}V${h}H0z" fill="#5B6FD6"/>
         <path d="M${w * 0.6} ${h * 0.25}l${w * 0.07} ${h * 0.12}h-${w * 0.14}z" fill="#FFFFFF"/><path d="M${w * 0.22} ${h * 0.3}l${w * 0.06} ${h * 0.1}h-${w * 0.12}z" fill="#FFFFFF"/>
         <path d="M0 ${h * 0.78}Q${w * 0.3} ${h * 0.62} ${w * 0.6} ${h * 0.76}T${w} ${h * 0.72}V${h}H0z" fill="#2EAD7A"/>
         <rect y="${h * 0.86}" width="${w}" height="${h * 0.14}" fill="#46C6E8"/>`,
        sky('s', '#FFB38A', '#FFE7C2'));
    case 'night':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.72}" cy="${h * 0.16}" r="${w * 0.08}" fill="#FFF3C4"/>
         ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 37) % w}" cy="${(i * 53) % (h * 0.5)}" r="${1 + (i % 3)}" fill="#FFFFFF" opacity=".8"/>`).join('')}
         ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${w * i * 0.17}" y="${h * (0.55 + (i % 3) * 0.06)}" width="${w * 0.15}" height="${h}" fill="#241A4A"/>`).join('')}
         ${Array.from({ length: 24 }, (_, i) => `<rect x="${w * ((i % 6) * 0.17 + 0.03)}" y="${h * (0.66 + Math.floor(i / 6) * 0.07)}" width="${w * 0.025}" height="${h * 0.025}" fill="#FFD166"/>`).join('')}`,
        sky('s', '#2A1E6B', '#C2468F'));
    case 'flowers':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><path d="M0 ${h * 0.45}Q${w * 0.5} ${h * 0.35} ${w} ${h * 0.45}V${h}H0z" fill="#5DCB7E"/>
         ${Array.from({ length: 60 }, (_, i) => { const x = (i * 71) % w; const y = h * 0.5 + ((i * 97) % (h * 0.48)); const c = ['#FF5C7A', '#FFD166', '#FFFFFF', '#C7A2FF'][i % 4]; return `<circle cx="${x}" cy="${y}" r="${4 + (y / h) * 10}" fill="${c}"/>`; }).join('')}`,
        sky('s', '#9FE3FF', '#E8FAFF'));
    case 'cake':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="#FFE8EE"/>
         ${Array.from({ length: 26 }, (_, i) => `<rect x="${(i * 61) % w}" y="${(i * 43) % h}" width="10" height="5" rx="2" fill="${['#6A3FF0', '#FFB020', '#16B3A3', '#FF5C7A'][i % 4]}" transform="rotate(${i * 23} ${(i * 61) % w} ${(i * 43) % h})"/>`).join('')}
         <rect x="${w * 0.22}" y="${h * 0.5}" width="${w * 0.56}" height="${h * 0.3}" rx="12" fill="#FFFFFF"/><rect x="${w * 0.22}" y="${h * 0.5}" width="${w * 0.56}" height="${h * 0.08}" rx="12" fill="#FF8FB1"/>
         <rect x="${w * 0.3}" y="${h * 0.36}" width="${w * 0.4}" height="${h * 0.16}" rx="10" fill="#FFF3D6"/><rect x="${w * 0.3}" y="${h * 0.36}" width="${w * 0.4}" height="${h * 0.05}" rx="10" fill="#FF8FB1"/>
         ${[0.38, 0.5, 0.62].map((x) => `<rect x="${w * x - 4}" y="${h * 0.26}" width="8" height="${h * 0.1}" fill="#6A3FF0"/><ellipse cx="${w * x}" cy="${h * 0.24}" rx="6" ry="10" fill="#FFB020"/>`).join('')}
         <ellipse cx="${w * 0.5}" cy="${h * 0.82}" rx="${w * 0.36}" ry="${h * 0.03}" fill="#F2C3D0"/>`);
    case 'balloons':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/>
         ${[[0.3, 0.3, '#FF5C7A'], [0.5, 0.2, '#FFD166'], [0.7, 0.32, '#6A3FF0'], [0.42, 0.44, '#16B3A3'], [0.6, 0.46, '#FF8A5B']].map(([x, y, c]) => `<path d="M${w * +x} ${h * +y + w * 0.1}Q${w * +x + 10} ${h * 0.75} ${w * 0.5} ${h * 0.9}" stroke="#7A6A80" stroke-width="2" fill="none"/><ellipse cx="${w * +x}" cy="${h * +y}" rx="${w * 0.09}" ry="${w * 0.11}" fill="${c}"/><ellipse cx="${w * +x - w * 0.03}" cy="${h * +y - w * 0.04}" rx="${w * 0.02}" ry="${w * 0.03}" fill="#fff" opacity=".5"/>`).join('')}`,
        sky('s', '#BFE9FF', '#FFF0F5'));
    case 'ferris':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/>
         <circle cx="${w * 0.5}" cy="${h * 0.46}" r="${h * 0.32}" fill="none" stroke="#2B2340" stroke-width="6"/>
         ${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; const x = w * 0.5 + Math.cos(a) * h * 0.32; const y = h * 0.46 + Math.sin(a) * h * 0.32; return `<line x1="${w * 0.5}" y1="${h * 0.46}" x2="${x}" y2="${y}" stroke="#2B2340" stroke-width="2"/><rect x="${x - 9}" y="${y - 2}" width="18" height="14" rx="3" fill="${['#FF5C7A', '#FFD166', '#16B3A3', '#6A3FF0'][i % 4]}"/>`; }).join('')}
         <path d="M${w * 0.5} ${h * 0.46}L${w * 0.38} ${h * 0.95}M${w * 0.5} ${h * 0.46}L${w * 0.62} ${h * 0.95}" stroke="#2B2340" stroke-width="6"/>
         <rect y="${h * 0.93}" width="${w}" height="${h * 0.07}" fill="#2B2340"/>`,
        sky('s', '#FF7A59', '#FFD07A'));
    case 'palms':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="#FFE3A6"/>
         ${[[0.3, 0.75, -8], [0.65, 0.82, 6]].map(([x, base, tilt]) => `<path d="M${w * x} ${h * base}Q${w * x + tilt * 4} ${h * 0.5} ${w * x + tilt * 6} ${h * 0.3}" stroke="#7A4E2D" stroke-width="${w * 0.03}" fill="none" stroke-linecap="round"/>
           ${[0, 60, 120, 180, 240, 300].map((r) => `<ellipse cx="${w * x + tilt * 6}" cy="${h * 0.3}" rx="${w * 0.16}" ry="${w * 0.035}" fill="#1FA36A" transform="rotate(${r + 15} ${w * x + tilt * 6} ${h * 0.3}) translate(${w * 0.12} 0)"/>`).join('')}`).join('')}
         <circle cx="${w * 0.8}" cy="${h * 0.15}" r="${w * 0.08}" fill="#FFF1A8"/>`,
        sky('s', '#FF9AC1', '#FFE0B8'));
    case 'harbour':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><rect y="${h * 0.55}" width="${w}" height="${h * 0.45}" fill="#1E7FD6"/>
         ${[[0.1, '#FF5C7A'], [0.35, '#FFD166'], [0.6, '#FFFFFF'], [0.82, '#16B3A3']].map(([x, c]) => `<path d="M${w * +x} ${h * 0.6}h${w * 0.14}l-${w * 0.02} ${h * 0.08}h-${w * 0.1}z" fill="${c}"/><rect x="${w * +x + w * 0.065}" y="${h * 0.36}" width="3" height="${h * 0.24}" fill="#2B2340"/>`).join('')}
         ${[0.7, 0.8, 0.9].map((y) => `<path d="M0 ${h * y}q${w * 0.1} -8 ${w * 0.2} 0t${w * 0.2} 0t${w * 0.2} 0t${w * 0.2} 0t${w * 0.2} 0" stroke="#7FC4FF" stroke-width="3" fill="none"/>`).join('')}
         <rect x="0" y="${h * 0.35}" width="${w}" height="${h * 0.2}" fill="#FFB38A" opacity=".5"/>`,
        sky('s', '#8FD8FF', '#FFE9D6'));
    case 'couple':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.5}" cy="${h * 0.62}" r="${h * 0.2}" fill="#FFE38A"/>
         <rect y="${h * 0.68}" width="${w}" height="${h * 0.32}" fill="#3A2A6B"/>
         <circle cx="${w * 0.44}" cy="${h * 0.47}" r="${h * 0.045}" fill="#2B1B3A"/><path d="M${w * 0.4} ${h * 0.53}h${w * 0.08}l${w * 0.01} ${h * 0.16}h-${w * 0.1}z" fill="#2B1B3A"/>
         <circle cx="${w * 0.56}" cy="${h * 0.49}" r="${h * 0.042}" fill="#2B1B3A"/><path d="M${w * 0.52} ${h * 0.54}h${w * 0.08}l${w * 0.02} ${h * 0.15}h-${w * 0.12}z" fill="#2B1B3A"/>
         <path d="M${w * 0.48} ${h * 0.58}h${w * 0.05}" stroke="#2B1B3A" stroke-width="5"/>`,
        sky('s', '#FF6F91', '#FFB36B'));
    case 'lemons':
      return svg(w, h,
        `<rect width="${w}" height="${h}" fill="#2F9E6B"/>
         ${Array.from({ length: 9 }, (_, i) => { const x = w * (0.18 + (i % 3) * 0.32); const y = h * (0.18 + Math.floor(i / 3) * 0.32); return `<ellipse cx="${x}" cy="${y}" rx="${w * 0.12}" ry="${w * 0.09}" fill="#FFE14D" transform="rotate(${i * 20} ${x} ${y})"/><ellipse cx="${x + w * 0.08}" cy="${y - w * 0.06}" rx="${w * 0.06}" ry="${w * 0.025}" fill="#1E7A4F" transform="rotate(-30 ${x} ${y})"/>`; }).join('')}`);
  }
}

const cache = new Map<string, string>();

/** Data URL for a scene (cached). */
export function sceneUrl(s: DemoScene): string {
  const key = `${s.kind}:${s.width}x${s.height}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(body(s.kind, s.width, s.height))}`;
    cache.set(key, url);
  }
  return url;
}
