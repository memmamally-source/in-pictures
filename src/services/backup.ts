import type { Photo, Project } from '@/domain/types';
import { createId } from '@/lib/id';
import type { Variant } from '@/storage/db';
import { NotABackupError, readZip, writeZip, type ZipInput } from '@/storage/zip';
import { normaliseAnswers } from '@/templates/planner';

import { repo } from './repository';

/**
 * Album backups: one .zip with the album's details (manifest.json) and every
 * photo file. Restoring always creates a new copy, so it never overwrites an
 * album that's already here.
 */

export const BACKUP_APP = 'in-pictures';
const VARIANTS: Variant[] = ['full', 'display', 'thumb'];

interface Manifest {
  app: typeof BACKUP_APP;
  version: 1;
  savedAt: string;
  project: Project;
  photos: Photo[];
}

export function backupFilename(title: string): string {
  const slug = title.replace(/[–—]/g, '-').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60);
  return `${slug || 'album'}.inpictures.zip`;
}

export async function createBackup(projectId: string, onProgress?: (done: number, total: number) => void): Promise<{ blob: Blob; name: string }> {
  const project = await repo.getProject(projectId);
  if (!project) throw new Error('Album not found');
  const photos = await repo.listPhotos(projectId);
  const manifest: Manifest = { app: BACKUP_APP, version: 1, savedAt: new Date().toISOString(), project, photos };
  const entries: ZipInput[] = [{ name: 'manifest.json', data: JSON.stringify(manifest) }];
  for (const p of photos) {
    for (const v of VARIANTS) {
      const blob = await repo.getBlob(p.id, v);
      if (blob) entries.push({ name: `photos/${p.id}/${v}.jpg`, data: blob });
    }
  }
  const blob = await writeZip(entries, onProgress);
  return { blob, name: backupFilename(project.answers.title) };
}

/** Rewrites ids so a restored album can sit beside the original. */
export function remapIds(manifest: Pick<Manifest, 'project' | 'photos'>, newProjectId: string): { project: Project; photos: Photo[]; idMap: Map<string, string> } {
  const idMap = new Map(manifest.photos.map((p) => [p.id, createId('ph')]));
  const mapId = (id: string | null | undefined) => (id ? idMap.get(id) ?? null : null);
  const now = Date.now();
  const src = manifest.project;
  const project: Project = {
    ...src,
    id: newProjectId,
    answers: normaliseAnswers(src.answers),
    coverPhotoId: src.coverPhotoId ? idMap.get(src.coverPhotoId) : undefined,
    album: src.album && {
      ...src.album,
      pages: src.album.pages.map((pg) => ({ ...pg, id: `${pg.id}_r`, photos: pg.photos.map((s) => ({ ...s, photoId: mapId(s.photoId) })) })),
    },
    createdAt: now,
    updatedAt: now,
  };
  const photos = manifest.photos.map((p) => ({ ...p, id: idMap.get(p.id)!, projectId: newProjectId }));
  return { project, photos, idMap };
}

export async function restoreBackup(file: Blob, onProgress?: (done: number, total: number) => void): Promise<Project> {
  const entries = await readZip(file);
  const raw = entries.get('manifest.json');
  if (!raw) throw new NotABackupError('This file isn’t a backup made by this app.');
  let manifest: Manifest;
  try {
    manifest = JSON.parse(await raw.text());
  } catch {
    throw new NotABackupError('This backup file is damaged.');
  }
  if (manifest.app !== BACKUP_APP || !manifest.project || !Array.isArray(manifest.photos)) throw new NotABackupError('This file isn’t a backup made by this app.');
  const { project, photos, idMap } = remapIds(manifest, createId('album'));
  // Photos first, project last: an interrupted restore leaves no half-album in the library.
  let done = 0;
  for (const old of manifest.photos) {
    const id = idMap.get(old.id)!;
    const blobs: Partial<Record<Variant, Blob>> = {};
    for (const v of VARIANTS) {
      const b = entries.get(`photos/${old.id}/${v}.jpg`);
      if (b) blobs[v] = new Blob([b], { type: 'image/jpeg' });
    }
    await repo.putBlobs(id, blobs);
    onProgress?.(++done, manifest.photos.length);
  }
  await repo.savePhotos(photos);
  await repo.saveProject(project);
  return project;
}
