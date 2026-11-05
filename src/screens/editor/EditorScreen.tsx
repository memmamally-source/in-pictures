import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { Thumb } from '@/components/Thumb';
import { Button, ButtonLink, Confirm, IconButton, inputClass } from '@/components/ui';
import type { Album, Photo } from '@/domain/types';
import {
  addPage, applyTheme, changeLayout, clearSlot, movePage, placePhoto, removePage, setFocal, setText, shufflePage, swapSlots, unusedPhotos, usedPhotoIds,
} from '@/engine/edit';
import { generateAlbum } from '@/engine/generate';
import { getLayout } from '@/layouts/layouts';
import { getTheme } from '@/layouts/themes';
import { PageView } from '@/render/PageView';
import { useProject } from '@/state/project';

import { BookViewer } from './BookViewer';
import { ExportSheet } from './ExportSheet';
import { CropSheet, LayoutSheet, PhotoPickerSheet, ThemeSheet } from './sheets';

const TEXT_LABELS: Record<string, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  heading: 'Chapter title',
  date: 'Date line',
  names: 'Names',
  note: 'Closing words',
};

export function EditorScreen() {
  const project = useProject((s) => s.project)!;
  const photos = useProject((s) => s.photos);
  const updateProject = useProject((s) => s.updateProject);
  const updatePhotos = useProject((s) => s.updatePhotos);
  const imports = useProject((s) => s.imports);
  const [current, setCurrent] = useState(0);
  const [slot, setSlot] = useState<number | null>(null);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [sheet, setSheet] = useState<null | 'layout' | 'add' | 'picker' | 'crop' | 'theme' | 'export' | 'regen' | 'delete'>(null);
  const theme = getTheme(project.themeId);
  const map = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const album = project.album;

  // First visit: design the album from the photos.
  const generated = useRef(false);
  useEffect(() => {
    if (!project.album && photos.length && !generated.current && !imports?.active) {
      generated.current = true;
      updateProject((p) => ({ ...p, step: 'album', album: generateAlbum({ project: p, photos, seed: 1 }) }));
    }
  }, [project.album, photos, imports?.active, updateProject]);

  if (!album) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <Icon name="book" size={36} className="mx-auto text-muted" />
        <h1 className="mt-3 font-display text-2xl">{photos.length ? 'Designing your album…' : 'Add some photos first'}</h1>
        {!photos.length && (
          <ButtonLink className="mt-5" to={`/album/${project.id}/photos`}>
            Add photos
          </ButtonLink>
        )}
      </main>
    );
  }

  const idx = Math.min(current, album.pages.length - 1);
  const page = album.pages[idx];
  const layout = getLayout(page.layoutId);
  const used = usedPhotoIds(album);
  const spare = unusedPhotos(album, photos);
  const set = (a: Album) => updateProject((p) => ({ ...p, album: a }));
  const select = (i: number) => {
    setCurrent(i);
    setSlot(null);
    setSwapFrom(null);
  };
  const onSlot = (pageIndex: number, s: number) => {
    if (pageIndex !== idx) return select(pageIndex);
    if (swapFrom !== null && swapFrom !== s) {
      set(swapSlots(album, idx, swapFrom, s));
      setSwapFrom(null);
      setSlot(s);
      return;
    }
    setSlot(slot === s ? null : s);
    setSwapFrom(null);
  };
  const slotPhoto: Photo | undefined = slot !== null && page.photos[slot]?.photoId ? map.get(page.photos[slot].photoId!) : undefined;
  const textKeys = [...new Set(layout.texts.filter((t) => t.photo === undefined).map((t) => t.key))];
  if (layout.texts.some((t) => t.key === 'subtitle') && !textKeys.includes('date') && page.text.date) textKeys.push('date');
  const captionSlots = layout.texts.filter((t) => t.photo !== undefined).map((t) => t.photo!);

  return (
    <main className="mx-auto max-w-7xl px-3 pb-12 sm:px-5">
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon="palette" onClick={() => setSheet('theme')}>
          {theme.name}
        </Button>
        <Button size="sm" variant="secondary" icon="refresh" onClick={() => setSheet('regen')}>
          Redesign album
        </Button>
        {spare.length > 0 && (
          <span className="rounded-full bg-butter px-3 py-1.5 text-xs text-butter-ink">
            {spare.length} photo{spare.length === 1 ? '' : 's'} not in the album
          </span>
        )}
        <Button size="sm" icon="download" className="ml-auto" onClick={() => setSheet('export')}>
          Export PDF
        </Button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
        <section aria-label="Album preview" className="min-w-0">
          <BookViewer pages={album.pages} theme={theme} photos={map} current={idx} onSelect={select} onSlot={onSlot} selectedSlot={slot} editing />

          <div className="scroll-snap-x mt-5 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Pages">
            {album.pages.map((pg, i) => (
              <button
                key={pg.id}
                type="button"
                role="listitem"
                onClick={() => select(i)}
                aria-current={i === idx}
                className={`w-16 shrink-0 snap-start rounded p-0.5 transition sm:w-20 ${i === idx ? 'ring-2 ring-pop' : 'opacity-80 hover:opacity-100'}`}
              >
                <PageView page={pg} theme={theme} photos={map} variant="thumb" />
                <span className="mt-0.5 block text-center text-[11px] text-muted">{i === 0 ? 'Cover' : i + 1}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="space-y-5 rounded-3xl bg-white p-4 ring-1 ring-line lg:sticky lg:top-32 lg:self-start" aria-label="Edit page">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg">{idx === 0 ? 'Cover' : `Page ${idx + 1}`}</h2>
            <div className="flex">
              <IconButton icon="arrowLeft" label="Move page earlier" disabled={idx <= 1} onClick={() => (set(movePage(album, idx, idx - 1)), setCurrent(idx - 1))} />
              <IconButton icon="arrowRight" label="Move page later" disabled={idx === 0 || idx >= album.pages.length - 1} onClick={() => (set(movePage(album, idx, idx + 1)), setCurrent(idx + 1))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="secondary" icon="grid" onClick={() => setSheet('layout')}>
              Layout
            </Button>
            <Button size="sm" variant="secondary" icon="sparkle" onClick={() => set(shufflePage(album, idx, photos, project.themeId))}>
              Try another
            </Button>
          </div>
          <p className="-mt-3 text-xs text-muted">Layout: {layout.name}</p>

          {page.photos.length > 0 && (
            <div>
              <p className="text-sm font-medium">Photos on this page</p>
              <p className="text-xs text-muted">{swapFrom !== null ? 'Now tap the photo to swap with.' : 'Tap a photo here or on the page to change it.'}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {page.photos.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSlot(idx, i)}
                    className={`relative h-14 w-14 overflow-hidden rounded-lg bg-sand ring-2 transition ${slot === i ? 'ring-pop' : swapFrom === i ? 'ring-sage-ink' : 'ring-transparent'}`}
                    aria-label={`Photo ${i + 1}`}
                  >
                    {s.photoId ? <Thumb photo={{ id: s.photoId }} className="h-full w-full" /> : <Icon name="plus" className="m-auto text-muted" />}
                  </button>
                ))}
              </div>
              {slot !== null && (
                <div className="animate-fade mt-3 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" icon="image" onClick={() => setSheet('picker')}>
                    {slotPhoto ? 'Replace' : 'Add photo'}
                  </Button>
                  <Button size="sm" variant="secondary" icon="crop" disabled={!slotPhoto} onClick={() => setSheet('crop')}>
                    Adjust
                  </Button>
                  <Button size="sm" variant="secondary" icon="swap" disabled={page.photos.length < 2} onClick={() => setSwapFrom(slot)}>
                    Swap
                  </Button>
                  <Button size="sm" variant="secondary" icon="close" disabled={!slotPhoto} onClick={() => set(clearSlot(album, idx, slot))}>
                    Remove
                  </Button>
                  {slotPhoto && (
                    <Button
                      size="sm"
                      variant={slotPhoto.favourite ? 'primary' : 'secondary'}
                      icon="heart"
                      className="col-span-2"
                      onClick={() => updatePhotos((ps) => ps.map((p) => (p.id === slotPhoto.id ? { ...p, favourite: !p.favourite } : p)))}
                    >
                      {slotPhoto.favourite ? 'Favourite' : 'Mark favourite'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {(textKeys.length > 0 || captionSlots.length > 0) && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Words</p>
              {textKeys.map((k) => (
                <label key={k} className="block">
                  <span className="text-xs text-muted">{TEXT_LABELS[k] ?? k}</span>
                  {k === 'note' ? (
                    <textarea rows={2} className={`${inputClass} mt-1`} value={page.text[k] ?? ''} onChange={(e) => set(setText(album, idx, k, e.target.value))} maxLength={240} />
                  ) : (
                    <input className={`${inputClass} mt-1`} value={page.text[k] ?? ''} onChange={(e) => set(setText(album, idx, k, e.target.value))} maxLength={90} />
                  )}
                </label>
              ))}
              {captionSlots.map((s) => {
                const ph = page.photos[s]?.photoId ? map.get(page.photos[s].photoId!) : undefined;
                if (!ph) return null;
                return (
                  <label key={`c${s}`} className="block">
                    <span className="text-xs text-muted">Caption for photo {s + 1}</span>
                    <input
                      className={`${inputClass} mt-1`}
                      value={ph.caption ?? ''}
                      maxLength={200}
                      placeholder="Optional — your words"
                      onChange={(e) => updatePhotos((ps) => ps.map((p) => (p.id === ph.id ? { ...p, caption: e.target.value || undefined } : p)))}
                    />
                  </label>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-line pt-4">
            <Button size="sm" variant="secondary" icon="plus" onClick={() => setSheet('add')}>
              Add page
            </Button>
            <Button size="sm" variant="danger" icon="trash" disabled={idx === 0 || album.pages.length <= 2} onClick={() => setSheet('delete')}>
              Delete page
            </Button>
          </div>
        </aside>
      </div>

      {sheet === 'layout' && (
        <LayoutSheet open onClose={() => setSheet(null)} page={page} themeId={project.themeId} photos={map} mode="change" onPick={(id) => (set(changeLayout(album, idx, id, photos)), setSlot(null))} />
      )}
      {sheet === 'add' && (
        <LayoutSheet open onClose={() => setSheet(null)} page={null} themeId={project.themeId} photos={map} mode="add" onPick={(id) => (set(addPage(album, idx, id, photos)), select(idx + 1))} />
      )}
      {sheet === 'picker' && slot !== null && <PhotoPickerSheet open onClose={() => setSheet(null)} photos={photos} used={used} onPick={(id) => set(placePhoto(album, idx, slot, id))} />}
      {sheet === 'crop' && slot !== null && slotPhoto && (
        <CropSheet open onClose={() => setSheet(null)} page={page} slot={slot} themeId={project.themeId} photo={slotPhoto} onSave={(f) => set(setFocal(album, idx, slot, f))} />
      )}
      {sheet === 'theme' && <ThemeSheet open onClose={() => setSheet(null)} current={project.themeId} onPick={(id) => updateProject((p) => ({ ...p, themeId: id, album: p.album && applyTheme(p.album, id, photos) }))} />}
      {sheet === 'export' && <ExportSheet open onClose={() => setSheet(null)} album={album} photos={photos} themeId={project.themeId} title={project.answers.title} onGoToPage={select} />}
      <Confirm
        open={sheet === 'regen'}
        onClose={() => setSheet(null)}
        title="Redesign the whole album?"
        body="All pages are laid out again with a fresh arrangement, using every photo. Your photos, captions, favourites and chapters stay; changes you made to individual pages (layouts, crops, page order, edited titles) are replaced."
        confirmLabel="Redesign"
        onConfirm={() => {
          updateProject((p) => ({ ...p, album: generateAlbum({ project: p, photos, seed: (p.album?.seed ?? 1) + 1 }) }));
          select(0);
        }}
      />
      <Confirm
        open={sheet === 'delete'}
        onClose={() => setSheet(null)}
        title="Delete this page?"
        body="Its photos go back to the “not in the album” tray, so you can use them elsewhere."
        confirmLabel="Delete page"
        danger
        onConfirm={() => (set(removePage(album, idx)), select(Math.max(0, idx - 1)))}
      />
    </main>
  );
}
