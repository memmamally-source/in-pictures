import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/600.css';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/special-elite/400.css';

import { useSyncExternalStore } from 'react';

import { THEMES } from '@/layouts/themes';

import { cssFont, clearMeasureCache } from './text';

/**
 * Fonts are bundled with the app (no third-party font requests). Text
 * measurement must wait for them, so pages re-render once they're loaded.
 */
let version = 0;
const subs = new Set<() => void>();

export async function loadAlbumFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const specs = THEMES.flatMap((t) => Object.values(t.fonts));
  await Promise.allSettled(specs.map((s) => document.fonts.load(cssFont(s, 16), 'Aa')));
  await document.fonts.ready;
  clearMeasureCache();
  version++;
  subs.forEach((f) => f());
}

export function useFontsVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => version,
  );
}
