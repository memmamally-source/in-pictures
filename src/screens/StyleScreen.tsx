import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import type { Album, Photo, Project, ThemeId } from '@/domain/types';
import { applyTheme } from '@/engine/edit';
import { generateAlbum } from '@/engine/generate';
import { getLayout } from '@/layouts/layouts';
import { THEMES, recommendThemes, type ThemeDef } from '@/layouts/themes';
import { PageView } from '@/render/PageView';
import { useProject } from '@/state/project';
import { getOccasion } from '@/templates/occasions';

/** A small sample of the user's own album in a theme: cover + two interior pages. */
export function useThemePreview(project: Project, photos: Photo[], themeId: ThemeId) {
  return useMemo(() => {
    const sample = photos.slice(0, 9);
    const album: Album = generateAlbum({ project: { ...project, themeId, answers: { ...project.answers, length: 'standard' } }, photos: sample, seed: 11 });
    const interior = album.pages.filter((p) => getLayout(p.layoutId).kind === 'photos');
    // Always show a chapter opener too: it's where each style's boldest colours live.
    const chapter = album.pages.find((p) => getLayout(p.layoutId).kind === 'chapter') ?? {
      id: `preview-chapter-${themeId}`,
      layoutId: 'chapter-centered',
      photos: [],
      text: { heading: project.chapters[1]?.title ?? project.chapters[0]?.title ?? 'Chapter one' },
    };
    return { cover: album.pages[0], pages: [chapter, interior[0]] };
  }, [project, photos, themeId]);
}

export function StyleScreen() {
  const project = useProject((s) => s.project)!;
  const photos = useProject((s) => s.photos);
  const updateProject = useProject((s) => s.updateProject);
  const navigate = useNavigate();
  const occasion = getOccasion(project.occasionId);
  const ranked = recommendThemes(occasion.themes, project.answers.mood);
  const map = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  const choose = (id: ThemeId) =>
    updateProject((p) => ({ ...p, themeId: id, album: p.album ? applyTheme(p.album, id, photos) : undefined }));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 sm:px-6">
      <h1 className="mt-6 font-display text-3xl">Choose a style</h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Each style changes the paper, typography, frames and page designs — previewed here with your own photos. You can switch any time; your photos and edits are kept.
      </p>
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
      <div className="grid grid-cols-3 gap-2">
        {[preview.cover, ...preview.pages].map((pg, i) =>
          pg ? (
            <div key={i} className="overflow-hidden rounded-sm shadow-soft">
              <PageView page={pg} theme={theme} photos={map} variant="thumb" showEmpty />
            </div>
          ) : (
            <div key={i} className="aspect-[4/5] rounded-sm" style={{ background: theme.colors.page }} />
          ),
        )}
      </div>
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
