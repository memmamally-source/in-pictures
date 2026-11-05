import { useProject } from '@/state/project';

export function SaveIndicator() {
  const save = useProject((s) => s.save);
  const error = useProject((s) => s.saveError);
  const label = { idle: '', saving: 'Saving…', saved: 'Saved on this device', error: 'Not saved' }[save];
  if (!label) return null;
  return (
    <span className={`hidden items-center gap-1.5 text-xs sm:inline-flex ${save === 'error' ? 'text-[#9b2c2c]' : 'text-muted'}`} title={error} role="status" aria-live="polite">
      <span className={`h-1.5 w-1.5 rounded-full ${save === 'saving' ? 'animate-pulse bg-brand' : save === 'error' ? 'bg-[#9b2c2c]' : 'bg-sage-ink'}`} />
      {label}
    </span>
  );
}

/** Compact dot for small screens. */
export function SaveDot() {
  const save = useProject((s) => s.save);
  if (save === 'idle') return null;
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full sm:hidden ${save === 'saving' ? 'animate-pulse bg-brand' : save === 'error' ? 'bg-[#9b2c2c]' : 'bg-sage-ink'}`}
      role="status"
      aria-label={save === 'saving' ? 'Saving' : save === 'error' ? 'Not saved' : 'Saved'}
    />
  );
}
