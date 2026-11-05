import type { Album, AlbumPage, Focal, Photo, ThemeId } from '@/domain/types';
import { getLayout, layoutsFor } from '@/layouts/layouts';
import { mulberry32 } from '@/render/decor';

import { assign, rankLayouts } from './generate';

/**
 * Pure album edits used by the editor. Each returns a new Album and never
 * touches photo files, so any change can be undone by regenerating.
 */

const touch = (album: Album, index: number, fn: (p: AlbumPage) => AlbumPage): Album => ({
  ...album,
  pages: album.pages.map((p, i) => (i === index ? { ...fn(p), edited: true } : p)),
});

export function usedPhotoIds(album: Album): Set<string> {
  return new Set(album.pages.flatMap((p) => p.photos.map((s) => s.photoId).filter((x): x is string => !!x)));
}

export function unusedPhotos(album: Album, photos: Photo[]): Photo[] {
  const used = usedPhotoIds(album);
  return photos.filter((p) => !used.has(p.id)).sort((a, b) => a.order - b.order);
}

export function movePage(album: Album, from: number, to: number): Album {
  if (to < 0 || to >= album.pages.length || from === to) return album;
  const pages = [...album.pages];
  const [p] = pages.splice(from, 1);
  pages.splice(to, 0, { ...p, edited: true });
  return { ...album, pages };
}

export function removePage(album: Album, index: number): Album {
  if (album.pages.length <= 1) return album;
  return { ...album, pages: album.pages.filter((_, i) => i !== index) };
}

let counter = 0;
export const newPageId = () => `pg_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Inserts a page after `index`, filled with photos not yet in the album. */
export function addPage(album: Album, index: number, layoutId: string, photos: Photo[]): Album {
  const layout = getLayout(layoutId);
  const pool = unusedPhotos(album, photos).slice(0, layout.photos.length);
  const page: AlbumPage = {
    id: newPageId(),
    layoutId,
    photos: layout.photos.map((_, i) => ({ photoId: pool[i]?.id ?? null })),
    text: layout.kind === 'chapter' ? { heading: 'New chapter' } : layout.kind === 'closing' ? { title: 'The end' } : {},
    edited: true,
  };
  const pages = [...album.pages];
  pages.splice(index + 1, 0, page);
  return { ...album, pages };
}

/**
 * Switches a page's layout, keeping its photos in order. Extra frames are
 * filled from unused photos (or left empty to fill by hand); photos that
 * no longer fit go back to the unused tray.
 */
export function changeLayout(album: Album, index: number, layoutId: string, photos: Photo[]): Album {
  const layout = getLayout(layoutId);
  const page = album.pages[index];
  const kept = page.photos.filter((s) => s.photoId).slice(0, layout.photos.length);
  const others: Album = { ...album, pages: album.pages.filter((_, i) => i !== index) };
  const keptIds = new Set(kept.map((s) => s.photoId));
  const pool = unusedPhotos(others, photos).filter((p) => !keptIds.has(p.id));
  const slots = layout.photos.map((_, i) => kept[i] ?? { photoId: pool.shift()?.id ?? null });
  return touch(album, index, (p) => ({ ...p, layoutId, photos: slots }));
}

export function swapSlots(album: Album, index: number, a: number, b: number): Album {
  return touch(album, index, (p) => {
    const photos = [...p.photos];
    [photos[a], photos[b]] = [{ photoId: photos[b].photoId }, { photoId: photos[a].photoId }];
    return { ...p, photos };
  });
}

/**
 * Puts a photo into a slot. If that photo is already elsewhere in the album,
 * the two swap places, so no photo appears twice or silently disappears.
 */
export function placePhoto(album: Album, index: number, slot: number, photoId: string): Album {
  const previous = album.pages[index].photos[slot]?.photoId ?? null;
  let pages = album.pages.map((p, pi) => {
    const at = p.photos.findIndex((s) => s.photoId === photoId);
    if (at === -1 || (pi === index && at === slot)) return p;
    const photos = [...p.photos];
    photos[at] = { photoId: previous };
    return { ...p, photos, edited: true };
  });
  pages = pages.map((p, pi) => {
    if (pi !== index) return p;
    const photos = [...p.photos];
    photos[slot] = { photoId };
    return { ...p, photos, edited: true };
  });
  return { ...album, pages };
}

export function clearSlot(album: Album, index: number, slot: number): Album {
  return touch(album, index, (p) => ({ ...p, photos: p.photos.map((s, i) => (i === slot ? { photoId: null } : s)) }));
}

export function setFocal(album: Album, index: number, slot: number, focal: Focal): Album {
  return touch(album, index, (p) => ({ ...p, photos: p.photos.map((s, i) => (i === slot ? { ...s, focal } : s)) }));
}

export function setText(album: Album, index: number, key: string, value: string): Album {
  return touch(album, index, (p) => ({ ...p, text: { ...p.text, [key]: value } }));
}

/** "Try another layout": the next-best design for the same photos. */
export function shufflePage(album: Album, index: number, photos: Photo[], themeId: ThemeId): Album {
  const page = album.pages[index];
  const layout = getLayout(page.layoutId);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const group = page.photos.map((s) => (s.photoId ? byId.get(s.photoId) : undefined)).filter((p): p is Photo => !!p);
  if (group.length !== page.photos.length) {
    // Has empty frames: cycle through layouts of the same size.
    const same = layoutsFor(themeId, layout.kind, layout.photos.length);
    const next = same[(same.findIndex((l) => l.id === layout.id) + 1) % same.length];
    return touch(album, index, (p) => ({ ...p, layoutId: next.id }));
  }
  const ranked = rankLayouts(layout.kind, group, { themeId, density: 2.5, rand: mulberry32(1) });
  if (ranked.length < 2) return album;
  const at = ranked.findIndex((c) => c.layout.id === layout.id);
  const next = ranked[(at + 1) % ranked.length];
  return touch(album, index, (p) => ({ ...p, layoutId: next.layout.id, photos: next.assignment.order.map((i) => ({ photoId: group[i].id })) }));
}

/**
 * Applies a new theme: every page keeps its photos and text and moves to the
 * closest layout the theme offers (same kind and photo count, best fit).
 */
export function applyTheme(album: Album, themeId: ThemeId, photos: Photo[]): Album {
  const byId = new Map(photos.map((p) => [p.id, p]));
  return {
    ...album,
    pages: album.pages.map((page) => {
      const layout = getLayout(page.layoutId);
      if (!layout.themes || layout.themes.includes(themeId)) return page;
      const options = layoutsFor(themeId, layout.kind, layout.photos.length);
      if (!options.length) return page;
      const group = page.photos.map((s) => (s.photoId ? byId.get(s.photoId) : undefined));
      if (group.every((p): p is Photo => !!p)) {
        const best = options
          .map((l) => ({ l, a: assign(l, group, themeId) }))
          .sort((x, y) => x.a.cost - y.a.cost)[0];
        return { ...page, layoutId: best.l.id, photos: best.a.order.map((i) => ({ photoId: group[i].id, focal: page.photos[i].focal })) };
      }
      return { ...page, layoutId: options[0].id };
    }),
  };
}

/** Pages in the album that show a given photo. */
export function pagesWithPhoto(album: Album, photoId: string): number[] {
  return album.pages.flatMap((p, i) => (p.photos.some((s) => s.photoId === photoId) ? [i] : []));
}

/** Drops removed photos from the album (frames become empty for the user to fill). */
export function forgetPhotos(album: Album, removed: Set<string>): Album {
  return {
    ...album,
    pages: album.pages.map((p) =>
      p.photos.some((s) => s.photoId && removed.has(s.photoId)) ? { ...p, photos: p.photos.map((s) => (s.photoId && removed.has(s.photoId) ? { photoId: null } : s)) } : p,
    ),
  };
}
