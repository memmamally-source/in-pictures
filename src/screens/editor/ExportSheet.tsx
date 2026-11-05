import { useMemo, useRef, useState } from 'react';

import { Button, Chip, Notice, ProgressBar, Sheet } from '@/components/ui';
import type { Album, Photo, ThemeId } from '@/domain/types';
import { downloadBlob, exportPdf, pdfFilename } from '@/export/pdf';
import { QUALITY, checkAlbum, type Quality } from '@/export/quality';
import { formatBytes } from '@/storage/quota';

export function ExportSheet({ open, onClose, album, photos, themeId, title, onGoToPage }: {
  open: boolean;
  onClose: () => void;
  album: Album;
  photos: Photo[];
  themeId: ThemeId;
  title: string;
  onGoToPage: (index: number) => void;
}) {
  const [quality, setQuality] = useState<Quality>('standard');
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
    setProgress({ done: 0, total: album.pages.length });
    abort.current = new AbortController();
    try {
      const blob = await exportPdf({ album, photos, themeId, title, quality, signal: abort.current.signal, onProgress: (done, total) => setProgress({ done, total }) });
      const name = pdfFilename(title);
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
              {busy ? 'Exporting…' : `Export ${album.pages.length} pages`}
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
            {QUALITY[quality].help} Pages are 8 × 10 in (portrait), {QUALITY[quality].dpi} dpi.
          </p>
        </div>

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
          The PDF is made on this device — nothing is uploaded. Each page is saved as a high-resolution image, so it matches the preview exactly (text isn’t selectable). It’s
          suitable for screens and home printing. It is not set up for professional print shops: there’s no bleed or colour profile, and print services have their own
          size and margin rules.
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
      </div>
    </Sheet>
  );
}
