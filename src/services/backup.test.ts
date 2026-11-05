import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { Photo, Project } from '@/domain/types';
import { readZip, writeZip, crc32 } from '@/storage/zip';

import { backupFilename, createBackup, restoreBackup } from './backup';
import { localRepository as repo } from './repository';

const project: Project = {
  id: 'orig', schemaVersion: 1, occasionId: 'birthday', plan: [], chapters: [], themeId: 'polaroid', step: 'album', createdAt: 1, updatedAt: 1, coverPhotoId: 'a',
  answers: { title: 'Maya’s 7th', groups: ['family'], participants: 4, names: [], children: true, mood: 'joyful', length: 'deluxe', mode: 'have-photos', extras: {} },
  album: { seed: 1, generatedAt: 0, pages: [{ id: 'pg1', layoutId: 'p2-stack', photos: [{ photoId: 'a' }, { photoId: 'b' }], text: {} }] },
};
const photo = (id: string): Photo => ({ id, projectId: 'orig', name: `${id}.jpg`, width: 400, height: 300, originalWidth: 400, originalHeight: 300, addedAt: 0, order: 1, favourite: id === 'a', caption: id === 'b' ? 'Cake!' : undefined });

describe('zip', () => {
  it('round-trips files, including non-ASCII names', async () => {
    const zip = await writeZip([{ name: 'a.txt', data: 'hello' }, { name: 'ünï/b.bin', data: new Blob([new Uint8Array([1, 2, 3, 250])]) }]);
    const back = await readZip(zip);
    expect(await back.get('a.txt')!.text()).toBe('hello');
    expect([...new Uint8Array(await back.get('ünï/b.bin')!.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });

  it('computes standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789')).toString(16)).toBe('cbf43926');
  });

  it('rejects files that aren’t backups', async () => {
    await expect(readZip(new Blob(['not a zip at all']))).rejects.toThrow(/isn’t a backup/);
  });
});

describe('album backup', () => {
  it('saves an album with its photos and restores it as an independent copy', async () => {
    await repo.saveProject(project);
    await repo.savePhotos([photo('a'), photo('b')]);
    await repo.putBlobs('a', { thumb: new Blob(['ta']), display: new Blob(['da']), full: new Blob(['fa']) });
    await repo.putBlobs('b', { full: new Blob(['fb']) });

    const { blob, name } = await createBackup('orig');
    expect(name).toBe('mayas-7th.inpictures.zip');

    const restored = await restoreBackup(blob);
    expect(restored.id).not.toBe('orig');
    expect(restored.answers.title).toBe('Maya’s 7th');
    const photos = await repo.listPhotos(restored.id);
    expect(photos).toHaveLength(2);
    const a = photos.find((p) => p.favourite)!;
    const b = photos.find((p) => p.caption === 'Cake!')!;
    expect(restored.coverPhotoId).toBe(a.id);
    expect(restored.album!.pages[0].photos.map((s) => s.photoId)).toEqual([a.id, b.id]);
    expect(await (await repo.getBlob(a.id, 'full'))!.text()).toBe('fa');
    expect(await (await repo.getBlob(b.id, 'full'))!.text()).toBe('fb');
    // The original is untouched.
    expect((await repo.listPhotos('orig')).map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('makes tidy file names', () => {
    expect(backupFilename('1–3 June 2026')).toBe('1-3-june-2026.inpictures.zip');
  });
});
