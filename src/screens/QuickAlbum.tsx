import { useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui';
import type { Answers } from '@/domain/types';
import { useLibrary } from '@/state/library';
import { setPendingFiles } from '@/state/pendingFiles';
import { ACCEPTED, isProbablyImage } from '@/storage/images';
import { QUICK_TITLE, sizeForCount } from '@/templates/quick';

/** "Just add photos": pick any number of photos and get a designed album, no questions. */
export function QuickAlbum() {
  const navigate = useNavigate();
  const create = useLibrary((s) => s.create);
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function start(files: File[]) {
    const images = files.filter(isProbablyImage);
    if (!images.length || busy) return;
    setBusy(true);
    const answers: Answers = {
      title: QUICK_TITLE, groups: ['family'], participants: 4, names: [], children: false, mood: 'joyful',
      length: sizeForCount(images.length), mode: 'have-photos', extras: {},
    };
    const project = await create('custom', answers, { quick: true });
    setPendingFiles(project.id, images);
    navigate(`/album/${project.id}/album`, { replace: true });
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void start([...e.dataTransfer.files]);
  };

  return (
    <div className="min-h-dvh">
      <AppHeader back="/" title="Quick album" />
      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
        <h1 className="mt-6 font-display text-3xl sm:text-4xl">Just add photos</h1>
        <p className="mt-2 text-muted">
          Pick as many as you like. We’ll put them in date order, design every page and give it a title from the dates. You can change anything afterwards.
        </p>
        <input
          ref={input}
          type="file"
          multiple
          accept={`${ACCEPTED},image/*`}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            void start(files);
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          disabled={busy}
          className={`mt-6 flex w-full flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed px-6 py-16 text-center transition ${
            dragging ? 'border-pop bg-pop-soft' : 'border-line bg-gradient-to-br from-[#fff0e3] via-[#ffe6ee] to-[#ece5ff] hover:border-pop'
          }`}
        >
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-pop shadow-soft">
            <Icon name="image" size={30} />
          </span>
          <span className="font-display text-2xl">{busy ? 'Opening your album…' : 'Choose photos'}</span>
          <span className="text-sm text-muted">or drop them here · JPG, PNG, WebP, HEIC where supported</span>
        </button>
        <p className="mt-4 text-center text-xs text-muted">Photos stay on this device. Large batches take a little while to prepare — keep the page open until it’s done.</p>
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => navigate('/new')}>
            Prefer a photo plan and more options? Choose an occasion
          </Button>
        </div>
      </main>
    </div>
  );
}
