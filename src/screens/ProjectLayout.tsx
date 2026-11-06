import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { SaveDot, SaveIndicator } from '@/components/SaveIndicator';
import { StepNav } from '@/components/StepNav';
import { Button, ButtonLink, Confirm, IconButton, Notice, Sheet } from '@/components/ui';
import { downloadBlob } from '@/export/pdf';
import { createBackup } from '@/services/backup';
import { useLibrary } from '@/state/library';
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
            {!details && <AlbumMenu />}
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

/** The album's own menu (header ⋯): details, duplicate, backup and delete. */
function AlbumMenu() {
  const project = useProject((s) => s.project)!;
  const flush = useProject((s) => s.flush);
  const close = useProject((s) => s.close);
  const { duplicate, remove } = useLibrary();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [backingUp, setBackingUp] = useState<number | null>(null);

  const saveBackup = async () => {
    setBackingUp(0);
    try {
      await flush();
      const { blob, name } = await createBackup(project.id, (done, total) => setBackingUp(Math.round((done / total) * 100)));
      downloadBlob(blob, name);
    } finally {
      setBackingUp(null);
    }
  };

  return (
    <>
      <IconButton icon="more" label="Album options" onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={project.answers.title}>
        <div className="grid gap-2 pb-2">
          <Button variant="secondary" icon="edit" onClick={() => (setOpen(false), navigate(`/album/${project.id}/details`))}>
            Edit album details
          </Button>
          <Button
            variant="secondary"
            icon="copy"
            onClick={async () => {
              setOpen(false);
              await flush();
              const copy = await duplicate(project.id);
              if (copy) navigate(`/album/${copy.id}/album`);
            }}
          >
            Duplicate
          </Button>
          <Button variant="secondary" icon="download" disabled={backingUp !== null} onClick={saveBackup}>
            {backingUp !== null ? `Saving backup… ${backingUp}%` : 'Save a backup file'}
          </Button>
          <Button variant="danger" icon="trash" onClick={() => (setOpen(false), setDeleting(true))}>
            Delete album
          </Button>
        </div>
      </Sheet>
      <Confirm
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this album?"
        body={<>“{project.answers.title}” and its photos will be removed from this device. This can’t be undone, and there’s no cloud copy.</>}
        confirmLabel="Delete album"
        danger
        onConfirm={async () => {
          const id = project.id;
          await flush();
          close();
          await remove(id);
          navigate('/', { replace: true });
        }}
      />
    </>
  );
}
