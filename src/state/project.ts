import { create } from 'zustand';

import type { Album, Photo, Project } from '@/domain/types';
import { forgetPhotos } from '@/engine/edit';
import { createId } from '@/lib/id';
import { repo } from '@/services/repository';
import { isProbablyImage, processImage } from '@/storage/images';
import { releasePhotoUrls } from '@/storage/urls';

/**
 * The open project. Every change is saved automatically: project JSON after a
 * short pause, photo metadata immediately, photo pixels as each one finishes
 * processing — so a closed tab loses at most the last half-second of edits.
 */

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface ImportProgress {
  total: number;
  done: number;
  failed: { name: string; reason: string }[];
  active: boolean;
}

interface ProjectState {
  project: Project | null;
  photos: Photo[];
  status: 'idle' | 'loading' | 'ready' | 'missing';
  save: SaveState;
  saveError?: string;
  imports: ImportProgress | null;
  load: (id: string) => Promise<void>;
  close: () => void;
  updateProject: (fn: (p: Project) => Project) => void;
  setAlbum: (album: Album) => void;
  updatePhotos: (fn: (photos: Photo[]) => Photo[]) => void;
  addFiles: (files: File[], extra?: Partial<Pick<Photo, 'planItemId' | 'chapter'>>) => Promise<void>;
  removePhotos: (ids: string[]) => Promise<void>;
  flush: () => Promise<void>;
  dismissImports: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export const useProject = create<ProjectState>()((set, get) => {
  const persistProject = async () => {
    timer = null;
    const p = get().project;
    if (!p) return;
    set({ save: 'saving' });
    try {
      await repo.saveProject(p);
      if (!timer) set({ save: 'saved', saveError: undefined });
    } catch (e) {
      set({ save: 'error', saveError: errorText(e) });
    }
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    set({ save: 'saving' });
    timer = setTimeout(persistProject, 400);
  };
  const savePhotos = async (photos: Photo[]) => {
    try {
      await repo.savePhotos(photos);
    } catch (e) {
      set({ save: 'error', saveError: errorText(e) });
    }
  };

  return {
    project: null,
    photos: [],
    status: 'idle',
    save: 'idle',
    imports: null,

    async load(id) {
      if (get().project?.id === id && get().status === 'ready') return;
      await get().flush();
      releasePhotoUrls();
      set({ status: 'loading', project: null, photos: [], imports: null, save: 'idle' });
      const [project, photos] = await Promise.all([repo.getProject(id), repo.listPhotos(id)]);
      if (!project) return set({ status: 'missing' });
      set({ project, photos, status: 'ready', save: 'saved' });
    },

    close() {
      void get().flush();
      releasePhotoUrls();
      set({ project: null, photos: [], status: 'idle', imports: null });
    },

    updateProject(fn) {
      const p = get().project;
      if (!p) return;
      set({ project: { ...fn(p), updatedAt: Date.now() } });
      schedule();
    },

    setAlbum(album) {
      get().updateProject((p) => ({ ...p, album }));
    },

    updatePhotos(fn) {
      const before = get().photos;
      const after = fn(before);
      const prev = new Map(before.map((p) => [p.id, p]));
      const changed = after.filter((p) => prev.get(p.id) !== p);
      set({ photos: after });
      if (changed.length) void savePhotos(changed);
      get().updateProject((p) => p); // bump updatedAt so the library sorts it first
    },

    async addFiles(files, extra = {}) {
      const project = get().project;
      if (!project) return;
      const images = files.filter(isProbablyImage);
      const rejected = files.filter((f) => !isProbablyImage(f)).map((f) => ({ name: f.name, reason: 'Not an image file' }));
      const prior = get().imports?.active ? get().imports! : { total: 0, done: 0, failed: [], active: true };
      set({ imports: { total: prior.total + images.length, done: prior.done, failed: [...prior.failed, ...rejected], active: true } });
      for (const file of images) {
        if (get().project?.id !== project.id) return; // project closed mid-import
        try {
          const out = await processImage(file);
          const id = createId('ph');
          await repo.putBlobs(id, { thumb: out.thumb, display: out.display, full: out.full });
          const photos = get().photos;
          const photo: Photo = {
            id,
            projectId: project.id,
            name: file.name,
            width: out.width,
            height: out.height,
            originalWidth: out.originalWidth,
            originalHeight: out.originalHeight,
            takenAt: out.takenAt,
            addedAt: Date.now(),
            order: insertionOrder(photos, out.takenAt),
            favourite: false,
            ...extra,
          };
          await repo.savePhotos([photo]);
          set((s) => ({ photos: [...s.photos, photo].sort((a, b) => a.order - b.order) }));
          set((s) => ({ imports: s.imports && { ...s.imports, done: s.imports.done + 1 } }));
        } catch (e) {
          set((s) => ({ imports: s.imports && { ...s.imports, failed: [...s.imports.failed, { name: file.name, reason: errorText(e) }] } }));
        }
      }
      set((s) => ({ imports: s.imports && { ...s.imports, active: false } }));
      get().updateProject((p) => p);
    },

    async removePhotos(ids) {
      const remove = new Set(ids);
      set((s) => ({ photos: s.photos.filter((p) => !remove.has(p.id)) }));
      get().updateProject((p) => ({
        ...p,
        coverPhotoId: p.coverPhotoId && remove.has(p.coverPhotoId) ? undefined : p.coverPhotoId,
        album: p.album && forgetPhotos(p.album, remove),
      }));
      await repo.deletePhotos(ids);
      releasePhotoUrls(ids);
    },

    async flush() {
      if (timer) {
        clearTimeout(timer);
        await persistProject();
      }
    },

    dismissImports() {
      set({ imports: null });
    },
  };
});

/**
 * New photos slot in by capture time among photos that have one; otherwise
 * they go to the end. Orders are fractional so nothing else is renumbered.
 */
export function insertionOrder(photos: Photo[], takenAt?: string): number {
  if (!photos.length) return 1;
  const last = photos[photos.length - 1].order;
  if (!takenAt) return last + 1;
  const next = photos.find((p) => p.takenAt && p.takenAt > takenAt);
  if (!next) return last + 1;
  const idx = photos.indexOf(next);
  const before = idx > 0 ? photos[idx - 1].order : next.order - 1;
  return (before + next.order) / 2;
}

function errorText(e: unknown): string {
  if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Your browser storage is full. Remove some photos or albums, then try again.';
  return e instanceof Error ? e.message : 'Something went wrong';
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (ev) => {
    const s = useProject.getState();
    if (timer || s.imports?.active) {
      void s.flush();
      ev.preventDefault();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void useProject.getState().flush();
  });
}
