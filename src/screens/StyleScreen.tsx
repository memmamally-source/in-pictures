import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { KindToggle } from '@/components/KindPicker';
import { ShapePicker } from '@/components/ShapePicker';
import { Button } from '@/components/ui';
import type { Album, BookFormat, Photo, Project, ThemeId } from '@/domain/types';
import { generateAlbum } from '@/engine/generate';
import { switchTheme } from '@/engine/kinds';
import { getLayout } from '@/layouts/layouts';
import { FORMATS } from '@/layouts/schema';
import { ALBUM_KINDS, THEMES, getTheme, kindOf, recommendThemes, type AlbumKind, type ThemeDef } from '@/layouts/themes';
import { PageView } from '@/render/PageView';
import { useProject } from '@/state/project';
import { getOccasion } from '@/templates/occasions';

/** A small sample of the user's own album in a theme: cover + two interior pages. */
export function useThemePreview(project: Project, photos: Photo[], themeId: ThemeId) {
  return useMemo(() => {
    const sample = photos.slice(0, 9);
    const album: Album = generateAlbum({ project: { ...project, themeId, answers: { ...project.answers, length: 'deluxe' } }, photos: sample, seed: 11 });
    const format = album.format ?? 'portrait';
    const interior = album.pages.filter((p) => getLayout(p.layoutId).kind === 'photos');
    // Always show a chapter opener too: it's where each style's boldest colours live.
    const chapter = album.pages.find((p) => getLayout(p.layoutId).kind === 'chapter') ?? {
      id: `preview-chapter-${themeId}`,
      layoutId: format === 'portrait' && !getTheme(themeId).pro ? 'chapter-centered' : `pro-${format}-chapter-text`,
      photos: [],
      text: { heading: project.chapters[1]?.title ?? project.chapters[0]?.title ?? 'Chapter one' },
    };
    // Prefer showing a two-page spread when the design has one.
    const showcase = interior.find((p) => getLayout(p.layoutId).spread) ?? interior[0];
    return { cover: album.pages[0], pages: [chapter, showcase], format };
  }, [project, photos, themeId]);
}

export function StyleScreen() {
  const project = useProject((s) => s.project)!;
  const photos = useProject((s) => s.photos);
  const updateProject = useProject((s) => s.updateProject);
  const navigate = useNavigate();
  const occasion = getOccasion(project.occasionId);
  const [kind, setKind] = useState<AlbumKind>(() => kindOf(project.themeId));
  const ranked = recommendThemes(occasion.themes, project.answers.mood, kind);
  const map = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  const format = project.format ?? 'portrait';
  const choose = (id: ThemeId) => updateProject((p) => switchTheme(p, id, photos));
  const chooseFormat = (f: BookFormat) =>
    updateProject((p) => {
      const next = { ...p, format: f };
      // New shape, new page designs (same photos).
      return { ...next, album: p.album ? generateAlbum({ project: next, photos, seed: p.album.seed }) : undefined };
    });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
      <h1 className="mt-6 font-display text-3xl">Choose a style</h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Each style changes the paper, typography, frames and page designs — previewed here with your own photos. You can switch any time; your photos and edits are kept.
      </p>
      <section className="mt-5">
        <KindToggle value={kind} onChange={setKind} />
        <p className="mt-2 max-w-xl text-sm text-muted">
          {ALBUM_KINDS.find((k) => k.id === kind)!.description}
          {kind !== kindOf(project.themeId) && project.album ? ' Choosing one of these redesigns your pages with the same photos.' : ''}
        </p>
      </section>
      <section className="mt-5 max-w-xl">
        <h2 className="mb-2 text-sm font-medium">Book shape</h2>
        <ShapePicker value={format} onChange={chooseFormat} />
        {project.album && <p className="mt-2 text-xs text-muted">Changing the shape redesigns the pages with the same photos.</p>}
      </section>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {ranked.map((id, i) => {
          const theme = THEMES.find((t) => t.id === id)!;
          return <ThemeCard key={id} theme={theme} project={project} photos={photos} map={map} selected={project.themeId === id} recommended={i < 2} onSelect={() => choose(id)} />;
        })}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <span className="truncate text-sm text-muted">{THEMES.find((t) => t.id === project.themeId)?.name}</span>
          <Button size="lg" icon="wand" onClick={() => navigate(`/album/${project.id}/album`)} disabled={!photos.length}>
            {project.album ? 'Back to my album' : 'Make my album'}
          </Button>
        </div>
      </div>
    </main>
  );
}

function ThemeCard({ theme, project, photos, map, selected, recommended, onSelect }: {
  theme: ThemeDef;
  project: Project;
  photos: Photo[];
  map: Map<string, Photo>;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}) {
  const preview = useThemePreview(project, photos, theme.id);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group rounded-3xl p-4 text-left ring-2 transition ${selected ? 'bg-white ring-pop shadow-soft' : 'bg-white/70 ring-transparent hover:bg-white hover:ring-line'}`}
    >
      <div className="flex items-start gap-2">
        {[preview.cover, ...preview.pages].map((pg, i) =>
          pg ? (
            <div key={i} className="min-w-0 overflow-hidden rounded-sm shadow-soft" style={{ flex: getLayout(pg.layoutId).spread ? 2 : 1 }}>
              <PageView page={pg} theme={theme} photos={map} variant="thumb" showEmpty format={preview.format} />
            </div>
          ) : null,
        )}
      </div>
      {theme.defaultFormat && theme.defaultFormat !== (project.format ?? 'portrait') && (
        <p className="mt-2 text-xs text-pop-dark">Looks its best as a {FORMATS[theme.defaultFormat].label.toLowerCase()} book.</p>
      )}
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl">
            {theme.name}
            {recommended && <span className="ml-2 rounded-full bg-sage px-2 py-0.5 align-middle font-sans text-xs text-sage-ink">Suggested</span>}
          </p>
          <p className="mt-1 text-sm text-muted">{theme.description}</p>
        </div>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ${selected ? 'bg-pop text-white ring-pop' : 'ring-line'}`}>{selected && <Icon name="check" size={16} />}</span>
      </div>
    </button>
  );
}
