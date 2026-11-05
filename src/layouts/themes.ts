import type { Mood, ThemeId } from '@/domain/types';

import type { DecorItem, FrameStyle, Shape, TextRole } from './schema';

export interface FontSpec {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  upper?: boolean;
  /** Letter spacing in em. */
  tracking?: number;
  lineHeight: number;
  /** Multiplies the layout's size (handwriting fonts run small). */
  scale?: number;
}

export type BackgroundKind = 'plain' | 'dots' | 'grid' | 'lines' | 'kraft' | 'linen' | 'confetti' | 'deckle';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    page: string;
    chapterPage: string;
    ink: string;
    muted: string;
    accent: string;
    accent2: string;
    /** Photo borders / polaroid paper. */
    mat: string;
    pattern: string;
  };
  /** Text and ornament colours on chapter pages, when those pages are dark. */
  chapterInk?: { ink: string; muted: string; accent: string; accent2: string; pattern: string };
  fonts: Record<'title' | 'heading' | 'body' | 'caption' | 'label', FontSpec>;
  background: BackgroundKind;
  chapterBackground: BackgroundKind;
  frame: FrameStyle;
  shape: Shape;
  /** Corner radius for 'rounded' shapes, in page units. */
  radius: number;
  /** Multiplier for layout rotations (0 keeps everything straight). */
  tilt: number;
  shadow: boolean;
  /** Ornaments cycled across ordinary photo pages (deterministically). */
  pageDecor: DecorItem[][];
  /** Moods that point to this theme. */
  moods: Mood[];
}

/** Which font each text role uses. */
export const ROLE_FONT: Record<TextRole, keyof ThemeDef['fonts']> = {
  title: 'title',
  subtitle: 'label',
  heading: 'heading',
  date: 'label',
  caption: 'caption',
  body: 'body',
  names: 'caption',
  note: 'body',
};

const SERIF = 'Cormorant Garamond';
const HAND = 'Caveat';
const FRAUNCES = 'Fraunces Variable';
const SANS = 'Inter Variable';
const PLAYFAIR = 'Playfair Display';
const TYPE = 'Special Elite';

export const THEMES: ThemeDef[] = [
  {
    id: 'minimal',
    name: 'Minimal Editorial',
    description: 'Magazine pages: generous white space, refined serif titles and large, uncluttered photographs.',
    colors: { page: '#FFFFFF', chapterPage: '#141414', ink: '#141414', muted: '#5E5E5E', accent: '#FF4F2E', accent2: '#141414', mat: '#FFFFFF', pattern: '#ECECEC' },
    chapterInk: { ink: '#FFFFFF', muted: '#BDBDBD', accent: '#FF6A4D', accent2: '#FFFFFF', pattern: '#2A2A2A' },
    fonts: {
      title: { family: SERIF, weight: 500, lineHeight: 1.05, tracking: -0.01 },
      heading: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.1 },
      body: { family: SERIF, weight: 500, lineHeight: 1.35, scale: 1.1 },
      caption: { family: SANS, weight: 400, lineHeight: 1.4, scale: 0.82 },
      label: { family: SANS, weight: 500, upper: true, tracking: 0.22, lineHeight: 1.2, scale: 0.85 },
    },
    background: 'plain',
    chapterBackground: 'plain',
    frame: 'none',
    shape: 'rect',
    radius: 0,
    tilt: 0,
    shadow: false,
    pageDecor: [[]],
    moods: ['elegant', 'calm'],
  },
  {
    id: 'scrapbook',
    name: 'Warm Scrapbook',
    description: 'Kraft paper, taped prints at playful angles, handwritten captions and little doodles.',
    colors: { page: '#E2C8A4', chapterPage: '#F6D9C2', ink: '#3A2416', muted: '#6A4A33', accent: '#E8604C', accent2: '#3FA37C', mat: '#FFFDF8', pattern: '#C9A97F' },
    fonts: {
      title: { family: HAND, weight: 600, lineHeight: 1, scale: 1.35 },
      heading: { family: HAND, weight: 600, lineHeight: 1, scale: 1.3 },
      body: { family: HAND, weight: 500, lineHeight: 1.15, scale: 1.35 },
      caption: { family: HAND, weight: 500, lineHeight: 1.1, scale: 1.4 },
      label: { family: FRAUNCES, weight: 500, upper: true, tracking: 0.16, lineHeight: 1.2, scale: 0.85 },
    },
    background: 'kraft',
    chapterBackground: 'dots',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 1,
    shadow: true,
    pageDecor: [
      [],
      [{ kind: 'tape', x: 4, y: 2, w: 18, h: 6, rotate: -32, over: true, color: 'accent2' }],
      [{ kind: 'heart', x: 86, y: 114, w: 8, h: 8, color: 'accent' }],
      [{ kind: 'washi', x: 76, y: 3, w: 22, h: 6, rotate: 38, over: true, color: 'accent' }],
      [{ kind: 'leaf', x: 3, y: 112, w: 10, h: 10, rotate: -20, color: 'accent2' }],
    ],
    moods: ['nostalgic', 'joyful'],
  },
  {
    id: 'polaroid',
    name: 'Playful Polaroid',
    description: 'Instant-photo frames, photo-booth strips and cheerful pastel pages with confetti.',
    colors: { page: '#FFF1E6', chapterPage: '#CDEFFF', ink: '#2B2340', muted: '#5A5070', accent: '#FF5C7A', accent2: '#16B3A3', mat: '#FFFFFF', pattern: '#FFC24B' },
    fonts: {
      title: { family: HAND, weight: 600, lineHeight: 1, scale: 1.4 },
      heading: { family: HAND, weight: 600, lineHeight: 1, scale: 1.35 },
      body: { family: SANS, weight: 400, lineHeight: 1.4, scale: 0.9 },
      caption: { family: HAND, weight: 500, lineHeight: 1.05, scale: 1.4 },
      label: { family: SANS, weight: 600, upper: true, tracking: 0.18, lineHeight: 1.2, scale: 0.8 },
    },
    background: 'confetti',
    chapterBackground: 'confetti',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 1,
    shadow: true,
    pageDecor: [[], [{ kind: 'sparkle', x: 88, y: 112, w: 7, h: 7, color: 'accent' }], [{ kind: 'star', x: 4, y: 113, w: 7, h: 7, color: 'accent2' }]],
    moods: ['playful', 'joyful'],
  },
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Blush tones, soft rounded frames and arches, delicate botanical sprigs and italic serif type.',
    colors: { page: '#FDE8EC', chapterPage: '#9E2A4B', ink: '#4A1E2C', muted: '#7A4656', accent: '#D6456B', accent2: '#6E9E6A', mat: '#FFF8F9', pattern: '#F5C2CE' },
    chapterInk: { ink: '#FFF0F3', muted: '#F7C9D4', accent: '#FFB3C4', accent2: '#CDE6C6', pattern: '#B4405F' },
    fonts: {
      title: { family: PLAYFAIR, weight: 400, style: 'italic', lineHeight: 1.08 },
      heading: { family: PLAYFAIR, weight: 400, style: 'italic', lineHeight: 1.1 },
      body: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.35, scale: 1.1 },
      caption: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.3, scale: 1.05 },
      label: { family: SERIF, weight: 600, upper: true, tracking: 0.24, lineHeight: 1.2, scale: 0.95 },
    },
    background: 'linen',
    chapterBackground: 'plain',
    frame: 'none',
    shape: 'rounded',
    radius: 2.2,
    tilt: 0,
    shadow: false,
    pageDecor: [[], [{ kind: 'sprig', x: 84, y: 108, w: 12, h: 15, rotate: 160, color: 'accent' }], [], [{ kind: 'flower', x: 4, y: 114, w: 7, h: 7, color: 'accent' }]],
    moods: ['romantic', 'elegant'],
  },
  {
    id: 'travel',
    name: 'Travel Journal',
    description: 'Field-notebook grid paper, postage-stamp frames, postmarks, typewriter dates and airmail stripes.',
    colors: { page: '#F7ECD2', chapterPage: '#1F3A64', ink: '#1B2A41', muted: '#4C5A70', accent: '#D7263D', accent2: '#1F4E8C', mat: '#FFFDF6', pattern: '#E2D2AC' },
    chapterInk: { ink: '#FFF6E3', muted: '#C9D6EA', accent: '#FF6B6B', accent2: '#F7D774', pattern: '#2D4C7C' },
    fonts: {
      title: { family: FRAUNCES, weight: 600, lineHeight: 1.05 },
      heading: { family: FRAUNCES, weight: 600, lineHeight: 1.08 },
      body: { family: TYPE, weight: 400, lineHeight: 1.45, scale: 0.85 },
      caption: { family: TYPE, weight: 400, lineHeight: 1.35, scale: 0.85 },
      label: { family: TYPE, weight: 400, upper: true, tracking: 0.18, lineHeight: 1.2, scale: 0.9 },
    },
    background: 'grid',
    chapterBackground: 'lines',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 0.5,
    shadow: true,
    pageDecor: [
      [],
      [{ kind: 'postmark', x: 70, y: 106, w: 24, h: 14, rotate: -10, color: 'accent2' }],
      [],
      [{ kind: 'plane', x: 84, y: 3, w: 9, h: 9, rotate: 20, color: 'accent' }],
      [{ kind: 'compass', x: 3, y: 112, w: 10, h: 10, color: 'accent2' }],
    ],
    moods: ['adventurous'],
  },
  {
    id: 'heritage',
    name: 'Classic Heritage',
    description: 'A traditional album: ivory card, photo corners, fine double borders and timeless serif titles.',
    colors: { page: '#F4EEDC', chapterPage: '#1F4A3A', ink: '#2A2018', muted: '#62554A', accent: '#8E1F3A', accent2: '#1F4A3A', mat: '#FBF8EF', pattern: '#E2D6BA' },
    chapterInk: { ink: '#F4EEDC', muted: '#CFE0D4', accent: '#E3B866', accent2: '#E3B866', pattern: '#2A5E4A' },
    fonts: {
      title: { family: FRAUNCES, weight: 500, lineHeight: 1.08, tracking: 0.01 },
      heading: { family: SERIF, weight: 600, upper: true, tracking: 0.14, lineHeight: 1.15, scale: 0.8 },
      body: { family: SERIF, weight: 500, lineHeight: 1.35, scale: 1.1 },
      caption: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.3, scale: 1.05 },
      label: { family: SERIF, weight: 600, upper: true, tracking: 0.22, lineHeight: 1.2, scale: 0.9 },
    },
    background: 'deckle',
    chapterBackground: 'plain',
    frame: 'mount',
    shape: 'rect',
    radius: 0,
    tilt: 0,
    shadow: true,
    pageDecor: [[]],
    moods: ['nostalgic', 'elegant', 'calm'],
  },
];

export const THEME_BY_ID: Record<ThemeId, ThemeDef> = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>;

export const getTheme = (id: ThemeId): ThemeDef => THEME_BY_ID[id] ?? THEME_BY_ID.minimal;

/** Themes with dark chapter pages flip everything printed on them to light ink. */
export function isDarkPage(theme: ThemeDef, kind: 'chapter' | 'other'): boolean {
  return kind === 'chapter' && !!theme.chapterInk;
}

/** Ranks themes for an occasion's recommendation list and the user's mood. */
export function recommendThemes(occasionThemes: ThemeId[], mood: Mood): ThemeId[] {
  const score = (t: ThemeDef) => {
    const i = occasionThemes.indexOf(t.id);
    return (i === -1 ? 0 : 3 - i) * 2 + (t.moods.includes(mood) ? 3 : 0);
  };
  return [...THEMES].sort((a, b) => score(b) - score(a)).map((t) => t.id);
}
