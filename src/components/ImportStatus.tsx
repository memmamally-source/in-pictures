import { useProject } from '@/state/project';

import { Icon } from './Icon';
import { ProgressBar } from './ui';

export function ImportStatus() {
  const imports = useProject((s) => s.imports);
  const dismiss = useProject((s) => s.dismissImports);
  if (!imports) return null;
  const { total, done, failed, active } = imports;
  const finished = done + failed.filter((f) => f.reason !== 'Not an image file').length;
  return (
    <div className="animate-rise rounded-2xl bg-white p-4 shadow-soft ring-1 ring-line" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">
          {active ? `Adding photos… ${Math.min(finished + 1, total)} of ${total}` : `${done} photo${done === 1 ? '' : 's'} added`}
        </span>
        {!active && (
          <button type="button" className="text-muted hover:text-ink" onClick={dismiss} aria-label="Dismiss">
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
      {active && <ProgressBar className="mt-2" value={total ? finished / total : 0} />}
      {active && <p className="mt-2 text-xs text-muted">Photos are resized and saved on this device as they’re processed. Keep this tab open until it finishes.</p>}
      {failed.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-[#9b2c2c]">
          {failed.slice(0, 5).map((f, i) => (
            <li key={i}>
              {f.name}: {f.reason}
            </li>
          ))}
          {failed.length > 5 && <li>…and {failed.length - 5} more</li>}
        </ul>
      )}
    </div>
  );
}
