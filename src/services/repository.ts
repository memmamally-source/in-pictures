import type { Photo, Project } from '@/domain/types';
import { blobKey, db, type Variant } from '@/storage/db';

/**
 * Storage boundary. Screens and stores talk to `ProjectRepository`, never to
 * IndexedDB directly, so a cloud implementation can be added later without
 * touching the UI.
 *
 * FIREBASE INTEGRATION POINT (future, see docs/ARCHITECTURE.md):
 *   - `CloudRepository implements ProjectRepository` using Firestore for
 *     projects/photos metadata (users/{uid}/projects/{id}, .../photos/{id})
 *     and Cloud Storage for blobs (users/{uid}/photos/{photoId}/{variant}).
 *   - A `SyncingRepository` would wrap local + cloud: write locally first,
 *     queue uploads only after the user opts in to backup, and merge by
 *     `updatedAt`.
 * None of this exists yet: today everything stays on the device.
 */
export interface ProjectRepository {
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  saveProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  listPhotos(projectId: string): Promise<Photo[]>;
  savePhotos(photos: Photo[]): Promise<void>;
  deletePhotos(ids: string[]): Promise<void>;
  putBlobs(photoId: string, blobs: Partial<Record<Variant, Blob>>): Promise<void>;
  getBlob(photoId: string, variant: Variant): Promise<Blob | undefined>;
  duplicateProject(id: string, newId: string, title: string): Promise<Project | undefined>;
}

const VARIANTS: Variant[] = ['thumb', 'display', 'full'];

export const localRepository: ProjectRepository = {
  async listProjects() {
    const all = await (await db()).getAll('projects');
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  async getProject(id) {
    return (await db()).get('projects', id);
  },
  async saveProject(project) {
    await (await db()).put('projects', project);
  },
  async deleteProject(id) {
    const d = await db();
    const photos = await d.getAllFromIndex('photos', 'byProject', id);
    const tx = d.transaction(['projects', 'photos', 'blobs'], 'readwrite');
    await Promise.all([
      tx.objectStore('projects').delete(id),
      ...photos.map((p) => tx.objectStore('photos').delete(p.id)),
      ...photos.flatMap((p) => VARIANTS.map((v) => tx.objectStore('blobs').delete(blobKey(p.id, v)))),
      tx.done,
    ]);
  },
  async listPhotos(projectId) {
    const photos = await (await db()).getAllFromIndex('photos', 'byProject', projectId);
    return photos.sort((a, b) => a.order - b.order);
  },
  async savePhotos(photos) {
    if (!photos.length) return;
    const tx = (await db()).transaction('photos', 'readwrite');
    await Promise.all([...photos.map((p) => tx.store.put(p)), tx.done]);
  },
  async deletePhotos(ids) {
    const tx = (await db()).transaction(['photos', 'blobs'], 'readwrite');
    await Promise.all([
      ...ids.map((id) => tx.objectStore('photos').delete(id)),
      ...ids.flatMap((id) => VARIANTS.map((v) => tx.objectStore('blobs').delete(blobKey(id, v)))),
      tx.done,
    ]);
  },
  async putBlobs(photoId, blobs) {
    const tx = (await db()).transaction('blobs', 'readwrite');
    await Promise.all([...Object.entries(blobs).map(([v, b]) => tx.store.put(b!, blobKey(photoId, v as Variant))), tx.done]);
  },
  async getBlob(photoId, variant) {
    return (await db()).get('blobs', blobKey(photoId, variant));
  },
  async duplicateProject(id, newId, title) {
    const d = await db();
    const project = await d.get('projects', id);
    if (!project) return undefined;
    const photos = await d.getAllFromIndex('photos', 'byProject', id);
    const idMap = new Map(photos.map((p, i) => [p.id, `${newId}_p${i}`]));
    const mapId = (x: string | null | undefined) => (x ? idMap.get(x) ?? null : null);
    const now = Date.now();
    const copy: Project = {
      ...structuredClone(project),
      id: newId,
      answers: { ...project.answers, title },
      coverPhotoId: project.coverPhotoId ? idMap.get(project.coverPhotoId) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    if (copy.album) {
      copy.album.pages = copy.album.pages.map((pg) => ({
        ...pg,
        id: `${pg.id}_c`,
        photos: pg.photos.map((s) => ({ ...s, photoId: mapId(s.photoId) })),
        text: pg.text.title === project.answers.title ? { ...pg.text, title } : pg.text,
      }));
    }
    // Copy blobs one photo at a time to keep memory flat on phones.
    for (const p of photos) {
      const nid = idMap.get(p.id)!;
      for (const v of VARIANTS) {
        const b = await d.get('blobs', blobKey(p.id, v));
        if (b) await d.put('blobs', b, blobKey(nid, v));
      }
      await d.put('photos', { ...p, id: nid, projectId: newId });
    }
    await d.put('projects', copy);
    return copy;
  },
};

/** The active repository. Swap here when cloud backup exists. */
export const repo: ProjectRepository = localRepository;
