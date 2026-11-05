import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import type { Photo, Project } from '@/domain/types';

/**
 * Local-first storage in IndexedDB. Three stores:
 *   projects – album metadata, checklist and generated pages (small JSON)
 *   photos   – per-photo metadata, indexed by project
 *   blobs    – image data keyed "<photoId>:<variant>"
 * Nothing leaves the device.
 */

export type Variant = 'thumb' | 'display' | 'full';

interface AlbumsDB extends DBSchema {
  projects: { key: string; value: Project };
  photos: { key: string; value: Photo; indexes: { byProject: string } };
  blobs: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<AlbumsDB>> | null = null;

export function db(): Promise<IDBPDatabase<AlbumsDB>> {
  dbPromise ??= openDB<AlbumsDB>('in-pictures', 1, {
    upgrade(d) {
      d.createObjectStore('projects', { keyPath: 'id' });
      d.createObjectStore('photos', { keyPath: 'id' }).createIndex('byProject', 'projectId');
      d.createObjectStore('blobs');
    },
    blocked() {
      console.warn('In Pictures storage is open in another tab with an older version.');
    },
  });
  return dbPromise;
}

export const blobKey = (photoId: string, v: Variant) => `${photoId}:${v}`;
