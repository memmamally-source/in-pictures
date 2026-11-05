import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { Photo, Project } from '@/domain/types';
import { insertionOrder } from '@/state/project';

import { localRepository as repo } from './repository';

const project = (id: string): Project => ({
  id, schemaVersion: 1, occasionId: 'birthday', plan: [], chapters: [], themeId: 'polaroid', step: 'photos', createdAt: 1, updatedAt: 1,
  answers: { title: 'Maya turns 7', group: 'family', participants: 4, names: [], children: true, mood: 'joyful', length: 'standard', mode: 'have-photos', extras: {} },
});
const photo = (id: string, projectId: string, order: number, takenAt?: string): Photo => ({
  id, projectId, name: `${id}.jpg`, width: 400, height: 300, originalWidth: 400, originalHeight: 300, addedAt: 0, order, favourite: false, takenAt,
});

describe('local repository (IndexedDB)', () => {
  it('saves, lists, duplicates and deletes projects with their photos and blobs', async () => {
    const p = { ...project('a1'), coverPhotoId: 'x1', album: { seed: 1, generatedAt: 0, pages: [{ id: 'pg', layoutId: 'cover-framed', photos: [{ photoId: 'x1' }], text: { title: 'Maya turns 7' } }] } };
    await repo.saveProject(p);
    await repo.savePhotos([photo('x1', 'a1', 1), photo('x2', 'a1', 2)]);
    await repo.putBlobs('x1', { thumb: new Blob(['t']), display: new Blob(['d']), full: new Blob(['f']) });
    expect((await repo.listProjects()).map((x) => x.id)).toEqual(['a1']);
    expect((await repo.listPhotos('a1')).map((x) => x.id)).toEqual(['x1', 'x2']);

    const copy = await repo.duplicateProject('a1', 'a2', 'Copy');
    expect(copy?.answers.title).toBe('Copy');
    expect(copy?.album?.pages[0].text.title).toBe('Copy');
    const copied = await repo.listPhotos('a2');
    expect(copied).toHaveLength(2);
    expect(copy?.coverPhotoId).toBe(copied[0].id);
    expect(copy?.album?.pages[0].photos[0].photoId).toBe(copied[0].id);
    expect(await (await repo.getBlob(copied[0].id, 'full'))?.text()).toBe('f');

    await repo.deleteProject('a1');
    expect(await repo.getProject('a1')).toBeUndefined();
    expect(await repo.listPhotos('a1')).toEqual([]);
    expect(await repo.getBlob('x1', 'thumb')).toBeUndefined();
    expect(await repo.getProject('a2')).toBeDefined(); // the copy is independent
  });

  it('deletes individual photos and their files', async () => {
    await repo.savePhotos([photo('y1', 'b', 1)]);
    await repo.putBlobs('y1', { thumb: new Blob(['t']) });
    await repo.deletePhotos(['y1']);
    expect(await repo.listPhotos('b')).toEqual([]);
    expect(await repo.getBlob('y1', 'thumb')).toBeUndefined();
  });
});

describe('photo ordering on import', () => {
  it('slots dated photos in by capture time and appends the rest', () => {
    const list = [photo('a', 'p', 1, '2026-06-01T10:00:00'), photo('b', 'p', 2, '2026-06-03T10:00:00')];
    expect(insertionOrder(list, '2026-06-02T09:00:00')).toBe(1.5);
    expect(insertionOrder(list, '2026-06-04T09:00:00')).toBe(3);
    expect(insertionOrder(list)).toBe(3);
    expect(insertionOrder([], '2026-01-01T00:00:00')).toBe(1);
  });
});
