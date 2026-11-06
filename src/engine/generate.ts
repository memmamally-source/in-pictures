import type { Album, AlbumLength, AlbumPage, BookFormat, Chapter, Photo, PhotoSlot, PlanItem, Project, ThemeId } from '@/domain/types';
import { getLayout, layoutsFor } from '@/layouts/layouts';
import type { LayoutDef } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { mulberry32 } from '@/render/decor';
import { cropLoss, frameAspect } from '@/render/geometry';
import { chooseMotif } from '@/render/motifs';
import { getOccasion } from '@/templates/occasions';
import { joinNames } from '@/templates/planner';

import { curatePhotos } from './curate';

/**
 * The album layout engine. Deterministic heuristics, no AI:
 *  1. sections from the user's chapters / checklist prompts, else capture days;
 *  2. a cover, sparing chapter openers, and a closing page for a clear
 *     beginning, middle and end;
 *  3. each section split into pages by dynamic programming that minimises
 *     cropping, keeps favourites large, matches captions to layouts that show
 *     them, mixes statement pages with collages and avoids repetition.
 * The same input and seed always give the same album; "regenerate" changes
 * the seed for a different, equally valid arrangement.
 */

export interface GenerateInput {
  project: Pick<Project, 'id' | 'answers' | 'chapters' | 'plan' | 'themeId' | 'coverPhotoId' | 'useAllPhotos' | 'format'> & { occasionId?: string };
  photos: Photo[];
  seed: number;
}

export interface Section {
  chapterId?: string;
  title?: string;
  dateLabel?: string;
  photos: Photo[];
}

const DENSITY: Record<AlbumLength, number> = { simple: 3.4, deluxe: 2.5, extravagant: 1.9 };
const CHAPTER_LIMIT: Record<AlbumLength, number> = { simple: 2, deluxe: 4, extravagant: 8 };

// ── Dates ──────────────────────────────────────────────────

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** "6 June 2026", "1–8 June 2026", "28 May – 3 June 2026", "30 Dec 2025 – 2 Jan 2026". */
export function formatDateRange(start?: string, end?: string): string {
  if (!start) return '';
  const a = parts(start);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return `${a.d} ${MONTHS[a.m - 1]} ${a.y}`;
  const b = parts(end);
  if (a.y !== b.y) return `${a.d} ${MONTHS[a.m - 1].slice(0, 3)} ${a.y} – ${b.d} ${MONTHS[b.m - 1].slice(0, 3)} ${b.y}`;
  if (a.m !== b.m) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${a.y}`;
  return `${a.d}–${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
}

function dayLabel(iso: string): string {
  const { y, m, d } = parts(iso);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]}`;
}

export function albumDateLabel(project: GenerateInput['project'], photos: Photo[]): string {
  const a = project.answers;
  if (a.startDate) return formatDateRange(a.startDate, a.endDate);
  const dates = photos.map((p) => p.takenAt).filter((d): d is string => !!d).sort();
  return dates.length ? formatDateRange(dates[0], dates[dates.length - 1]) : '';
}

// ── Sections ───────────────────────────────────────────────

export function buildSections(project: GenerateInput['project'], photos: Photo[]): Section[] {
  const sorted = [...photos].sort((a, b) => a.order - b.order);
  const planChapter = new Map<string, string>(project.plan.map((p: PlanItem) => [p.id, p.chapter]));
  const chapterOf = (p: Photo) => p.chapter ?? (p.planItemId ? planChapter.get(p.planItemId) : undefined);

  if (sorted.some((p) => chapterOf(p))) {
    const chapters: Chapter[] = [...project.chapters];
    for (const p of sorted) {
      const id = chapterOf(p);
      if (id && !chapters.some((c) => c.id === id)) chapters.push({ id, title: id });
    }
    const groups = new Map<string, Photo[]>(chapters.map((c) => [c.id, []]));
    const loose: Photo[] = [];
    for (const p of sorted) {
      const id = chapterOf(p);
      if (id) groups.get(id)!.push(p);
      else loose.push(p);
    }
    const sections: Section[] = [];
    const ending = chapters.find((c) => c.ending);
    // Photos without a chapter: by capture day when possible, else one untitled run.
    const takeLoose = (): Section[] => {
      if (!loose.length) return [];
      const ps = loose.splice(0);
      return byDate(ps) ?? [{ photos: ps }];
    };
    for (const c of chapters) {
      if (c === ending) sections.push(...takeLoose());
      const ps = groups.get(c.id)!;
      if (ps.length) sections.push({ chapterId: c.id, title: c.title, photos: ps, dateLabel: rangeOf(ps) });
    }
    sections.push(...takeLoose());
    return mergeTiny(sections);
  }

  return byDate(sorted) ?? [{ photos: sorted }];
}

/** A lone photo doesn't deserve its own section: fold it into a neighbour. */
function mergeTiny(sections: Section[]): Section[] {
  const out = sections.map((s) => ({ ...s, photos: [...s.photos] }));
  for (let i = 0; i < out.length && out.length > 1; i++) {
    if (out[i].photos.length >= 2) continue;
    const into = i + 1 < out.length ? out[i + 1] : out[i - 1];
    if (i + 1 < out.length) into.photos.unshift(...out[i].photos);
    else into.photos.push(...out[i].photos);
    out.splice(i, 1);
    i--;
  }
  return out;
}

/** Sections by capture day (or month for long spans); null when dates are too sparse. */
function byDate(sorted: Photo[]): Section[] | null {
  const dated = sorted.filter((p) => p.takenAt);
  const days = new Set(dated.map((p) => p.takenAt!.slice(0, 10)));
  if (dated.length >= sorted.length * 0.7 && days.size >= 2) {
    const first = [...days].sort()[0];
    const last = [...days].sort().at(-1)!;
    const spanDays = (Date.parse(last) - Date.parse(first)) / 86_400_000;
    const keyOf = (iso: string) => (spanDays > 31 ? iso.slice(0, 7) : iso.slice(0, 10));
    const sections: Section[] = [];
    let current: Section | null = null;
    let currentKey = '';
    for (const p of sorted) {
      const key = p.takenAt ? keyOf(p.takenAt) : currentKey;
      if (!current || (key && key !== currentKey)) {
        const title = !key ? undefined : spanDays > 31 ? `${MONTHS[parts(key + '-01').m - 1]} ${key.slice(0, 4)}` : dayLabel(key);
        current = { title, photos: [] };
        sections.push(current);
        currentKey = key;
      }
      current.photos.push(p);
    }
    // Merge tiny neighbouring days so the album doesn't fragment.
    const merged: Section[] = [];
    for (const s of sections) {
      const prev = merged.at(-1);
      if (prev && (s.photos.length < 2 || prev.photos.length < 2) && sections.length > 6) {
        prev.photos.push(...s.photos);
        prev.title = prev.title && s.title ? `${prev.title} – ${s.title}` : prev.title ?? s.title;
      } else merged.push({ ...s, photos: [...s.photos] });
    }
    return merged;
  }
  return null;
}

function rangeOf(ps: Photo[]): string | undefined {
  const d = ps.map((p) => p.takenAt).filter((x): x is string => !!x).sort();
  return d.length ? formatDateRange(d[0], d.at(-1)) : undefined;
}

// ── Layout scoring ─────────────────────────────────────────

const PERMS: number[][][] = [[[]]];
function perms(n: number): number[][] {
  if (PERMS[n]) return PERMS[n];
  const out: number[][] = [];
  const rec = (cur: number[], rest: number[]) => {
    if (!rest.length) out.push(cur);
    rest.forEach((r, i) => rec([...cur, r], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  rec([], [...Array(n).keys()]);
  PERMS[n] = out;
  return out;
}

export interface Assignment {
  /** order[slot] = index into the photo group */
  order: number[];
  cost: number;
  maxLoss: number;
}

/** Best way to place a group of photos into a layout's frames. */
export function assign(layout: LayoutDef, group: Photo[], themeId: ThemeId): Assignment {
  const theme = getTheme(themeId);
  const frames = layout.photos.map((f) => {
    const style = f.frame ?? theme.frame;
    return { aspect: frameAspect(f, style), area: f.w * f.h, hero: !!f.hero };
  });
  const totalArea = frames.reduce((s, f) => s + f.area, 0) || 1;
  const evaluate = (order: number[]): Assignment => {
    let cost = 0;
    let maxLoss = 0;
    order.forEach((pi, si) => {
      const p = group[pi];
      const loss = cropLoss(p.width / p.height, frames[si].aspect);
      maxLoss = Math.max(maxLoss, loss);
      // Per photo, weighted towards large frames where a bad crop is most visible.
      cost += loss * 4 * (0.6 + (0.4 * frames[si].area * frames.length) / totalArea);
      if (loss > 0.42) cost += (loss - 0.42) * 60;
      if (p.favourite && !frames[si].hero && frames.length >= 3) cost += 1.5;
    });
    return { order, cost, maxLoss };
  };
  const n = group.length;
  if (n <= 5) {
    let best: Assignment | null = null;
    for (const order of perms(n)) {
      const a = evaluate(order);
      if (!best || a.cost < best.cost) best = a;
    }
    return best!;
  }
  // Six photos: pair frames and photos by aspect rank.
  const fi = frames.map((f, i) => [f.aspect, i] as const).sort((a, b) => a[0] - b[0]);
  const pi = group.map((p, i) => [p.width / p.height, i] as const).sort((a, b) => a[0] - b[0]);
  const order = Array<number>(n);
  fi.forEach(([, slot], k) => (order[slot] = pi[k][1]));
  return evaluate(order);
}

function captionCost(layout: LayoutDef, group: Photo[], order: number[]): number {
  let cost = 0;
  const captionSlots = new Set(layout.texts.filter((t) => t.photo !== undefined).map((t) => t.photo!));
  order.forEach((pi, slot) => {
    const caption = group[pi].caption?.trim() ?? '';
    const hasSlot = captionSlots.has(slot);
    if (layout.captions === 'required' && hasSlot && !caption) cost += 6;
    if (caption && !hasSlot) cost += 2.6; // the caption someone wrote wouldn't show
    if (caption && hasSlot && layout.texts.find((t) => t.photo === slot)?.inFrame && caption.length > 40) cost += 0.8;
    if (caption && hasSlot) cost -= 0.6;
  });
  return cost;
}

export interface RankContext {
  themeId: ThemeId;
  density: number;
  rand: () => number;
  /** Book shape (default portrait). */
  format?: BookFormat;
  /** The section's heading; journal layouts are only used when there is one. */
  heading?: string;
}

export interface Candidate {
  layout: LayoutDef;
  assignment: Assignment;
  cost: number;
}

/** Scores every layout of one kind for a fixed group of photos, best first. */
export function rankLayouts(kind: LayoutDef['kind'], group: Photo[], ctx: RankContext): Candidate[] {
  const theme = getTheme(ctx.themeId);
  return layoutsFor(ctx.themeId, kind, group.length, ctx.format ?? 'portrait')
    .filter((layout) => !layout.needsHeading || !!ctx.heading)
    .map((layout) => {
      const assignment = assign(layout, group, ctx.themeId);
      let cost = assignment.cost + captionCost(layout, group, assignment.order) + (1 - (layout.weight ?? 1)) * 2;
      if (group.length === 1 && group[0].favourite) cost -= 0.8;
      // Signature layouts (made for one or two styles) are what make a style look like itself.
      if (layout.themes && layout.themes.length <= 2) cost -= 0.7;
      // Spreads: favoured by photo-book styles, rare in scrapbook-like ones.
      if (layout.spread) cost += theme.spreadBias ? -0.9 * theme.spreadBias : 1.6;
      cost += (ctx.rand() - 0.5) * 0.8;
      return { layout, assignment, cost };
    })
    .sort((a, b) => a.cost - b.cost);
}

function slotsFor(c: Candidate, group: Photo[]): PhotoSlot[] {
  return c.assignment.order.map((pi) => ({ photoId: group[pi].id }));
}

const MAX_PER_PAGE = 6;
const MAX_PER_SPREAD = 7;

/**
 * Splits one section into pages (dynamic programming over photo runs).
 * `onLeft` says whether the next page is a left-hand page: two-page spreads
 * can only start there, so the solver tracks which side each page falls on.
 */
export function paginate(photos: Photo[], ctx: RankContext, onLeft = true): { layout: LayoutDef; slots: PhotoSlot[] }[] {
  const n = photos.length;
  if (!n) return [];
  const pro = !!getTheme(ctx.themeId).pro;
  // Precompute the ranked candidates for every run [i, i+k), pages and spreads separately.
  const pagesFor: Candidate[][][] = [];
  const spreadsFor: Candidate[][][] = [];
  for (let i = 0; i < n; i++) {
    pagesFor[i] = [];
    spreadsFor[i] = [];
    for (let k = 1; k <= Math.min(MAX_PER_SPREAD, n - i); k++) {
      const group = photos.slice(i, i + k);
      const ranked = rankLayouts('photos', group, ctx);
      // Per-photo penalty for straying from the target density (per page): keeps
      // the total independent of how many pages a section is cut into.
      const single = ranked.filter((c) => !c.layout.spread).slice(0, 4);
      const spread = ranked.filter((c) => c.layout.spread).slice(0, 3);
      if (k <= MAX_PER_PAGE) pagesFor[i][k] = single.map((c) => ({ ...c, cost: c.cost + k * 0.35 * (k - ctx.density) ** 2 }));
      spreadsFor[i][k] = spread.map((c) => ({ ...c, cost: c.cost + k * 0.35 * (k / 2 - ctx.density) ** 2 }));
    }
  }
  type Step = { cost: number; k: number; c: Candidate | null };
  const memo = new Map<string, Step>();
  const solve = (i: number, prev: Candidate | null, left: boolean): Step => {
    if (i >= n) return { cost: 0, k: 0, c: null };
    const key = `${i}|${prev?.layout.id ?? ''}|${left ? 'L' : 'R'}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best: Step = { cost: Infinity, k: 1, c: null };
    for (let k = 1; k <= Math.min(MAX_PER_SPREAD, n - i); k++) {
      const choices = [...(pagesFor[i][k] ?? []), ...(left ? spreadsFor[i][k] ?? [] : [])];
      for (const c of choices) {
        let t = c.cost;
        if (prev) {
          if (prev.layout.id === c.layout.id) t += 2.5;
          if (prev.layout.photos.length === k) t += 0.8;
          if (prev.layout.bleed && c.layout.bleed) t += pro ? 0.3 : 3;
        }
        if (t >= best.cost) continue;
        // A spread fills both sides, so the next page is a left page again.
        const rest = solve(i + k, c, c.layout.spread ? left : !left);
        if (t + rest.cost < best.cost) best = { cost: t + rest.cost, k, c };
      }
    }
    memo.set(key, best);
    return best;
  };
  const pages: { layout: LayoutDef; slots: PhotoSlot[] }[] = [];
  let i = 0;
  let prev: Candidate | null = null;
  let left = onLeft;
  while (i < n) {
    const step = solve(i, prev, left);
    if (!step.c) break;
    pages.push({ layout: step.c.layout, slots: slotsFor(step.c, photos.slice(i, i + step.k)) });
    if (!step.c.layout.spread) left = !left;
    prev = step.c;
    i += step.k;
  }
  return pages;
}

// ── Whole album ────────────────────────────────────────────

export function generateAlbum({ project, photos, seed }: GenerateInput): Album {
  const themeId = project.themeId;
  const theme = getTheme(themeId);
  const format: BookFormat = project.format ?? 'portrait';
  const a = project.answers;
  const rand = mulberry32(seed * 2654435761 + project.id.length);
  const ctx: RankContext = { themeId, density: theme.singlePhotoPages ? 1 : DENSITY[a.length], rand, format };
  const proSet = theme.pro || format !== 'portrait';
  const pages: AlbumPage[] = [];
  let n = 0;
  const id = () => `pg_${seed.toString(36)}_${n++}`;
  // No separate date line when the title already is the date (e.g. Quick albums).
  const rawDate = albumDateLabel(project, photos);
  const dateLabel = rawDate && rawDate !== a.title.trim() ? rawDate : '';
  // Near-duplicates and clearly blurry shots are set aside unless the user asked for everything.
  const curated = project.useAllPhotos ? photos : curatePhotos(photos).keep;
  const chosenCover = photos.find((p) => p.id === project.coverPhotoId);
  const pool = chosenCover && !curated.includes(chosenCover) ? [...curated, chosenCover] : curated;
  const sorted = [...pool].sort((x, y) => x.order - y.order);

  // Cover.
  const cover = sorted.find((p) => p.id === project.coverPhotoId) ?? sorted.find((p) => p.favourite) ?? sorted[0];
  const loc = a.location?.trim() ?? '';
  const coverText = { title: a.title || 'Our album', subtitle: sameWords(loc, a.title) ? '' : loc, date: dateLabel };
  const poster = theme.coverStyle === 'poster';
  if (poster) {
    pages.push({
      id: id(),
      layoutId: `pro-${format}-cover-poster`,
      photos: [],
      text: coverWords(project, photos, true),
      motif: chooseMotif(project.occasionId ?? 'custom', a.location, a.title),
    });
  } else if (cover) {
    const best = rankLayouts('cover', [cover], ctx)[0];
    pages.push({ id: id(), layoutId: best.layout.id, photos: [{ photoId: cover.id }], text: coverText });
  } else {
    pages.push({ id: id(), layoutId: proSet ? `pro-${format}-chapter-text` : 'chapter-centered', photos: [], text: { heading: coverText.title, date: dateLabel } });
  }

  const interior = !poster && sorted.length >= 8 && cover ? sorted.filter((p) => p.id !== cover.id) : sorted;
  const sections = buildSections(project, interior);

  // Closing photo: the last photo of the story, when there are enough photos to spare one.
  let closingPhoto: Photo | undefined;
  if (interior.length >= 10) {
    const last = sections.at(-1)!;
    closingPhoto = last.photos.pop();
    if (!last.photos.length) sections.pop();
  }

  // Chapter openers: only for real sections, only the larger ones, within a limit.
  const eligible = sections.length >= 2 ? sections.filter((s) => s.title && s.photos.length >= 3) : [];
  const chapterLimit = theme.singlePhotoPages ? 0 : CHAPTER_LIMIT[a.length];
  const chosen = new Set([...eligible].sort((x, y) => y.photos.length - x.photos.length).slice(0, chapterLimit));
  const chapterLayouts = layoutsFor(themeId, 'chapter', undefined, format);
  const plainChapter = proSet ? `pro-${format}-chapter-text` : 'chapter-centered';
  // The cover is page 0, a right-hand page; the next page is on the left.
  let onLeft = true;
  const push = (page: AlbumPage) => {
    pages.push(page);
    if (!getLayout(page.layoutId).spread) onLeft = !onLeft;
  };

  sections.forEach((section, si) => {
    let body = section.photos;
    if (chosen.has(section)) {
      // Photo-book styles open chapters with a photo (a plain title page is the fallback).
      const choices = theme.borderless ? chapterLayouts.filter((l) => l.photos.length) : chapterLayouts;
      const pool = choices.length ? choices : chapterLayouts;
      const pick = pool[Math.floor(rand() * pool.length)];
      const text = { heading: section.title ?? '', date: section.dateLabel ?? '' };
      if (pick.photos.length) {
        const ranked = [...body].sort((x, y) => Number(y.favourite) - Number(x.favourite) || x.order - y.order);
        const hero = ranked.find((p) => cropLoss(p.width / p.height, frameAspect(pick.photos[0], pick.photos[0].frame ?? theme.frame)) < 0.45);
        if (hero) {
          body = body.filter((p) => p !== hero);
          push({ id: id(), layoutId: pick.id, photos: [{ photoId: hero.id }], text, chapterId: section.chapterId });
        } else {
          push({ id: id(), layoutId: plainChapter, photos: [], text, chapterId: section.chapterId });
        }
      } else {
        push({ id: id(), layoutId: pick.id, photos: [], text, chapterId: section.chapterId });
      }
    }
    // Journal pages need a heading: the section's own title, its dates, or the album's title (never invented words).
    const heading = section.title || section.dateLabel || coverText.title || '';
    for (const pg of paginate(body, { ...ctx, heading }, onLeft)) {
      push({ id: id(), layoutId: pg.layout.id, photos: pg.slots, text: pg.layout.needsHeading ? { heading } : {}, chapterId: section.chapterId ?? `section-${si}` });
    }
  });

  const closingText = { title: a.title || 'Our album', date: dateLabel, names: joinNames(a.names), note: a.closingNote?.trim() ?? '' };
  const closing = (kind: 'photo' | 'text') => (proSet ? `pro-${format}-closing-${kind}` : `closing-${kind}`);
  if (closingPhoto) pages.push({ id: id(), layoutId: closing('photo'), photos: [{ photoId: closingPhoto.id }], text: closingText });
  else pages.push({ id: id(), layoutId: closing('text'), photos: [], text: closingText });

  return { pages, seed, generatedAt: Date.now(), format };
}

/**
 * Cover words. Photo covers: the title, with the place and dates beneath.
 * Poster covers: the place in big letters (or the title), the occasion beneath.
 * Only the user's answers, the occasion's name and dates are used.
 */
export function coverWords(project: GenerateInput['project'], photos: Photo[], poster: boolean): Record<string, string> {
  const a = project.answers;
  const raw = albumDateLabel(project, photos);
  const date = raw && raw !== a.title.trim() ? raw : '';
  const loc = a.location?.trim() ?? '';
  if (!poster) return { title: a.title || 'Our album', subtitle: sameWords(loc, a.title) ? '' : loc, date };
  const place = a.location?.split(',')[0].trim();
  const occasionName = project.occasionId ? getOccasion(project.occasionId).name : '';
  const tagline = a.tagline?.trim();
  return place
    ? { title: place, subtitle: tagline || (a.title === place ? '' : shortOccasion(occasionName)), date }
    : { title: a.title || 'Our album', subtitle: tagline ?? '', date };
}

/** True when two phrases match ignoring case and punctuation. */
function sameWords(x: string, y: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return !!n(x) && n(x) === n(y);
}

/** "International travel" → "Travel"; short occasion names stay as they are. */
function shortOccasion(name: string): string {
  const map: Record<string, string> = { 'International travel': 'Travel', 'Local holidays & staycations': 'Staycation', 'Christmas & seasonal': 'Holidays', 'Festivals & concerts': 'Festival', 'Family gatherings': 'Family', 'Friendship memories': 'Friends', 'School memories': 'School days', 'Sporting events': 'Match day', 'Pet memories': 'Pets', 'Baby’s first year': 'First year', 'Everyday life': 'Everyday', 'Custom album': '', 'Theme parks': 'Theme park', 'Road trips': 'Road trip', 'Date nights': 'Date night', 'Work events': '' };
  return map[name] ?? name.replace(/s$/, '');
}
