import { describe, expect, it } from 'vitest';

import type { Album, Photo } from '@/domain/types';

import { pdfFilename } from './pdf';
import { checkAlbum } from './quality';

const photo = (id: string, w: number, h: number): Photo => ({ id, projectId: 'p', name: `${id}.jpg`, width: w, height: h, originalWidth: w, originalHeight: h, addedAt: 0, order: 0, favourite: false });

describe('export checks', () => {
  const album: Album = {
    seed: 1, generatedAt: 0,
    pages: [
      { id: '1', layoutId: 'p1-bleed', photos: [{ photoId: 'small' }], text: {} },
      { id: '2', layoutId: 'p2-stack', photos: [{ photoId: 'big' }, { photoId: null }], text: {} },
    ],
  };
  const photos = [photo('small', 800, 1000), photo('big', 4000, 3000)];

  it('flags low-resolution photos for print and empty frames', () => {
    const high = checkAlbum(album, photos, 'minimal', 'high');
    expect(high.issues).toEqual([expect.objectContaining({ photoId: 'small', page: 0, level: 'low', ppi: 100 })]);
    expect(high.emptyFrames).toEqual([{ page: 1, slot: 1 }]);
  });

  it('is more forgiving for screen exports', () => {
    expect(checkAlbum(album, photos, 'minimal', 'standard').issues).toEqual([]);
  });

  it('makes safe file names', () => {
    expect(pdfFilename('Honeymoon in Santorini, Greece')).toBe('honeymoon-in-santorini-greece.pdf');
    expect(pdfFilename('Café “Ü” 🎉')).toBe('cafe-u.pdf');
    expect(pdfFilename('***')).toBe('album.pdf');
  });
});
