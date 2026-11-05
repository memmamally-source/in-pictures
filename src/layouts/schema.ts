import type { ThemeId } from '@/domain/types';

/**
 * Page-layout schema. All geometry is in page units: the page is 100 units
 * wide and 125 tall (8 × 10 in portrait), so 1 unit = 0.08 in = 2.032 mm.
 * The same numbers drive the on-screen pages and the PDF, which is what
 * keeps the export faithful to the preview.
 */
export const PAGE_W = 100;
export const PAGE_H = 125;
export const PAGE_INCHES = { w: 8, h: 10 } as const;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 'theme' (or omitted) uses the theme's default. */
export type FrameStyle = 'none' | 'mat' | 'polaroid' | 'stamp' | 'mount';
export type Shape = 'rect' | 'rounded' | 'arch' | 'circle';

export interface PhotoFrame extends Rect {
  /** Degrees; scaled by the theme's `tilt` unless the frame style is polaroid. */
  rotate?: number;
  frame?: FrameStyle;
  shape?: Shape;
  /** The slot a favourite photo should go to. */
  hero?: boolean;
}

export type TextRole = 'title' | 'subtitle' | 'heading' | 'date' | 'caption' | 'body' | 'names' | 'note';
export type TextColor = 'ink' | 'muted' | 'accent' | 'onPhoto';

export interface TextBox extends Rect {
  /** Key into page.text; caption boxes use `caption` and read the photo's caption. */
  key: string;
  role: TextRole;
  align: 'left' | 'center' | 'right';
  /** Font size in page units before fitting. */
  size: number;
  /** For captions: which photo slot this caption belongs to. */
  photo?: number;
  /** Polaroid captions sit in the frame's bottom strip; the rect is computed. */
  inFrame?: boolean;
  rotate?: number;
  color?: TextColor;
  maxLines?: number;
}

export type DecorKind =
  | 'tape' | 'heart' | 'star' | 'sparkle' | 'flower' | 'sprig' | 'postmark' | 'plane' | 'compass'
  | 'divider' | 'flourish' | 'double-border' | 'corners' | 'airmail' | 'confetti' | 'shade-bottom'
  | 'dots-row' | 'sun' | 'strip' | 'rule' | 'washi' | 'leaf' | 'scallop-border';
export type DecorColor = 'accent' | 'accent2' | 'ink' | 'muted' | 'paper' | 'mat';

export interface DecorItem extends Rect {
  kind: DecorKind;
  rotate?: number;
  color?: DecorColor;
  /** Drawn above photos (tape, corners) instead of below them. */
  over?: boolean;
}

export type LayoutKind = 'cover' | 'photos' | 'chapter' | 'closing';

export interface LayoutDef {
  id: string;
  name: string;
  kind: LayoutKind;
  photos: PhotoFrame[];
  texts: TextBox[];
  decor?: DecorItem[];
  /** Themes allowed to use it; omitted = every theme. */
  themes?: ThemeId[];
  /**
   * 'required': it reserves visible room for captions, so the generator only
   *   picks it when the photos have captions.
   * 'soft': captions are optional and the page still looks complete without.
   */
  captions?: 'required' | 'soft';
  /** Taste: higher is picked more readily (default 1). */
  weight?: number;
  /** Photo runs to the page edge. */
  bleed?: boolean;
}
