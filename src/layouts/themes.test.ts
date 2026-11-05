import { describe, expect, it } from 'vitest';

import { THEMES } from './themes';

const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('theme colours', () => {
  it('keep page text readable (WCAG AA 4.5:1) on pages, photo mats and chapter pages', () => {
    for (const t of THEMES) {
      const c = t.colors;
      const chapter = t.chapterInk ?? c;
      for (const [fg, bg, where] of [
        [c.ink, c.page, 'ink/page'], [c.muted, c.page, 'muted/page'], [c.ink, c.mat, 'ink/mat'],
        [chapter.ink, c.chapterPage, 'ink/chapter'], [chapter.muted, c.chapterPage, 'muted/chapter'],
      ]) expect(contrast(fg, bg), `${t.id} ${where}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives each style its own paper colour', () => {
    expect(new Set(THEMES.map((t) => t.colors.page)).size).toBe(THEMES.length);
  });
});
