import { describe, expect, it } from 'vitest';

import { usedPhotoIds } from '@/engine/edit';
import { getLayout } from '@/layouts/layouts';
import { THEMES } from '@/layouts/themes';

import { DEMO_PHOTOS, demoAlbum, demoSrc } from './demoAlbum';

describe('home-page example album', () => {
  it('lays out every example picture in every style, with a cover and a closing page', () => {
    for (const t of THEMES) {
      const a = demoAlbum(t.id);
      expect(getLayout(a.pages[0].layoutId).kind).toBe('cover');
      expect(getLayout(a.pages.at(-1)!.layoutId).kind).toBe('closing');
      expect(usedPhotoIds(a).size).toBe(DEMO_PHOTOS.length);
      expect(a.pages.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('serves a bundled photo for every example and nothing else', () => {
    for (const p of DEMO_PHOTOS) expect(demoSrc(p.id)).toMatch(/\.jpg/);
    expect(demoSrc('someone-elses-photo')).toBeUndefined();
  });
});
