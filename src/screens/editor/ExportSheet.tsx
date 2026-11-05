import { useMemo, useRef, useState } from 'react';

import { Button, Chip, Notice, ProgressBar, Sheet, Toggle } from '@/components/ui';
import type { Album, Photo, ThemeId } from '@/domain/types';
import { downloadBlob, exportPdf, pdfFilename } from '@/export/pdf';
import { QUALITY, TYPICAL_MIN_PAGES, checkAlbum, printPlan, type Quality } from '@/export/quality';
import { createBackup } from '@/services/backup';
import { formatBytes } from '@/storage/quota';

export function ExportSheet({ open, onClose, album, photos, themeId, title, onGoToPage, projectId }: {
  open: boolean;
  onClose: () => void;
  album: Album;
  photos: Photo[];
  themeId: ThemeId;
  title: string;
  onGoToPage: (index: number) => void;
  projectId: string;
}) {
  const [backup, setBackup] = useState<number | null>(null);
  const [quality, setQuality] = useState<Quality>('standard');
  const [includeCover, setIncludeCover] = useState(true);
  const plan = printPlan(album, includeCover);
  const pageCount = quality === 'print' ? plan.pages.length : album.pages.length;
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const check = useMemo(() => checkAlbum(album, photos, themeId, quality), [album, photos, themeId, quality]);
  const low = check.issues.filter((i) => i.level === 'low');
  const busy = !!progress && !result;

  async function run() {
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: pageCount });
    abort.current = new AbortController();
    try {
      const blob = await exportPdf({ album, photos, themeId, title, quality, includeCover, signal: abort.current.signal, onProgress: (done, total) => setProgress({ done, total }) });
      const name = pdfFilename(title, quality);
      setResult({ blob, name });
      downloadBlob(blob, name);
    } catch (e) {
      setProgress(null);
      if ((e as DOMException).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  const close = () => {
    abort.current?.abort();
    setProgress(null);
    setResult(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Export PDF"
      footer={
        <div className="flex justify-end gap-2">
          {busy ? (
            <Button variant="ghost" onClick={() => abort.current?.abort()}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={close}>
              Close
            </Button>
          )}
          {result ? (
            <Button icon="download" onClick={() => downloadBlob(result.blob, result.name)}>
              Save again
            </Button>
          ) : (
            <Button icon="download" onClick={run} disabled={busy}>
              {busy ? 'Exporting…' : `Export ${pageCount} pages`}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5 pb-3">
        <div>
          <p className="mb-2 text-sm font-medium">Quality</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(QUALITY) as Quality[]).map((q) => (
              <Chip key={q} selected={quality === q} onClick={() => !busy && setQuality(q)}>
                {QUALITY[q].label}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {QUALITY[quality].help}
            {quality !== 'print' && ` Pages are 8 × 10 in (portrait), ${QUALITY[quality].dpi} dpi.`}
          </p>
        </div>

        {quality === 'print' && (
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
            <p className="text-sm font-medium">Ready for a print shop</p>
            <ul className="space-y-1 text-sm text-muted">
              <li>✓ 8 × 10 in pages with 1/8 in bleed (files are 8.25 × 10.25 in)</li>
              <li>✓ 300 dpi, edge-to-edge photos and paper run into the bleed</li>
              <li>✓ Text and important details kept well inside the trim</li>
              <li>
                ✓ {plan.pages.length} pages{plan.blankAdded ? ', including one blank page added at the end (books need an even number)' : ''}
              </li>
            </ul>
            <Toggle
              checked={includeCover}
              onChange={setIncludeCover}
              label="Include the cover as the first page"
              help="Turn off if your printer makes hardcovers from its own cover template."
            />
            {plan.belowTypicalMinimum && (
              <Notice tone="warn">
                Many photo-book printers need at least {TYPICAL_MIN_PAGES} pages. Add pages, add photos, or choose a bigger album size before ordering.
              </Notice>
            )}
          </div>
        )}

        {check.emptyFrames.length > 0 && (
          <Notice tone="warn">
            {check.emptyFrames.length} empty photo frame{check.emptyFrames.length === 1 ? '' : 's'} will appear blank (first on page {check.emptyFrames[0].page + 1}).{' '}
            <button type="button" className="underline" onClick={() => (close(), onGoToPage(check.emptyFrames[0].page))}>
              Go to page
            </button>
          </Notice>
        )}

        {check.issues.length > 0 ? (
          <Notice tone={low.length ? 'warn' : 'info'}>
            <p>
              {check.issues.length} photo{check.issues.length === 1 ? ' is' : 's are'} lower resolution than ideal for {quality === 'high' ? 'printing' : 'this size'} and may look soft:
            </p>
            <ul className="mt-1 space-y-0.5">
              {check.issues.slice(0, 6).map((i) => (
                <li key={`${i.page}-${i.slot}`}>
                  <button type="button" className="underline" onClick={() => (close(), onGoToPage(i.page))}>
                    Page {i.page + 1}
                  </button>{' '}
                  · {i.photoName} · about {i.ppi} ppi {i.level === 'low' ? '(low)' : ''}
                </li>
              ))}
              {check.issues.length > 6 && <li>…and {check.issues.length - 6} more</li>}
            </ul>
            <p className="mt-1">Tip: use these photos in smaller frames, or zoom out.</p>
          </Notice>
        ) : (
          <p className="text-sm text-sage-ink">Every photo has enough resolution for {quality === 'high' ? '300 dpi pages' : 'this export'}.</p>
        )}

        <p className="text-xs leading-relaxed text-muted">
          The PDF is made on this device — nothing is uploaded. Each page is saved as a high-resolution image, so it matches the preview exactly (text isn’t selectable).{' '}
          {quality === 'print'
            ? 'Before ordering, check your printer’s spec: the book size (this is 8 × 10 in portrait), minimum pages, and how they want the cover. Colours are sRGB; printers convert them to their inks, so colours can shift slightly.'
            : 'Fine for screens and home printing. To order a printed book, choose Print-ready.'}
        </p>

        {progress && (
          <div>
            <ProgressBar value={progress.done / progress.total} />
            <p className="mt-1.5 text-xs text-muted" role="status" aria-live="polite">
              {result ? `Done — ${formatBytes(result.blob.size)}. Check your downloads (on iPhone, use Share → Save to Files).` : `Drawing page ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`}
            </p>
          </div>
        )}
        {error && <Notice tone="error">{error}. If your device is low on memory, try Standard quality.</Notice>}

        <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
          <p className="text-xs text-muted">A PDF is for viewing and printing. To keep the editable album safe, save a backup file (album + every photo).</p>
          <Button
            size="sm"
            variant="secondary"
            icon="download"
            disabled={backup !== null}
            onClick={async () => {
              setBackup(0);
              try {
                const { blob, name } = await createBackup(projectId, (d, t) => setBackup(Math.round((d / t) * 100)));
                downloadBlob(blob, name);
              } finally {
                setBackup(null);
              }
            }}
          >
            {backup !== null ? `${backup}%` : 'Backup'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
