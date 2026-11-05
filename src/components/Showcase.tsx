import { useEffect, useRef, useState } from 'react';

import { DEMO_PHOTO_MAP, demoAlbum, demoSrc } from '@/demo/demoAlbum';
import { THEMES } from '@/layouts/themes';
import { useMedia } from '@/lib/useMedia';
import { bookViews, pagesIn, singleViews, viewIndexOf } from '@/engine/book';
import { BookViewer } from '@/screens/editor/BookViewer';

import { Chip, IconButton } from './ui';

const STEP_MS = 2600;

/**
 * "See what it makes": an example album that turns its own pages and moves
 * through every style. Pauses when off screen, when a style is chosen, and
 * for anyone who prefers reduced motion.
 */
export function Showcase() {
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const wide = useMedia('(min-width: 900px)');
  const [pos, setPos] = useState({ theme: 0, page: 0 });
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const theme = THEMES[pos.theme];
  const format = theme.defaultFormat ?? 'portrait';
  const album = demoAlbum(theme.id, format);
  const running = playing && visible && !reduced;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Keep the current style's button in view in the sideways-scrolling row (phones).
  useEffect(() => {
    const row = chips.current;
    const chip = row?.children[pos.theme] as HTMLElement | undefined;
    if (!row || !chip) return;
    const left = chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: reduced ? 'auto' : 'smooth' });
  }, [pos.theme, reduced]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setPos(({ theme: ti, page }) => {
        const t = THEMES[ti];
        const pages = demoAlbum(t.id, t.defaultFormat ?? 'portrait').pages;
        const views = wide ? bookViews(pages) : singleViews(pages);
        const next = views[viewIndexOf(views, page) + 1];
        return next ? { theme: ti, page: pagesIn(next)[0] } : { theme: (ti + 1) % THEMES.length, page: 0 };
      });
    }, STEP_MS);
    return () => clearInterval(t);
  }, [running, wide]);

  return (
    <section ref={ref} className="mt-10 overflow-hidden rounded-[2rem] bg-white p-5 shadow-soft sm:p-8" aria-labelledby="showcase">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="showcase" className="font-display text-2xl sm:text-3xl">
            See what it makes
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">The same holiday, designed automatically in each style. Tap a style to stop on it.</p>
        </div>
        <IconButton
          icon={running ? 'pause' : 'play'}
          label={running ? 'Pause the example' : 'Play the example'}
          onClick={() => setPlaying((p) => !p)}
          className="bg-cream"
        />
      </div>
      <div ref={chips} className="scroll-snap-x -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Album styles">
        {THEMES.map((t, i) => (
          <Chip
            key={t.id}
            selected={i === pos.theme}
            onClick={() => {
              setPos({ theme: i, page: 0 });
              setPlaying(false);
            }}
            className="shrink-0"
          >
            {t.name}
          </Chip>
        ))}
      </div>
      <div className="mt-5 rounded-3xl bg-gradient-to-br from-[#fff0e3] via-[#ffe6ee] to-[#ece5ff] px-3 py-6 sm:px-8 sm:py-8">
        <BookViewer
          pages={album.pages}
          theme={theme}
          photos={DEMO_PHOTO_MAP}
          current={Math.min(pos.page, album.pages.length - 1)}
          onSelect={(page) => {
            setPos((p) => ({ ...p, page }));
            setPlaying(false);
          }}
          selectedSlot={null}
          editing={false}
          resolveSrc={demoSrc}
          keyboard={false}
          format={format}
        />
      </div>
      <p className="mt-3 text-center text-xs text-muted">Example album. Illustrations stand in for your photos; every page was laid out automatically.</p>
    </section>
  );
}
