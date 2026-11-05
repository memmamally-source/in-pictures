import type { Answers, Chapter, GroupType, PlanItem } from '@/domain/types';

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
  if (when.groups && !when.groups.includes(a.group)) return false;
  if (when.notGroups && when.notGroups.includes(a.group)) return false;
  if (when.children !== undefined && when.children !== a.children) return false;
  if (when.minDays !== undefined && days < when.minDays) return false;
  if (when.maxDays !== undefined && days > when.maxDays) return false;
  if (when.location !== undefined && when.location !== !!a.location?.trim()) return false;
  if (when.honoree && !a.honoree?.trim()) return false;
  if (when.extra && !a.extras[when.extra]) return false;
  if (when.extraNot && a.extras[when.extraNot]) return false;
  if (when.extraEquals && a.extras[when.extraEquals[0]] !== when.extraEquals[1]) return false;
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

const PRIORITY_FOR_LENGTH = { short: 1, standard: 2, long: 3 } as const;

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
  const days = tripDays(a);
  const maxPriority = PRIORITY_FOR_LENGTH[a.length];
  const items: PlanItem[] = [];
  for (const shot of resolveShots(occasion)) {
    if ((shot.priority ?? 2) > maxPriority) continue;
    if (!matches(shot.when, a, days)) continue;
    const title = fillTokens(shot.title, a) ?? shot.fallbackTitle ?? shot.title.replace(/\{[\w:-]+\}/g, '').trim();
    const base = { title, hint: shot.hint, category: shot.category, chapter: shot.chapter, shotId: shot.id };
    if (shot.perDay && days > 1 && days <= 7) {
      for (let d = 0; d < days; d++) {
        const when = shortDate(a.startDate, d);
        items.push({ ...base, id: `${shot.id}#${d + 1}`, title: `Day ${d + 1}${when ? ` (${when})` : ''}: ${title.toLowerCase()}`, target: 1 });
      }
    } else if (shot.perDay && days > 7) {
      items.push({ ...base, id: shot.id, title: `${title} — one for each day`, target: days });
    } else {
      items.push({ ...base, id: shot.id, target: computeTarget(shot.target, a, days) });
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

export function defaultParticipants(group: GroupType): number {
  return { solo: 1, couple: 2, family: 4, friends: 4, group: 10 }[group];
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
