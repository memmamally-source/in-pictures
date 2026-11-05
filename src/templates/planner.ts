import type { AlbumLength, Answers, Chapter, GroupType, PlanItem } from '@/domain/types';

import type { Condition, OccasionDef, ShotDef, TargetRule } from './schema';
import { SHOT_LIBRARY } from './shots';

/**
 * Turns an occasion + the user's answers into a photo checklist. Pure and
 * deterministic: the same answers always produce the same plan, with stable
 * item ids, so regenerating after an edit to the answers keeps progress on
 * items that still apply (see `mergePlan`).
 */

export function tripDays(a: Pick<Answers, 'startDate' | 'endDate' | 'days'>): number {
  if (a.startDate && a.endDate) {
    const start = Date.parse(`${a.startDate}T12:00:00Z`);
    const end = Date.parse(`${a.endDate}T12:00:00Z`);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return Math.min(60, Math.round((end - start) / 86_400_000) + 1);
    }
  }
  return Math.max(1, Math.min(60, Math.round(a.days ?? 1)));
}

/** "Anna & Ben", "Anna, Ben & Cleo". */
export function joinNames(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? '';
  return `${clean.slice(0, -1).join(', ')} & ${clean[clean.length - 1]}`;
}

function tokenValue(token: string, a: Answers): string {
  if (token === 'location') return a.location?.trim() ?? '';
  if (token === 'honoree') return a.honoree?.trim() ?? '';
  if (token === 'names') return joinNames(a.names);
  if (token === 'days') return String(tripDays(a));
  if (token === 'year') return a.startDate?.slice(0, 4) ?? '';
  if (token.startsWith('extra:')) {
    const v = a.extras[token.slice(6)];
    return typeof v === 'string' ? v.trim() : '';
  }
  return '';
}

/** Fills {tokens}; returns null when any token has no answer. */
export function fillTokens(template: string, a: Answers): string | null {
  let missing = false;
  const out = template.replace(/\{([\w:-]+)\}/g, (_, t: string) => {
    const v = tokenValue(t, a);
    if (!v) missing = true;
    return v;
  });
  return missing ? null : out.replace(/\s+/g, ' ').trim();
}

export function matches(when: Condition | undefined, a: Answers, days: number): boolean {
  if (!when) return true;
  const gs = a.groups;
  if (when.groups && !when.groups.some((g) => gs.includes(g))) return false;
  if (when.allGroups && !when.allGroups.every((g) => gs.includes(g))) return false;
  if (when.notGroups && gs.every((g) => when.notGroups!.includes(g))) return false;
  if (when.children !== undefined && when.children !== a.children) return false;
  if (when.minDays !== undefined && days < when.minDays) return false;
  if (when.maxDays !== undefined && days > when.maxDays) return false;
  if (when.location !== undefined && when.location !== !!a.location?.trim()) return false;
  if (when.honoree && !a.honoree?.trim()) return false;
  if (when.extra && !a.extras[when.extra]) return false;
  if (when.extraNot && a.extras[when.extraNot]) return false;
  if (when.extraEquals && a.extras[when.extraEquals[0]] !== when.extraEquals[1]) return false;
  if (when.extraIn && !when.extraIn[1].includes(String(a.extras[when.extraIn[0]] ?? ''))) return false;
  if (when.minParticipants !== undefined && a.participants < when.minParticipants) return false;
  return true;
}

export function computeTarget(t: number | TargetRule | undefined, a: Answers, days: number): number {
  if (t === undefined) return 1;
  if (typeof t === 'number') return t;
  const people = Math.max(1, a.participants);
  const raw = t.base + (t.perDay ?? 0) * (days - 1) + (t.perPerson ?? 0) * (people - 1);
  return Math.max(1, Math.min(t.max ?? 99, Math.round(raw)));
}

/**
 * Album sizes, in photo ideas. Each tier starts from the ideas at or above
 * its priority (1 = essential), tops up with the next most important ideas to
 * reach `min`, and trims the least important to stay within `max`.
 */
export const TIERS: Record<AlbumLength, { min: number; max: number; priority: 1 | 2 | 3; label: string }> = {
  simple: { min: 10, max: 20, priority: 1, label: 'Simple' },
  deluxe: { min: 20, max: 50, priority: 2, label: 'Deluxe' },
  extravagant: { min: 50, max: 100, priority: 3, label: 'Extravagant' },
};

const OLD_LENGTHS: Record<string, AlbumLength> = { short: 'simple', standard: 'deluxe', long: 'extravagant' };

/**
 * Library shots name a generic chapter ("together", "end"…). When an occasion
 * calls its chapters something else, the shot goes to the closest one, so
 * shared ideas can be reused without restating the chapter every time.
 */
const CHAPTER_ALIASES: Record<string, string[]> = {
  'setting-off': ['setting-off', 'arrival', 'arrivals', 'preparing', 'getting-ready', 'build-up', 'beginning', 'first-day', 'hello'],
  arrival: ['arrival', 'arrivals', 'setting-off', 'first-day', 'hello', 'beginning', 'proposal'],
  exploring: ['exploring', 'adventures', 'out', 'rides', 'music', 'action', 'play', 'middle', 'the-day', 'celebration'],
  flavours: ['flavours', 'table', 'celebration', 'everyday', 'middle'],
  together: ['together', 'people', 'friends', 'us', 'middle', 'celebration'],
  people: ['people', 'together', 'friends', 'middle', 'celebration'],
  'getting-ready': ['getting-ready', 'preparing', 'build-up', 'arrivals', 'arrival', 'first-day', 'beginning', 'proposal'],
  celebration: ['celebration', 'the-day', 'table', 'ceremony', 'middle', 'together', 'action'],
  everyday: ['everyday', 'together', 'middle', 'out'],
  end: ['end', 'last-day'],
  'last-day': ['last-day', 'end'],
};

export function fitChapter(occasion: OccasionDef, chapter: string): string {
  const ids = occasion.chapters.map((c) => c.id);
  if (ids.includes(chapter)) return chapter;
  const alias = (CHAPTER_ALIASES[chapter] ?? []).find((c) => ids.includes(c));
  return alias ?? ids[Math.floor(ids.length / 2)];
}

/** Resolves an occasion's shot references against the library; later refs override earlier ones. */
export function resolveShots(occasion: OccasionDef): ShotDef[] {
  const byId = new Map<string, ShotDef>();
  for (const ref of occasion.shots) {
    const id = typeof ref === 'string' ? ref : ref.id;
    const base = byId.get(id) ?? SHOT_LIBRARY[id];
    const override = typeof ref === 'string' ? {} : ref;
    const merged = { ...base, ...override } as ShotDef;
    if (!merged.title || !merged.category || !merged.chapter) {
      throw new Error(`Occasion ${occasion.id}: shot "${id}" is not in the library and is missing fields`);
    }
    merged.chapter = fitChapter(occasion, merged.chapter);
    byId.delete(id); // keep the position of the last reference
    byId.set(id, merged);
  }
  // Re-sort into the order the occasion first mentioned them.
  const order = new Map<string, number>();
  occasion.shots.forEach((r, i) => {
    const id = typeof r === 'string' ? r : r.id;
    if (!order.has(id)) order.set(id, i);
  });
  return [...byId.values()].sort((x, y) => order.get(x.id)! - order.get(y.id)!);
}

function shortDate(iso: string | undefined, offsetDays: number): string {
  if (!iso) return '';
  const d = new Date(Date.parse(`${iso}T12:00:00Z`) + offsetDays * 86_400_000);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function buildPlan(occasion: OccasionDef, a: Answers): PlanItem[] {
  const tier = TIERS[a.length] ?? TIERS.deluxe;
  const all = candidates(occasion, a);
  // Start from the tier's priority, top up to the minimum, trim to the maximum.
  const keep = new Set(all.filter((c) => c.priority <= tier.priority).map((c) => c.order));
  const byImportance = [...all].sort((x, y) => x.priority - y.priority || x.order - y.order);
  for (const c of byImportance) {
    if (keep.size >= tier.min) break;
    keep.add(c.order);
  }
  for (const c of [...byImportance].reverse()) {
    if (keep.size <= tier.max) break;
    keep.delete(c.order);
  }
  return all.filter((c) => keep.has(c.order)).map((c) => c.item);
}

/** Every idea that fits the answers, in story order, with its priority. */
function candidates(occasion: OccasionDef, a: Answers): { item: PlanItem; priority: number; order: number }[] {
  const days = tripDays(a);
  const items: { item: PlanItem; priority: number; order: number }[] = [];
  const push = (item: PlanItem, priority: number) => items.push({ item, priority, order: items.length });
  for (const shot of resolveShots(occasion)) {
    if (!matches(shot.when, a, days)) continue;
    const priority = shot.priority ?? 2;
    const title = fillTokens(shot.title, a) ?? shot.fallbackTitle ?? shot.title.replace(/\{[\w:-]+\}/g, '').trim();
    const base = { title, hint: shot.hint, category: shot.category, chapter: shot.chapter, shotId: shot.id };
    if (shot.perDay && days > 1 && days <= 7) {
      for (let d = 0; d < days; d++) {
        const when = shortDate(a.startDate, d);
        push({ ...base, id: `${shot.id}#${d + 1}`, title: `Day ${d + 1}${when ? ` (${when})` : ''}: ${title.toLowerCase()}`, target: 1 }, priority);
      }
    } else if (shot.perDay && days > 7) {
      push({ ...base, id: shot.id, title: `${title} — one for each day`, target: days }, priority);
    } else {
      push({ ...base, id: shot.id, target: computeTarget(shot.target, a, days) }, priority);
    }
  }
  return items;
}

/**
 * Rebuilds the plan after answers change while keeping what the user did:
 * custom prompts stay, edited targets/titles and skip/done states carry over
 * for items that still apply.
 */
export function mergePlan(previous: PlanItem[], next: PlanItem[]): PlanItem[] {
  const old = new Map(previous.map((p) => [p.id, p]));
  const merged = next.map((n) => {
    const o = old.get(n.id);
    return o ? { ...n, title: o.title, target: o.target, skipped: o.skipped, done: o.done } : n;
  });
  return [...merged, ...previous.filter((p) => p.custom)];
}

export function chaptersFor(occasion: OccasionDef): Chapter[] {
  return occasion.chapters.map((c) => ({ ...c }));
}

export function suggestTitle(occasion: OccasionDef, a: Answers): string {
  return (occasion.titleTemplate && fillTokens(occasion.titleTemplate, a)) || occasion.fallbackTitle;
}

export const GROUP_LABELS: Record<GroupType, string> = {
  solo: 'Just me',
  couple: 'A couple',
  family: 'Family',
  friends: 'Friends',
  group: 'A big group',
};

const DEFAULT_PEOPLE: Record<GroupType, number> = { solo: 1, couple: 2, family: 4, friends: 4, group: 10 };

export function defaultParticipants(groups: GroupType[]): number {
  return Math.max(1, groups.reduce((n, g) => n + DEFAULT_PEOPLE[g], 0));
}

/** Answers saved before multi-select had a single `group`. */
export function normaliseAnswers(a: Answers & { group?: GroupType }): Answers {
  const length = OLD_LENGTHS[a.length as string] ?? a.length;
  if (Array.isArray(a.groups) && a.groups.length) return length === a.length ? a : { ...a, length };
  const { group, ...rest } = a;
  return { ...rest, length, groups: [group ?? 'solo'] };
}

/** "Just me" can't be combined; the others can (e.g. family + friends). */
export function toggleGroup(current: GroupType[], g: GroupType): GroupType[] {
  if (g === 'solo') return ['solo'];
  const without = current.filter((x) => x !== 'solo');
  if (without.includes(g)) return without.length > 1 ? without.filter((x) => x !== g) : without;
  return [...without, g];
}

export interface PlanProgress {
  total: number;
  complete: number;
  skipped: number;
  photos: number;
}

/** An item is complete when ticked by hand or when it has as many photos as its target. */
export function itemComplete(item: PlanItem, attached: number): boolean {
  return !!item.done || attached >= item.target;
}

export function planProgress(plan: PlanItem[], attachedById: Record<string, number>): PlanProgress {
  let complete = 0;
  let skipped = 0;
  let photos = 0;
  for (const item of plan) {
    const n = attachedById[item.id] ?? 0;
    photos += n;
    if (item.skipped) skipped++;
    else if (itemComplete(item, n)) complete++;
  }
  return { total: plan.length - skipped, complete, skipped, photos };
}
