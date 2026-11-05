import { useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { SaveDot, SaveIndicator } from '@/components/SaveIndicator';
import { StepNav } from '@/components/StepNav';
import { ButtonLink, Notice } from '@/components/ui';
import { useProject } from '@/state/project';

/** Loads the album from storage and frames its screens with the step navigation. */
export function ProjectLayout() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const status = useProject((s) => s.status);
  const project = useProject((s) => s.project);
  const load = useProject((s) => s.load);
  const save = useProject((s) => s.save);
  const saveError = useProject((s) => s.saveError);
  const updateProject = useProject((s) => s.updateProject);
  const step = pathname.split('/')[3];

  useEffect(() => {
    if (id) void load(id);
  }, [id, load]);

  // Remember where the user was, so the library can resume there.
  useEffect(() => {
    if (project && (step === 'plan' || step === 'photos' || step === 'style' || step === 'album') && project.step !== step) {
      updateProject((p) => ({ ...p, step }));
    }
  }, [project, step, updateProject]);

  if (status === 'missing') {
    return (
      <div className="min-h-dvh">
        <AppHeader back="/" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-display text-2xl">Album not found</h1>
          <p className="mt-2 text-sm text-muted">It may have been deleted, or it was made in a different browser or device — albums are stored only where they were created.</p>
          <ButtonLink to="/" className="mt-6">
            Go to my library
          </ButtonLink>
        </main>
      </div>
    );
  }
  if (!project || status !== 'ready' || project.id !== id) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" role="status">
        Opening your album…
      </div>
    );
  }
  const details = step === 'details';
  return (
    <div className="min-h-dvh">
      <AppHeader
        back={details ? true : '/'}
        title={details ? 'Album details' : project.answers.title}
        right={
          <>
            <SaveIndicator />
            <SaveDot />
          </>
        }
        sub={details ? undefined : <StepNav />}
      />
      {save === 'error' && (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
          <Notice tone="error">Changes couldn’t be saved: {saveError}</Notice>
        </div>
      )}
      <Outlet />
    </div>
  );
}
