import type { AlbumLength, GroupType, Mood, ShotCategory, ThemeId } from '@/domain/types';

/**
 * Template configuration schema.
 *
 * An occasion is assembled from reusable parts rather than written out as a
 * fixed checklist:
 *   - shots come from a shared library (`shots.ts`) and are referenced by id,
 *     optionally overridden per occasion (chapter, title, target, condition);
 *   - conditions keep a shot only when it fits the answers (a solo trip gets
 *     no couple photos, a family gathering with children gets kids' shots);
 *   - target rules scale counts by trip length and group size;
 *   - chapters give the album its beginning, middle and end.
 *
 * Adding an occasion = adding one OccasionDef object. Adding a shot that many
 * occasions can use = adding one ShotDef to the library.
 */

export interface Condition {
  groups?: GroupType[];
  notGroups?: GroupType[];
  children?: boolean;
  minDays?: number;
  maxDays?: number;
  /** Requires (true) or excludes (false) a location answer. */
  location?: boolean;
  /** Requires the user to have named the honoree. */
  honoree?: boolean;
  /** Extra answer must be truthy (or equal the given value). */
  extra?: string;
  extraEquals?: [string, string];
  extraNot?: string;
  minParticipants?: number;
}

export interface TargetRule {
  base: number;
  /** Added for every day after the first. */
  perDay?: number;
  /** Added per participant beyond the first. */
  perPerson?: number;
  max?: number;
}

export interface ShotDef {
  id: string;
  /** May contain {location}, {honoree}, {names}, {days}. */
  title: string;
  /** Used when a token in `title` has no answer. */
  fallbackTitle?: string;
  hint?: string;
  category: ShotCategory;
  chapter: string;
  target?: number | TargetRule;
  when?: Condition;
  /** 1 = core, 2 = standard albums and up, 3 = long albums only. */
  priority?: 1 | 2 | 3;
  /** Repeat the shot once per day (up to 7 days, then one shot with a larger target). */
  perDay?: boolean;
}

export type ShotRef = string | (Partial<ShotDef> & { id: string });

export type ExtraQuestion =
  | { id: string; type: 'toggle'; label: string; help?: string; default: boolean }
  | { id: string; type: 'choice'; label: string; options: { value: string; label: string }[]; default: string }
  | { id: string; type: 'text'; label: string; placeholder?: string };

export interface OccasionQuestions {
  location: 'required' | 'optional' | 'hidden';
  locationLabel?: string;
  locationPlaceholder?: string;
  dates: 'range' | 'single' | 'none';
  honoree?: { label: string; placeholder: string; fallback: string };
  groupDefault: GroupType;
  groupOptions?: GroupType[];
  askChildren: boolean;
  extras?: ExtraQuestion[];
}

export interface OccasionDef {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  /** Pastel tint key from the UI palette. */
  tint: 'rose' | 'peach' | 'butter' | 'sage' | 'mist' | 'lilac' | 'sand' | 'sky';
  family: 'travel' | 'celebration' | 'family' | 'everyday';
  keywords: string[];
  chapters: { id: string; title: string; ending?: boolean }[];
  questions: OccasionQuestions;
  shots: ShotRef[];
  themes: ThemeId[];
  defaultMood: Mood;
  defaultLength?: AlbumLength;
  /** Suggested album title; tokens as in ShotDef.title. */
  titleTemplate: string;
  fallbackTitle: string;
}
