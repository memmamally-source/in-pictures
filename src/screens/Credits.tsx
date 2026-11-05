import { AppHeader } from '@/components/AppHeader';
import { DEMO_PHOTO_INFO } from '@/demo/photos';

/** Credits for the example album's photos (all CC0, from Wikimedia Commons). */
export function Credits() {
  return (
    <div className="min-h-dvh">
      <AppHeader back="/" title="Photo credits" />
      <main className="mx-auto max-w-2xl px-4 pb-16 text-[15px] leading-relaxed text-ink/90 sm:px-6">
        <h1 className="mt-6 font-display text-3xl">Photos in the example album</h1>
        <p className="mt-2 text-muted">
          The example album uses photos from Wikimedia Commons that their photographers released under CC0 (no rights reserved). They were resized for the web; the
          captions are part of the example, not the photographers’. Thank you to everyone below.
        </p>
        <ul className="mt-6 space-y-3">
          {DEMO_PHOTO_INFO.map((p) => (
            <li key={p.name} className="rounded-2xl bg-white p-3 ring-1 ring-line">
              <a href={p.page} target="_blank" rel="noreferrer" className="font-medium text-ink underline decoration-line underline-offset-2 hover:decoration-ink">
                {p.title}
              </a>
              <div className="text-sm text-muted">
                {p.author} · CC0 1.0 · Wikimedia Commons
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
