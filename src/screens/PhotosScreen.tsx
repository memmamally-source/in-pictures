import { useMemo, useState, type DragEvent } from 'react';

import { Icon } from '@/components/Icon';
import { ImportStatus } from '@/components/ImportStatus';
import { PhotoInput } from '@/components/PhotoInput';
import { StorageNotice } from '@/components/StorageNotice';
import { Thumb } from '@/components/Thumb';
import { Button, ButtonLink, Chip, Confirm, Field, Notice, Sheet, inputClass } from '@/components/ui';
import type { Photo } from '@/domain/types';
import { useProject } from '@/state/project';
import { usePhotoUrl } from '@/storage/urls';

/** Renumbers orders after moving one photo, returning only what changed. */
export function reorder(photos: Photo[], from: number, to: number): Photo[] {
  const list = [...photos];
  const [p] = list.splice(from, 1);
  list.splice(to, 0, p);
  return list.map((ph, i) => (ph.order === i + 1 ? ph : { ...ph, order: i + 1 }));
}

export function PhotosScreen() {
  const project = useProject((s) => s.project)!;
  const photos = useProject((s) => s.photos);
  const updatePhotos = useProject((s) => s.updatePhotos);
  const updateProject = useProject((s) => s.updateProject);
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const addFiles = useProject((s) => s.addFiles);

  const planById = useMemo(() => new Map(project.plan.map((i) => [i.id, i])), [project.plan]);
  const chapterOf = (p: Photo) => p.chapter ?? (p.planItemId ? planById.get(p.planItemId)?.chapter : undefined);
  const shown = photos.filter((p) => filter === 'all' || (filter === 'unsorted' ? !chapterOf(p) : chapterOf(p) === filter));
  const usedChapters = project.chapters.filter((c) => photos.some((p) => chapterOf(p) === c.id));
  const current = photos.find((p) => p.id === open) ?? null;

  const move = (id: string, delta: number) => {
    const from = photos.findIndex((p) => p.id === id);
    const to = Math.max(0, Math.min(photos.length - 1, from + delta));
    if (from !== to) updatePhotos((ps) => reorder(ps, from, to));
  };
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const from = photos.findIndex((p) => p.id === dragId);
    const to = photos.findIndex((p) => p.id === targetId);
    updatePhotos((ps) => reorder(ps, from, to));
    setDragId(null);
  };
  const sortByDate = () =>
    updatePhotos((ps) =>
      [...ps]
        .sort((a, b) => (a.takenAt ?? '9999').localeCompare(b.takenAt ?? '9999') || a.order - b.order)
        .map((p, i) => (p.order === i + 1 ? p : { ...p, order: i + 1 })),
    );
  const fileDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const files = [...e.dataTransfer.files];
    if (files.length) void addFiles(files);
  };

  return (
    <main
      className="mx-auto max-w-6xl px-4 pb-28 sm:px-6"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={fileDrop}
    >
      <section className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl">Photos</h1>
          <p className="mt-1 max-w-lg text-sm text-muted">Add photos from your device. Tap a photo to caption it, mark a favourite or put it in a chapter. Drag (or use the arrows) to reorder — the album follows this order.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PhotoInput icon="upload" size="lg">
            Add photos
          </PhotoInput>
          <PhotoInput icon="camera" size="lg" variant="secondary" camera>
            Camera
          </PhotoInput>
        </div>
      </section>

      <div className="mt-4 space-y-3">
        <ImportStatus />
        <StorageNotice compact />
        {dropping && <Notice>Drop photos to add them</Notice>}
      </div>

      {photos.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            All {photos.length}
          </Chip>
          {usedChapters.map((c) => (
            <Chip key={c.id} selected={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.title}
            </Chip>
          ))}
          <Chip selected={filter === 'unsorted'} onClick={() => setFilter('unsorted')}>
            Not in a chapter
          </Chip>
          <Button size="sm" variant="ghost" icon="list" onClick={sortByDate} className="ml-auto">
            Sort by date taken
          </Button>
        </div>
      )}

      {!photos.length && (
        <div className="mt-6 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <Icon name="image" size={36} className="mx-auto text-muted" />
          <p className="mt-3 font-display text-xl">Bring in your photos</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">JPG, PNG, WebP and HEIC (where your browser supports it). They stay on this device. You can also drop files here.</p>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {shown.map((p) => {
          const item = p.planItemId ? planById.get(p.planItemId) : undefined;
          return (
            <li
              key={p.id}
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => (e.stopPropagation(), onDrop(p.id))}
              className={`group relative aspect-square overflow-hidden rounded-xl bg-sand ${dragId === p.id ? 'opacity-40' : ''}`}
            >
              <button type="button" className="absolute inset-0" onClick={() => setOpen(p.id)} aria-label={`Edit ${p.caption || p.name}`}>
                <Thumb photo={p} className="h-full w-full" />
              </button>
              {p.favourite && (
                <span className="pointer-events-none absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-brand">
                  <Icon name="heart" size={15} filled />
                </span>
              )}
              {project.coverPhotoId === p.id && <span className="pointer-events-none absolute top-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px]">Cover</span>}
              {(p.caption || item) && (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pt-5 pb-1.5 text-[11px] text-white">
                  {p.caption || item?.title}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <span className="text-sm text-muted">{photos.length ? `${photos.length} photos · ${photos.filter((p) => p.favourite).length} favourites` : 'No photos yet'}</span>
          <ButtonLink to={`/album/${project.id}/style`} size="lg" className={photos.length ? '' : 'pointer-events-none opacity-45'} aria-disabled={!photos.length}>
            Choose a style
          </ButtonLink>
        </div>
      </div>

      {current && (
        <PhotoSheet
          photo={current}
          index={photos.indexOf(current)}
          count={photos.length}
          isCover={project.coverPhotoId === current.id}
          onClose={() => setOpen(null)}
          onMove={(d) => move(current.id, d)}
          onCover={() => updateProject((p) => ({ ...p, coverPhotoId: p.coverPhotoId === current.id ? undefined : current.id }))}
        />
      )}
    </main>
  );
}

function PhotoSheet({ photo, index, count, isCover, onClose, onMove, onCover }: {
  photo: Photo;
  index: number;
  count: number;
  isCover: boolean;
  onClose: () => void;
  onMove: (delta: number) => void;
  onCover: () => void;
}) {
  const project = useProject((s) => s.project)!;
  const updatePhotos = useProject((s) => s.updatePhotos);
  const removePhotos = useProject((s) => s.removePhotos);
  const url = usePhotoUrl(photo.id, 'display');
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<Photo>) => updatePhotos((ps) => ps.map((p) => (p.id === photo.id ? { ...p, ...patch } : p)));
  const lowRes = Math.max(photo.originalWidth, photo.originalHeight) < 1500;

  return (
    <Sheet open onClose={onClose} title="Photo" wide>
      <div className="grid gap-5 pb-3 sm:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-2xl bg-sand">{url ? <img src={url} alt={photo.caption ?? ''} className="max-h-[50dvh] w-full object-contain" /> : <div className="aspect-[4/3]" />}</div>
        <div className="space-y-4">
          <Field label="Caption (optional)" htmlFor="cap" hint="Only your words appear in the album.">
            <textarea id="cap" rows={2} className={inputClass} value={photo.caption ?? ''} maxLength={200} onChange={(e) => set({ caption: e.target.value || undefined })} />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant={photo.favourite ? 'primary' : 'secondary'} size="sm" icon="heart" onClick={() => set({ favourite: !photo.favourite })} aria-pressed={photo.favourite}>
              {photo.favourite ? 'Favourite' : 'Mark favourite'}
            </Button>
            <Button variant={isCover ? 'primary' : 'secondary'} size="sm" icon="book" onClick={onCover} aria-pressed={isCover}>
              {isCover ? 'Cover photo' : 'Use as cover'}
            </Button>
          </div>
          <Field label="Photo idea" htmlFor="prompt">
            <select
              id="prompt"
              className={inputClass}
              value={photo.planItemId ?? ''}
              onChange={(e) => {
                const item = project.plan.find((i) => i.id === e.target.value);
                set({ planItemId: item?.id, chapter: item ? item.chapter : photo.chapter });
              }}
            >
              <option value="">None</option>
              {project.plan
                .filter((i) => !i.skipped)
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Chapter" htmlFor="chap">
            <select id="chap" className={inputClass} value={photo.chapter ?? ''} onChange={(e) => set({ chapter: e.target.value || undefined })}>
              <option value="">Let the album decide</option>
              {project.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" icon="arrowLeft" disabled={index === 0} onClick={() => onMove(-1)}>
                Earlier
              </Button>
              <Button size="sm" variant="secondary" icon="arrowRight" disabled={index === count - 1} onClick={() => onMove(1)}>
                Later
              </Button>
            </div>
            <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm(true)}>
              Remove
            </Button>
          </div>
          <p className="text-xs text-muted">
            {photo.name} · {photo.originalWidth}×{photo.originalHeight}
            {photo.takenAt ? ` · taken ${photo.takenAt.slice(0, 10)}` : ''}
          </p>
          {lowRes && <Notice tone="warn">This photo is small ({photo.originalWidth}×{photo.originalHeight}). It will look fine on screen but soft if printed large.</Notice>}
        </div>
      </div>
      <Confirm
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove this photo?"
        body="It will be removed from this album and from this device’s storage. The original on your phone or computer isn’t affected."
        confirmLabel="Remove photo"
        danger
        onConfirm={() => (void removePhotos([photo.id]), onClose())}
      />
    </Sheet>
  );
}
