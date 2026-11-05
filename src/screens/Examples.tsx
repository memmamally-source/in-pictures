import { AppHeader } from '@/components/AppHeader';
import { Showcase } from '@/components/Showcase';
import { ButtonLink } from '@/components/ui';
import { Brand } from '@/config/brand';

/** A shareable page of examples: …/#/examples */
export function Examples() {
  return (
    <div className="min-h-dvh">
      <AppHeader back="/" title="Examples" />
      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Showcase />
        <div className="mt-8 text-center">
          <p className="font-display text-2xl">{Brand.shortTagline}</p>
          <ButtonLink to="/new" size="lg" icon="plus" className="mt-4">
            Create your own album
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
