import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { Icon } from '@/components/Icon';
import { StorageNotice } from '@/components/StorageNotice';
import { Button, ButtonLink, Confirm, Field, Sheet, TINTS, inputClass } from '@/components/ui';
import { Brand } from '@/config/brand';
import type { Project } from '@/domain/types';
import { albumDateLabel } from '@/engine/generate';
import { getTheme } from '@/layouts/themes';
import { useLibrary } from '@/state/library';
import { usePhotoUrl } from '@/storage/urls';
import { OCCASIONS, getOccasion } from '@/templates/occasions';

export function Home() {
  const { projects, loaded, refresh } = useLibrary();
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="min-h-dvh">
      <AppHeader right={<ButtonLink to="/new" size="sm" icon="plus" className="hidden sm:inline-flex">Create an album</ButtonLink>} />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="relative mt-4 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#ffe0cc] via-[#ffd3e4] to-[#e1d6ff] px-6 py-10 sm:mt-6 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-butter/80 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-sky/90 blur-3xl" />
          <HeroBooks />
          <div className="relative max-w-xl">
            <p className="font-hand text-3xl text-pop">Hello there,</p>
            <h1 className="mt-1 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">Your memories, beautifully kept.</h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">{Brand.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink to="/new" size="lg" icon="plus">
                Create an Album
              </ButtonLink>
              <ButtonLink to="/new?have=1" size="lg" variant="secondary" icon="image">
                I already have photos
              </ButtonLink>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="ideas">
          <div className="flex items-end justify-between">
            <h2 id="ideas" className="font-display text-2xl">
              Start with an occasion
            </h2>
            <Link to="/new" className="text-sm font-medium text-pop hover:underline">
              See all
            </Link>
          </div>
          <div className="scroll-snap-x -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
            {OCCASIONS.map((o) => (
              <Link
                key={o.id}
                to={`/new/${o.id}`}
                className={`group relative flex h-44 w-40 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-3xl p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${TINTS[o.tint].bg}`}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/80 text-3xl shadow-soft transition group-hover:scale-110 group-hover:-rotate-6" aria-hidden="true">
                  {o.icon}
                </span>
                <span>
                  <span className={`block font-display text-[17px] leading-tight ${TINTS[o.tint].ink}`}>{o.name}</span>
                  <span className="mt-1 block text-xs leading-snug text-ink/70">{o.tagline}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] bg-white p-5 shadow-soft sm:p-7" aria-labelledby="library">
          <h2 id="library" className="font-display text-2xl">
            Your library
          </h2>
          {loaded && !projects.length && (
            <div className="mt-4 rounded-3xl bg-gradient-to-br from-pop-soft to-rose/60 px-6 py-10 text-center">
              <Icon name="book" size={32} className="mx-auto text-pop" />
              <p className="mt-3 font-display text-xl">No albums yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Pick an occasion above to plan your photos, or bring the photos you already have — we’ll design the pages.</p>
              <ButtonLink to="/new" className="mt-5" icon="plus">
                Create your first album
              </ButtonLink>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {projects.map((p) => (
              <AlbumCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        <StorageNotice className="mt-12" />
      </main>
    </div>
  );
}

/** Decorative stack of album pages (pure CSS, no stock photos). */
function HeroBooks() {
  const card = 'absolute rounded-sm bg-white p-2.5 pb-9 shadow-lift';
  return (
    <div className="pointer-events-none absolute top-1/2 right-10 hidden h-80 w-80 -translate-y-1/2 lg:block" aria-hidden="true">
      <div className={`${card} top-6 left-2 w-44 -rotate-8`}>
        <div className="aspect-square bg-gradient-to-b from-[#ffb36b] via-[#ff6f91] to-[#6a3ff0]" />
        <p className="mt-2 text-center font-hand text-lg text-ink/80">first view</p>
      </div>
      <div className={`${card} top-0 right-0 w-40 rotate-6`}>
        <div className="aspect-[4/5] bg-gradient-to-b from-[#7fe0ff] to-[#2ec4b6]" />
      </div>
      <div className={`${card} bottom-0 left-20 w-48 rotate-2`}>
        <div className="aspect-[4/3] bg-gradient-to-br from-[#ffe26b] via-[#ffa35c] to-[#ff5a6e]" />
        <p className="mt-2 text-center font-hand text-lg text-ink/80">golden hour</p>
      </div>
      <div className="absolute top-2 left-24 h-5 w-16 -rotate-12 bg-[#ff6f91]/60" />
      <div className="absolute right-6 bottom-10 h-5 w-14 rotate-[20deg] bg-[#2ec4b6]/55" />
    </div>
  );
}

function coverPhotoId(p: Project): string | undefined {
  return p.album?.pages[0]?.photos[0]?.photoId ?? p.coverPhotoId ?? undefined;
}

function AlbumCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const { rename, duplicate, remove } = useLibrary();
  const occasion = getOccasion(project.occasionId);
  const theme = getTheme(project.themeId);
  const url = usePhotoUrl(coverPhotoId(project), 'thumb');
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [title, setTitle] = useState(project.answers.title);
  const date = albumDateLabel(project, []);
  const href = `/album/${project.id}/${project.album ? 'album' : project.step}`;

  return (
    <article className="group relative">
      <Link to={href} className="block">
        <div className="book-shadow relative aspect-[4/5] overflow-hidden rounded-r-xl rounded-l-sm transition group-hover:-translate-y-1" style={{ background: theme.colors.page }}>
          {url ? (
            <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className={`absolute inset-0 grid place-items-center text-5xl ${TINTS[occasion.tint].bg}`} aria-hidden="true">
              {occasion.icon}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
            <p className="line-clamp-2 text-[17px] leading-tight text-white" style={{ fontFamily: `"${theme.fonts.title.family}"`, fontStyle: theme.fonts.title.style }}>
              {project.answers.title}
            </p>
          </div>
          <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent" />
        </div>
      </Link>
      <div className="mt-2 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{occasion.name}</p>
          <p className="truncate text-xs text-muted">
            {date || 'No date'} · {project.album ? `${project.album.pages.length} pages` : 'Draft'}
          </p>
        </div>
        <button type="button" onClick={() => setMenu(true)} className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-cream" aria-label={`Options for ${project.answers.title}`}>
          <Icon name="more" />
        </button>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title={project.answers.title}>
        <div className="grid gap-2 pb-2">
          <Button variant="secondary" icon="book" onClick={() => navigate(href)}>
            Open
          </Button>
          <Button variant="secondary" icon="edit" onClick={() => (setMenu(false), setTitle(project.answers.title), setRenaming(true))}>
            Rename
          </Button>
          <Button variant="secondary" icon="copy" onClick={async () => (setMenu(false), await duplicate(project.id))}>
            Duplicate
          </Button>
          <Button variant="danger" icon="trash" onClick={() => (setMenu(false), setDeleting(true))}>
            Delete
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename album"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button disabled={!title.trim()} onClick={async () => (await rename(project.id, title.trim()), setRenaming(false))}>
              Save
            </Button>
          </div>
        }
      >
        <Field label="Album name" htmlFor={`rn-${project.id}`}>
          <input id={`rn-${project.id}`} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={80} />
        </Field>
      </Sheet>

      <Confirm
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this album?"
        body={<>“{project.answers.title}” and its photos will be removed from this device. This can’t be undone, and there’s no cloud copy.</>}
        confirmLabel="Delete album"
        danger
        onConfirm={() => void remove(project.id)}
      />
    </article>
  );
}
