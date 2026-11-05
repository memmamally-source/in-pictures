import { useEffect, useState } from 'react';

import { repo } from '@/services/repository';

import type { Variant } from './db';

/**
 * Object-URL cache for stored photos. URLs are shared between components and
 * revoked when a project is closed (`releasePhotoUrls`).
 */
const urls = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const listeners = new Set<() => void>();

export function photoUrl(photoId: string, variant: Variant): Promise<string | null> {
  const key = `${photoId}:${variant}`;
  const hit = urls.get(key);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(key);
  if (!p) {
    p = repo.getBlob(photoId, variant).then(async (b) => {
      // Fall back to a smaller/larger version if this one is missing.
      const blob = b ?? (variant !== 'display' ? await repo.getBlob(photoId, 'display') : await repo.getBlob(photoId, 'thumb'));
      pending.delete(key);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urls.set(key, url);
      return url;
    });
    pending.set(key, p);
  }
  return p;
}

export function peekPhotoUrl(photoId: string, variant: Variant): string | undefined {
  return urls.get(`${photoId}:${variant}`);
}

export function usePhotoUrl(photoId: string | null | undefined, variant: Variant): string | undefined {
  const [, force] = useState(0);
  const ready = photoId ? peekPhotoUrl(photoId, variant) : undefined;
  useEffect(() => {
    if (!photoId || ready) return;
    let live = true;
    photoUrl(photoId, variant).then(() => live && force((n) => n + 1));
    return () => {
      live = false;
    };
  }, [photoId, variant, ready]);
  return ready;
}

export function releasePhotoUrls(photoIds?: Iterable<string>) {
  const keys = photoIds ? [...photoIds].flatMap((id) => ['thumb', 'display', 'full'].map((v) => `${id}:${v}`)) : [...urls.keys()];
  for (const k of keys) {
    const u = urls.get(k);
    if (u) URL.revokeObjectURL(u);
    urls.delete(k);
  }
  listeners.forEach((l) => l());
}
