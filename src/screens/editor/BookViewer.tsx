import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/components/ui';
import type { AlbumPage, Photo } from '@/domain/types';
import type { ThemeDef } from '@/layouts/themes';
import { useMedia } from '@/lib/useMedia';
import { PageView } from '@/render/PageView';

/**
 * Reader: a two-page spread on wide screens (cover on its own, like a real
 * book), one page at a time on phones. Arrow keys, swipe and buttons turn
 * pages; the incoming page swings in from the spine.
 */

export function spreadOf(index: number): number {
  return index === 0 ? 0 : Math.ceil(index / 2);
}
export function pagesOfSpread(spread: number, count: number): number[] {
  if (spread === 0) return [0];
  return [2 * spread - 1, 2 * spread].filter((i) => i < count);
}

export function BookViewer({ pages, theme, photos, current, onSelect, onSlot, selectedSlot, editing }: {
  pages: AlbumPage[];
  theme: ThemeDef;
  photos: Map<string, Photo>;
  current: number;
  onSelect: (index: number) => void;
  onSlot?: (page: number, slot: number) => void;
  selectedSlot: number | null;
  editing: boolean;
}) {
  const wide = useMedia('(min-width: 900px)');
  // Direction of the last turn, derived from index changes (buttons, swipe, strip or keys).
  const [seen, setSeen] = useState(current);
  const [dir, setDir] = useState<'next' | 'prev' | null>(null);
  if (seen !== current) {
    setSeen(current);
    setDir(current > seen ? 'next' : 'prev');
  }
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = pages.length;
  const spread = spreadOf(current);
  const lastSpread = spreadOf(count - 1);
  const visible = wide ? pagesOfSpread(spread, count) : [current];

  const go = (delta: number) => {
    if (wide) {
      const s = Math.max(0, Math.min(lastSpread, spread + delta));
      onSelect(pagesOfSpread(s, count)[0]);
    } else onSelect(Math.max(0, Math.min(count - 1, current + delta)));
  };
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="dialog"]')) return;
      if (e.key === 'ArrowRight') goRef.current(1);
      if (e.key === 'ArrowLeft') goRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const atStart = wide ? spread === 0 : current === 0;
  const atEnd = wide ? spread === lastSpread : current === count - 1;
  const anim = (pos: number) => {
    if (!dir) return undefined;
    if (wide) {
      const right = visible.length === 1 ? true : pos === 1;
      if (dir === 'next' && right) return { animation: 'turn-in-right 0.55s cubic-bezier(.3,.7,.3,1) both', transformOrigin: 'left center' };
      if (dir === 'prev' && (!right || visible.length === 1)) return { animation: 'turn-in-left 0.55s cubic-bezier(.3,.7,.3,1) both', transformOrigin: 'right center' };
      return { animation: 'fade 0.4s ease-out both' };
    }
    return { animation: `${dir === 'next' ? 'slide-in-left' : 'slide-in-right'} 0.3s ease-out both` };
  };

  return (
    <div className="relative select-none">
      <style>{`
        @keyframes turn-in-right { from { transform: perspective(2000px) rotateY(-80deg); filter: brightness(.85); } to { transform: none; filter: none; } }
        @keyframes turn-in-left { from { transform: perspective(2000px) rotateY(80deg); filter: brightness(.85); } to { transform: none; filter: none; } }
      `}</style>
      <div
        className="mx-auto flex items-center justify-center"
        style={{ maxWidth: wide ? 'min(100%, calc((100dvh - 260px) * 1.6))' : 'min(100%, calc((100dvh - 300px) * 0.8))' }}
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
        <div className={`book-shadow relative flex w-full ${wide && visible.length === 1 ? 'justify-end' : ''}`} style={{ perspective: 2000 }}>
          {wide && visible.length === 1 && visible[0] === 0 && <div className="w-1/2" />}
          {visible.map((i, pos) => (
            <div
              key={`${i}-${pages[i].id}`}
              className={`relative ${wide ? 'w-1/2' : 'w-full'} ${editing && current === i && wide ? 'z-10 outline-2 outline-offset-2 outline-pop' : ''}`}
              style={anim(pos)}
              onClick={() => current !== i && onSelect(i)}
            >
              <PageView
                page={pages[i]}
                theme={theme}
                photos={photos}
                showEmpty={editing}
                selectedSlot={current === i ? selectedSlot : null}
                onSlotPointerDown={editing && onSlot ? (slot, e) => (e.stopPropagation(), onSlot(i, slot)) : undefined}
                title={`Page ${i + 1}`}
              />
              {wide && visible.length === 2 && (
                <div className={`pointer-events-none absolute inset-y-0 ${pos === 0 ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} w-6 from-black/15 to-transparent`} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <IconButton icon="arrowLeft" label="Previous page" onClick={() => go(-1)} disabled={atStart} className="bg-white ring-1 ring-line" />
        <span className="min-w-24 text-center text-sm text-muted tabular-nums">
          {wide ? visible.map((i) => (i === 0 ? 'Cover' : i + 1)).join('–') : current === 0 ? 'Cover' : `Page ${current + 1}`} of {count}
        </span>
        <IconButton icon="arrowRight" label="Next page" onClick={() => go(1)} disabled={atEnd} className="bg-white ring-1 ring-line" />
      </div>
    </div>
  );
}
