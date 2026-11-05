import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { Icon } from '@/components/Icon';
import { Thumb } from '@/components/Thumb';
import { Button, Chip, Sheet } from '@/components/ui';
import type { AlbumPage, Focal, Photo, ThemeId } from '@/domain/types';
import { getLayout, layoutsFor } from '@/layouts/layouts';
import type { LayoutDef } from '@/layouts/schema';
import { THEMES, getTheme } from '@/layouts/themes';
import { PageView } from '@/render/PageView';
import { coverCrop, defaultFocal, innerRect } from '@/render/geometry';
import { usePhotoUrl } from '@/storage/urls';

/** Pick a layout; previews use the page's own photos. */
export function LayoutSheet({ open, onClose, page, themeId, photos, onPick, mode }: {
  open: boolean;
  onClose: () => void;
  page: AlbumPage | null;
  themeId: ThemeId;
  photos: Map<string, Photo>;
  onPick: (layoutId: string) => void;
  mode: 'change' | 'add';
}) {
  const theme = getTheme(themeId);
  const currentKind = page ? getLayout(page.layoutId).kind : 'photos';
  const [kind, setKind] = useState<LayoutDef['kind']>(mode === 'add' ? 'photos' : currentKind);
  const count = page?.photos.length ?? 0;
  const list = useMemo(() => {
    const all = layoutsFor(themeId, kind);
    return [...all].sort((a, b) => Math.abs(a.photos.length - count) - Math.abs(b.photos.length - count) || a.photos.length - b.photos.length);
  }, [themeId, kind, count]);
  const demo = (l: LayoutDef): AlbumPage => ({
    id: `demo-${l.id}`,
    layoutId: l.id,
    photos: l.photos.map((_, i) => ({ photoId: mode === 'change' ? page?.photos[i]?.photoId ?? null : null })),
    text: page?.text && Object.keys(page.text).length ? page.text : { title: 'Title', heading: 'Chapter', subtitle: 'Subtitle', date: 'Date' },
  });
  return (
    <Sheet open={open} onClose={onClose} title={mode === 'add' ? 'Add a page' : 'Change layout'} wide>
      <div className="flex flex-wrap gap-2 pb-4">
        {(['photos', 'chapter', 'cover', 'closing'] as const).map((k) => (
          <Chip key={k} selected={kind === k} onClick={() => setKind(k)}>
            {{ photos: 'Photo pages', chapter: 'Chapter openers', cover: 'Covers', closing: 'Closing pages' }[k]}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pb-4 sm:grid-cols-4 md:grid-cols-5">
        {list.map((l) => (
          <button key={l.id} type="button" onClick={() => (onPick(l.id), onClose())} className={`rounded-xl p-1.5 text-left transition hover:bg-cream ${page?.layoutId === l.id && mode === 'change' ? 'ring-2 ring-pop' : ''}`}>
            <div className="overflow-hidden rounded-sm shadow-soft">
              <PageView page={demo(l)} theme={theme} photos={photos} variant="thumb" showEmpty />
            </div>
            <p className="mt-1.5 truncate text-xs">{l.name}</p>
            <p className="text-[11px] text-muted">
              {l.photos.length} photo{l.photos.length === 1 ? '' : 's'}
            </p>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Choose a photo for a frame; photos not yet in the album come first. */
export function PhotoPickerSheet({ open, onClose, photos, used, onPick }: { open: boolean; onClose: () => void; photos: Photo[]; used: Set<string>; onPick: (id: string) => void }) {
  const unused = photos.filter((p) => !used.has(p.id));
  const inAlbum = photos.filter((p) => used.has(p.id));
  const grid = (list: Photo[]) => (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {list.map((p) => (
        <button key={p.id} type="button" onClick={() => (onPick(p.id), onClose())} className="relative aspect-square overflow-hidden rounded-lg bg-sand hover:opacity-85">
          <Thumb photo={p} className="h-full w-full" />
          {p.favourite && <Icon name="heart" size={14} filled className="absolute top-1 right-1 text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Choose a photo" wide>
      <div className="space-y-5 pb-4">
        {unused.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-medium">Not in the album yet ({unused.length})</h3>
            {grid(unused)}
          </section>
        )}
        <section>
          <h3 className="mb-1 text-sm font-medium">Already in the album</h3>
          <p className="mb-2 text-xs text-muted">Picking one of these swaps the two photos’ places.</p>
          {grid(inAlbum)}
        </section>
      </div>
    </Sheet>
  );
}

/** Reposition and zoom a photo within its frame. */
export function CropSheet({ open, onClose, page, slot, themeId, photo, onSave }: {
  open: boolean;
  onClose: () => void;
  page: AlbumPage;
  slot: number;
  themeId: ThemeId;
  photo: Photo;
  onSave: (f: Focal) => void;
}) {
  const layout = getLayout(page.layoutId);
  const frame = layout.photos[slot];
  const inner = innerRect(frame, frame.frame ?? getTheme(themeId).frame);
  const fa = inner.w / inner.h;
  const ia = photo.width / photo.height;
  const [focal, setFocal] = useState<Focal>(page.photos[slot]?.focal ?? defaultFocal(ia, fa));
  const url = usePhotoUrl(photo.id, 'display');
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; f: Focal } | null>(null);
  const crop = coverCrop(ia, fa, focal);

  const down = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, f: focal };
  };
  const moveTo = (e: ReactPointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    // Dragging right shows more of the left side: move the focal point opposite to the finger.
    const dx = ((e.clientX - d.x) / r.width) * crop.sw;
    const dy = ((e.clientY - d.y) / r.height) * crop.sh;
    setFocal({ ...d.f, x: Math.max(0, Math.min(1, d.f.x - dx)), y: Math.max(0, Math.min(1, d.f.y - dy)) });
  };
  const nudge = (dx: number, dy: number) => setFocal((f) => ({ ...f, x: Math.max(0, Math.min(1, f.x + dx)), y: Math.max(0, Math.min(1, f.y + dy)) }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Adjust photo"
      footer={
        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => setFocal(defaultFocal(ia, fa))}>
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => (onSave(focal), onClose())}>Done</Button>
          </div>
        </div>
      }
    >
      <p className="pb-3 text-sm text-muted">Drag to choose what stays in view. Zoom in to crop tighter.</p>
      <div
        ref={box}
        className="relative mx-auto touch-none overflow-hidden rounded-lg bg-sand"
        style={{ aspectRatio: `${fa}`, maxHeight: '50dvh', width: fa >= 1 ? '100%' : `min(100%, calc(50dvh * ${fa}))` }}
        onPointerDown={down}
        onPointerMove={moveTo}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {url && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="absolute max-w-none cursor-grab active:cursor-grabbing"
            style={{ width: `${100 / crop.sw}%`, height: `${100 / crop.sh}%`, left: `${(-crop.sx / crop.sw) * 100}%`, top: `${(-crop.sy / crop.sh) * 100}%` }}
          />
        )}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10 ring-inset" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm text-muted">Zoom</span>
        <input type="range" min={1} max={3} step={0.01} value={focal.zoom} onChange={(e) => setFocal({ ...focal, zoom: Number(e.target.value) })} className="flex-1 accent-[#6a3ff0]" aria-label="Zoom" />
      </div>
      <div className="mt-3 flex justify-center gap-1 pb-2" aria-label="Nudge">
        <Button size="sm" variant="secondary" onClick={() => nudge(-0.05, 0)} aria-label="Show more of the left">
          ←
        </Button>
        <Button size="sm" variant="secondary" onClick={() => nudge(0, -0.05)} aria-label="Show more of the top">
          ↑
        </Button>
        <Button size="sm" variant="secondary" onClick={() => nudge(0, 0.05)} aria-label="Show more of the bottom">
          ↓
        </Button>
        <Button size="sm" variant="secondary" onClick={() => nudge(0.05, 0)} aria-label="Show more of the right">
          →
        </Button>
      </div>
    </Sheet>
  );
}

export function ThemeSheet({ open, onClose, current, onPick }: { open: boolean; onClose: () => void; current: ThemeId; onPick: (id: ThemeId) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Album style">
      <div className="grid gap-2 pb-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => (onPick(t.id), onClose())}
            className={`flex items-center gap-4 rounded-2xl p-3 text-left ring-1 transition ${current === t.id ? 'bg-white ring-2 ring-pop' : 'ring-line hover:bg-white'}`}
          >
            <span className="flex h-14 w-11 shrink-0 flex-col justify-end overflow-hidden rounded-sm shadow-soft" style={{ background: t.colors.page }}>
              <span className="h-2" style={{ background: t.colors.accent }} />
              <span className="h-2" style={{ background: t.colors.accent2 }} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg" style={{ fontFamily: `"${t.fonts.title.family}"`, fontStyle: t.fonts.title.style }}>
                {t.name}
              </span>
              <span className="line-clamp-2 block text-xs text-muted">{t.description}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
