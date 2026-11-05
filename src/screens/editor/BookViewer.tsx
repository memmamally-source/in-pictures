import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/components/ui';
import type { AlbumPage, BookFormat, Photo } from '@/domain/types';
import { bookViews, pageLabels, pagesIn, singleViews, viewIndexOf, type View } from '@/engine/book';
import { pageHeight } from '@/layouts/schema';
import type { ThemeDef } from '@/layouts/themes';
import { useMedia } from '@/lib/useMedia';
import { PageView } from '@/render/PageView';

/**
 * Reader: the open book on wide screens (cover alone on the right, then
 * facing pages, with two-page spreads across both), one page at a time on
 * phones (spreads stay whole). Arrow keys, swipe and buttons turn pages;
 * the incoming page swings in from the spine.
 */

export function BookViewer({ pages, theme, photos, current, onSelect, onSlot, selectedSlot, editing, resolveSrc, keyboard = true, format = 'portrait' }: {
  pages: AlbumPage[];
  theme: ThemeDef;
  photos: Map<string, Photo>;
  current: number;
  onSelect: (index: number) => void;
  onSlot?: (page: number, slot: number) => void;
  selectedSlot: number | null;
  editing: boolean;
  resolveSrc?: (photoId: string) => string | undefined;
  /** Arrow keys turn pages (off for the home-page example). */
  keyboard?: boolean;
  format?: BookFormat;
}) {
  const wide = useMedia('(min-width: 900px)');
  const views: View[] = wide ? bookViews(pages) : singleViews(pages);
  const at = viewIndexOf(views, current);
  const view = views[at] ?? { right: 0 };
  const labels = pageLabels(pages);

  // Direction of the last turn, derived from index changes (buttons, swipe, strip or keys).
  const [seen, setSeen] = useState(at);
  const [dir, setDir] = useState<'next' | 'prev' | null>(null);
  if (seen !== at) {
    setSeen(at);
    setDir(at > seen ? 'next' : 'prev');
  }
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = (delta: number) => {
    const target = views[Math.max(0, Math.min(views.length - 1, at + delta))];
    if (target) onSelect(pagesIn(target)[0]);
  };
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    if (!keyboard) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') goRef.current(1);
      if (e.key === 'ArrowLeft') goRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard]);

  const H = pageHeight(format);
  // The book's width in page units: two pages on wide screens, one (or a spread) on phones.
  const bookUnits = wide || view.spread !== undefined ? 200 : 100;
  const anim = (side: 'left' | 'right' | 'spread') => {
    if (!dir) return undefined;
    if (!wide) return { animation: `${dir === 'next' ? 'slide-in-left' : 'slide-in-right'} 0.3s ease-out both` };
    if (side === 'spread') return { animation: 'fade 0.45s ease-out both' };
    if (dir === 'next' && side === 'right') return { animation: 'turn-in-right 0.55s cubic-bezier(.3,.7,.3,1) both', transformOrigin: 'left center' };
    if (dir === 'prev' && side === 'left') return { animation: 'turn-in-left 0.55s cubic-bezier(.3,.7,.3,1) both', transformOrigin: 'right center' };
    return { animation: 'fade 0.4s ease-out both' };
  };

  const pageEl = (i: number, side: 'left' | 'right' | 'spread', widthClass: string) => (
    <div
      key={`${i}-${pages[i].id}`}
      className={`book-shadow relative ${widthClass} ${editing && current === i ? 'z-10 outline-2 outline-offset-2 outline-pop' : ''}`}
      style={anim(side)}
      onClick={() => current !== i && onSelect(i)}
    >
      <PageView
        page={pages[i]}
        theme={theme}
        photos={photos}
        format={format}
        showEmpty={editing}
        selectedSlot={current === i ? selectedSlot : null}
        onSlotPointerDown={editing && onSlot ? (slot, e) => (e.stopPropagation(), onSlot(i, slot)) : undefined}
        title={labels[i] === 'Cover' ? 'Cover' : `Page ${labels[i]}`}
        resolveSrc={resolveSrc}
      />
      {side === 'left' && wide && <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/15 to-transparent" />}
      {side === 'right' && wide && view.left !== undefined && <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-black/15 to-transparent" />}
      {side === 'spread' && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      )}
    </div>
  );

  const blank = (key: string) => <div key={key} className="w-1/2" style={{ aspectRatio: `100 / ${H}`, background: theme.colors.page, opacity: 0.6 }} />;

  const label =
    view.spread !== undefined
      ? `Pages ${labels[view.spread]}`
      : pagesIn(view)
          .map((i) => labels[i])
          .join('–')
          .replace(/^Cover$/, 'Cover');

  return (
    <div className="relative select-none">
      <style>{`
        @keyframes turn-in-right { from { transform: perspective(2000px) rotateY(-80deg); filter: brightness(.85); } to { transform: none; filter: none; } }
        @keyframes turn-in-left { from { transform: perspective(2000px) rotateY(80deg); filter: brightness(.85); } to { transform: none; filter: none; } }
      `}</style>
      <div
        className="mx-auto flex items-center justify-center"
        style={{ maxWidth: `min(100%, calc((100dvh - ${wide ? 260 : 300}px) * ${bookUnits / H}))` }}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="relative flex w-full" style={{ perspective: 2000 }} key={wide ? `v${at}` : undefined}>
          {view.spread !== undefined
            ? pageEl(view.spread, 'spread', 'w-full')
            : wide
              ? [
                  view.left !== undefined ? pageEl(view.left, 'left', 'w-1/2') : view.right === 0 ? <div key="before-cover" className="w-1/2" /> : blank('blank-left'),
                  view.right !== undefined ? pageEl(view.right, 'right', 'w-1/2') : blank('blank-right'),
                ]
              : pageEl(pagesIn(view)[0], 'right', 'w-full')}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <IconButton icon="arrowLeft" label="Previous page" onClick={() => go(-1)} disabled={at === 0} className="bg-white ring-1 ring-line" />
        <span className="min-w-24 text-center text-sm text-muted tabular-nums">
          {label} · {views.length > 1 ? `${at + 1} of ${views.length}` : ''}
        </span>
        <IconButton icon="arrowRight" label="Next page" onClick={() => go(1)} disabled={at >= views.length - 1} className="bg-white ring-1 ring-line" />
      </div>
    </div>
  );
}
