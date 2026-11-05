import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { Icon } from '@/components/Icon';
import { TINTS, inputClass } from '@/components/ui';
import { OCCASIONS, searchOccasions } from '@/templates/occasions';

const FAMILIES = [
  { id: 'travel', label: 'Trips & travel' },
  { id: 'celebration', label: 'Celebrations' },
  { id: 'family', label: 'Family & milestones' },
  { id: 'everyday', label: 'Everyday & more' },
] as const;

export function ChooseOccasion() {
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const results = searchOccasions(q);
  const suffix = params.get('have') ? '?have=1' : '';

  return (
    <div className="min-h-dvh">
      <AppHeader back="/" title="New album" />
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <h1 className="mt-6 font-display text-3xl sm:text-4xl">What are we remembering?</h1>
        <p className="mt-2 text-muted">Each occasion comes with its own photo ideas, story structure and suggested styles.</p>
        <div className="relative mt-5">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            className={`${inputClass} pl-12`}
            placeholder="Search: honeymoon, birthday, dog, festival…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search occasions"
          />
        </div>

        {q ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((o) => (
              <OccasionCard key={o.id} o={o} suffix={suffix} />
            ))}
            {!results.length && (
              <p className="col-span-full rounded-2xl bg-cream p-5 text-sm text-muted">
                Nothing matches “{q}”. Try{' '}
                <Link className="text-brand underline" to={`/new/custom${suffix}`}>
                  a custom album
                </Link>{' '}
                — it works for anything.
              </p>
            )}
          </div>
        ) : (
          FAMILIES.map((f) => (
            <section key={f.id} className="mt-8">
              <h2 className="text-sm font-medium tracking-wide text-muted uppercase">{f.label}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {OCCASIONS.filter((o) => o.family === f.id).map((o) => (
                  <OccasionCard key={o.id} o={o} suffix={suffix} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function OccasionCard({ o, suffix }: { o: (typeof OCCASIONS)[number]; suffix: string }) {
  return (
    <Link to={`/new/${o.id}${suffix}`} className={`group flex min-h-36 flex-col justify-between rounded-3xl p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${TINTS[o.tint].bg}`}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-2xl shadow-soft transition group-hover:scale-110 group-hover:-rotate-6" aria-hidden="true">
        {o.icon}
      </span>
      <span>
        <span className={`block font-display text-lg leading-tight ${TINTS[o.tint].ink}`}>{o.name}</span>
        <span className="mt-1 block text-xs text-ink/70">{o.tagline}</span>
      </span>
    </Link>
  );
}
