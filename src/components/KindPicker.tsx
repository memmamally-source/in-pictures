import { Link } from 'react-router-dom';

import { DEMO_PHOTO_MAP, demoAlbum, demoSrc } from '@/demo/demoAlbum';
import { getLayout } from '@/layouts/layouts';
import { pageHeight } from '@/layouts/schema';
import { ALBUM_KINDS, getTheme, type AlbumKind } from '@/layouts/themes';
import { PageView } from '@/render/PageView';

import { Icon } from './Icon';

/** The example album's cover and one page, as each kind of album would make it. */
const SAMPLES: Record<AlbumKind, { theme: 'gallery' | 'scrapbook'; format: 'landscape' | 'portrait' }> = {
  photobook: { theme: 'gallery', format: 'landscape' },
  scrapbook: { theme: 'scrapbook', format: 'portrait' },
};

function Sample({ kind }: { kind: AlbumKind }) {
  const { theme, format } = SAMPLES[kind];
  const album = demoAlbum(theme, format);
  const inside = album.pages.find((p, i) => i > 0 && getLayout(p.layoutId).kind === 'photos' && !getLayout(p.layoutId).spread);
  const t = getTheme(theme);
  const page = (pg: (typeof album.pages)[number], cls: string) => (
    <div className={`book-shadow overflow-hidden rounded-sm ${cls}`} style={{ aspectRatio: `100 / ${pageHeight(format)}` }}>
      <PageView page={pg} theme={t} photos={DEMO_PHOTO_MAP} variant="thumb" format={format} resolveSrc={demoSrc} />
    </div>
  );
  return (
    <div className="relative mx-auto flex h-40 w-full max-w-[17rem] items-end justify-center sm:h-48" aria-hidden="true">
      {inside && page(inside, kind === 'scrapbook' ? 'absolute bottom-1 left-1/2 w-[46%] translate-x-[2%] rotate-6' : 'absolute bottom-6 left-1/2 w-[64%] -translate-x-[12%] rotate-3')}
      {page(album.pages[0], kind === 'scrapbook' ? 'relative w-[50%] -translate-x-[38%] -rotate-6' : 'relative w-[72%] -translate-x-[22%] -rotate-2')}
    </div>
  );
}

/**
 * Two kinds of album, side by side. As links (home page) or as a choice
 * (new-album screens; `value: null` means "suggest one for the occasion").
 */
export function KindPicker(
  props: { links: true; hrefFor: (kind: AlbumKind) => string; className?: string } | { links?: false; value: AlbumKind | null; onChange: (kind: AlbumKind) => void; className?: string },
) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${props.className ?? ''}`}>
      {ALBUM_KINDS.map((k) => {
        const selected = !props.links && props.value === k.id;
        const body = (
          <>
            <Sample kind={k.id} />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl leading-tight">{k.name}</p>
                <p className="mt-1 text-sm text-muted">{k.description}</p>
              </div>
              {props.links ? (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pop text-white shadow-soft transition group-hover:translate-x-0.5">
                  <Icon name="arrowRight" size={18} />
                </span>
              ) : (
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ${selected ? 'bg-pop text-white ring-pop' : 'ring-line'}`}>{selected && <Icon name="check" size={16} />}</span>
              )}
            </div>
          </>
        );
        const cls = `group block rounded-3xl p-5 text-left ring-2 transition hover:-translate-y-0.5 ${
          k.id === 'photobook' ? 'bg-gradient-to-br from-[#f4f1ec] to-[#e7e2da]' : 'bg-gradient-to-br from-[#ffe9d6] to-[#ffd9e6]'
        } ${selected ? 'ring-pop shadow-soft' : 'ring-transparent hover:shadow-soft'}`;
        return props.links ? (
          <Link key={k.id} to={props.hrefFor(k.id)} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={k.id} type="button" aria-pressed={selected} onClick={() => props.onChange(k.id)} className={cls}>
            {body}
          </button>
        );
      })}
    </div>
  );
}

/** Compact two-way switch between the kinds of album. */
export function KindToggle({ value, onChange, className = '' }: { value: AlbumKind | null; onChange: (kind: AlbumKind) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Kind of album" className={`inline-flex rounded-full bg-white p-1 ring-1 ring-line ${className}`}>
      {ALBUM_KINDS.map((k) => (
        <button
          key={k.id}
          type="button"
          role="radio"
          aria-checked={value === k.id}
          onClick={() => onChange(k.id)}
          className={`h-10 rounded-full px-4 text-sm font-medium transition ${value === k.id ? 'bg-pop text-white shadow-soft' : 'text-ink hover:bg-pop-soft'}`}
        >
          {k.id === 'photobook' ? 'Professional photo album' : 'Scrapbook'}
        </button>
      ))}
    </div>
  );
}
