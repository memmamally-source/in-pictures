import type { BookFormat, Photo, Project, ThemeId } from '@/domain/types';
import { getTheme } from '@/layouts/themes';
import { chooseMotif } from '@/render/motifs';
import { getOccasion } from '@/templates/occasions';

import { applyTheme } from './edit';
import { coverWords, generateAlbum } from './generate';

/**
 * Photo albums and scrapbooks are separate products: switching style within
 * one kind keeps the pages (and edits); switching kind redesigns the book in
 * the shape that kind suits.
 */

/** The book shape a style suits for an occasion: photo albums follow the occasion (weddings square, trips landscape); scrapbooks keep their own. */
export function suggestedFormat(themeId: ThemeId, occasionId: string): BookFormat {
  const theme = getTheme(themeId);
  if (theme.kind === 'photobook') return getOccasion(occasionId).defaultFormat ?? theme.defaultFormat ?? 'portrait';
  return theme.defaultFormat ?? 'portrait';
}

export function switchTheme(project: Project, themeId: ThemeId, photos: Photo[]): Project {
  const sameKind = getTheme(themeId).kind === getTheme(project.themeId).kind;
  if (sameKind || !project.album) {
    const format = sameKind ? project.format : suggestedFormat(themeId, project.occasionId);
    const album =
      project.album &&
      applyTheme(project.album, themeId, photos, {
        motif: chooseMotif(project.occasionId, project.answers.location, project.answers.title),
        posterText: coverWords(project, photos, true),
        photoText: coverWords(project, photos, false),
      });
    return { ...project, themeId, format, album };
  }
  const next: Project = { ...project, themeId, format: suggestedFormat(themeId, project.occasionId) };
  return { ...next, album: generateAlbum({ project: next, photos, seed: project.album.seed }) };
}
