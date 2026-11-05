import type { Album, AlbumLength, AlbumPage, Chapter, Photo, PhotoSlot, PlanItem, Project, ThemeId } from '@/domain/types';
import { layoutsFor } from '@/layouts/layouts';
import type { LayoutDef } from '@/layouts/schema';
import { getTheme } from '@/layouts/themes';
import { mulberry32 } from '@/render/decor';
import { cropLoss, frameAspect } from '@/render/geometry';
import { joinNames } from '@/templates/planner';

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
  project: Pick<Project, 'id' | 'answers' | 'chapters' | 'plan' | 'themeId' | 'coverPhotoId'>;
  photos: Photo[];
  seed: number;
}

export interface Section {
  chapterId?: string;
  title?: string;
  dateLabel?: string;
  photos: Photo[];
}

const DENSITY: Record<AlbumLength, number> = { short: 3.4, standard: 2.5, long: 1.7 };
const CHAPTER_LIMIT: Record<AlbumLength, number> = { short: 2, standard: 4, long: 8 };

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
    if (caption && !hasSlot) cost += 1.2;
    if (caption && hasSlot && layout.texts.find((t) => t.photo === slot)?.inFrame && caption.length > 40) cost += 0.8;
    if (caption && hasSlot) cost -= 0.6;
  });
  return cost;
}

export interface RankContext {
  themeId: ThemeId;
  density: number;
  rand: () => number;
}

export interface Candidate {
  layout: LayoutDef;
  assignment: Assignment;
  cost: number;
}

/** Scores every layout of one kind for a fixed group of photos, best first. */
export function rankLayouts(kind: LayoutDef['kind'], group: Photo[], ctx: RankContext): Candidate[] {
  return layoutsFor(ctx.themeId, kind, group.length)
    .map((layout) => {
      const assignment = assign(layout, group, ctx.themeId);
      let cost = assignment.cost + captionCost(layout, group, assignment.order) + (1 - (layout.weight ?? 1)) * 2;
      if (group.length === 1 && group[0].favourite) cost -= 0.8;
      // Signature layouts (made for one or two styles) are what make a style look like itself.
      if (layout.themes && layout.themes.length <= 2) cost -= 0.7;
      cost += (ctx.rand() - 0.5) * 0.8;
      return { layout, assignment, cost };
    })
    .sort((a, b) => a.cost - b.cost);
}

function slotsFor(c: Candidate, group: Photo[]): PhotoSlot[] {
  return c.assignment.order.map((pi) => ({ photoId: group[pi].id }));
}

/** Splits one section into pages (dynamic programming over photo runs). */
export function paginate(photos: Photo[], ctx: RankContext): { layout: LayoutDef; slots: PhotoSlot[] }[] {
  const n = photos.length;
  if (!n) return [];
  // Precompute the ranked candidates for every run [i, i+k).
  const options: Candidate[][][] = [];
  for (let i = 0; i < n; i++) {
    options[i] = [];
    for (let k = 1; k <= Math.min(6, n - i); k++) {
      const group = photos.slice(i, i + k);
      const ranked = rankLayouts('photos', group, ctx).slice(0, 4);
      // Per-photo penalty for straying from the target density: keeps the
      // total independent of how many pages a section is cut into.
      const densityCost = k * 0.35 * (k - ctx.density) ** 2;
      options[i][k] = ranked.map((c) => ({ ...c, cost: c.cost + densityCost }));
    }
  }
  // best[i][prevLayoutId] → minimal cost to lay out photos[i..n) given the previous page.
  const memo = new Map<string, { cost: number; k: number; c: Candidate | null }>();
  const solve = (i: number, prev: Candidate | null): { cost: number; k: number; c: Candidate | null } => {
    if (i >= n) return { cost: 0, k: 0, c: null };
    const key = `${i}|${prev?.layout.id ?? ''}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best = { cost: Infinity, k: 1, c: null as Candidate | null };
    for (let k = 1; k <= Math.min(6, n - i); k++) {
      for (const c of options[i][k]) {
        let t = c.cost;
        if (prev) {
          if (prev.layout.id === c.layout.id) t += 2.5;
          if (prev.layout.photos.length === k) t += 0.8;
          if (prev.layout.bleed && c.layout.bleed) t += 3;
        }
        if (t >= best.cost) continue;
        const rest = solve(i + k, c);
        if (t + rest.cost < best.cost) best = { cost: t + rest.cost, k, c };
      }
    }
    memo.set(key, best);
    return best;
  };
  const pages: { layout: LayoutDef; slots: PhotoSlot[] }[] = [];
  let i = 0;
  let prev: Candidate | null = null;
  while (i < n) {
    const step = solve(i, prev);
    if (!step.c) break;
    pages.push({ layout: step.c.layout, slots: slotsFor(step.c, photos.slice(i, i + step.k)) });
    prev = step.c;
    i += step.k;
  }
  return pages;
}

// ── Whole album ────────────────────────────────────────────

export function generateAlbum({ project, photos, seed }: GenerateInput): Album {
  const themeId = project.themeId;
  const a = project.answers;
  const rand = mulberry32(seed * 2654435761 + project.id.length);
  const ctx: RankContext = { themeId, density: DENSITY[a.length], rand };
  const pages: AlbumPage[] = [];
  let n = 0;
  const id = () => `pg_${seed.toString(36)}_${n++}`;
  const dateLabel = albumDateLabel(project, photos);
  const sorted = [...photos].sort((x, y) => x.order - y.order);

  // Cover.
  const cover = sorted.find((p) => p.id === project.coverPhotoId) ?? sorted.find((p) => p.favourite) ?? sorted[0];
  const coverText = { title: a.title || 'Our album', subtitle: a.location?.trim() ?? '', date: dateLabel };
  if (cover) {
    const best = rankLayouts('cover', [cover], ctx)[0];
    pages.push({ id: id(), layoutId: best.layout.id, photos: [{ photoId: cover.id }], text: coverText });
  } else {
    pages.push({ id: id(), layoutId: 'chapter-centered', photos: [], text: { heading: coverText.title, date: dateLabel } });
  }

  const interior = sorted.length >= 8 && cover ? sorted.filter((p) => p.id !== cover.id) : sorted;
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
  const chosen = new Set([...eligible].sort((x, y) => y.photos.length - x.photos.length).slice(0, CHAPTER_LIMIT[a.length]));
  const chapterLayouts = layoutsFor(themeId, 'chapter');

  sections.forEach((section, si) => {
    let body = section.photos;
    if (chosen.has(section)) {
      const pick = chapterLayouts[Math.floor(rand() * chapterLayouts.length)];
      const text = { heading: section.title ?? '', date: section.dateLabel ?? '' };
      if (pick.photos.length) {
        const ranked = [...body].sort((x, y) => Number(y.favourite) - Number(x.favourite) || x.order - y.order);
        const hero = ranked.find((p) => cropLoss(p.width / p.height, frameAspect(pick.photos[0], pick.photos[0].frame ?? getTheme(themeId).frame)) < 0.45);
        if (hero) {
          body = body.filter((p) => p !== hero);
          pages.push({ id: id(), layoutId: pick.id, photos: [{ photoId: hero.id }], text, chapterId: section.chapterId });
        } else {
          pages.push({ id: id(), layoutId: 'chapter-centered', photos: [], text, chapterId: section.chapterId });
        }
      } else {
        pages.push({ id: id(), layoutId: pick.id, photos: [], text, chapterId: section.chapterId });
      }
    }
    for (const pg of paginate(body, ctx)) {
      pages.push({ id: id(), layoutId: pg.layout.id, photos: pg.slots, text: {}, chapterId: section.chapterId ?? `section-${si}` });
    }
  });

  const closingText = { title: a.title || 'Our album', date: dateLabel, names: joinNames(a.names), note: a.closingNote?.trim() ?? '' };
  if (closingPhoto) pages.push({ id: id(), layoutId: 'closing-photo', photos: [{ photoId: closingPhoto.id }], text: closingText });
  else pages.push({ id: id(), layoutId: 'closing-text', photos: [], text: closingText });

  return { pages, seed, generatedAt: Date.now() };
}
