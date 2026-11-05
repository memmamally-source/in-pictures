import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/Icon';
import { ImportStatus } from '@/components/ImportStatus';
import { PhotoInput } from '@/components/PhotoInput';
import { Thumb } from '@/components/Thumb';
import { Button, ButtonLink, Chip, Field, ProgressBar, Sheet, inputClass } from '@/components/ui';
import type { PlanItem, ShotCategory } from '@/domain/types';
import { createId } from '@/lib/id';
import { useProject } from '@/state/project';
import { getOccasion } from '@/templates/occasions';
import { itemComplete, planProgress, tripDays } from '@/templates/planner';

export const CATEGORY_LABELS: Record<ShotCategory, string> = {
  places: 'Destinations & places',
  people: 'People',
  food: 'Food & drink',
  details: 'Details',
  moments: 'Memories & moments',
};
const ORDER: ShotCategory[] = ['places', 'people', 'moments', 'food', 'details'];
const CATEGORY_DOT: Record<ShotCategory, string> = { places: 'bg-[#2ec4b6]', people: 'bg-[#ff5a6e]', moments: 'bg-pop', food: 'bg-[#ffa21f]', details: 'bg-[#3d8bff]' };

export function PlanScreen() {
  const project = useProject((s) => s.project)!;
  const photos = useProject((s) => s.photos);
  const updateProject = useProject((s) => s.updateProject);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const occasion = getOccasion(project.occasionId);

  const attached = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const p of photos) if (p.planItemId) (m[p.planItemId] ??= []).push(p.id);
    return m;
  }, [photos]);
  const counts = Object.fromEntries(Object.entries(attached).map(([k, v]) => [k, v.length]));
  const progress = planProgress(project.plan, counts);
  const setItem = (id: string, patch: Partial<PlanItem>) => updateProject((p) => ({ ...p, plan: p.plan.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const days = tripDays(project.answers);
  const skipped = project.plan.filter((i) => i.skipped);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 sm:px-6">
      <section className="mt-5 rounded-3xl bg-gradient-to-br from-[#ffe0cc] via-[#ffd3e4] to-[#e1d6ff] p-5 sm:p-6">
        <p className="text-sm text-muted">
          {occasion.icon} {occasion.name}
          {project.answers.location ? ` · ${project.answers.location}` : ''}
          {days > 1 ? ` · ${days} days` : ''}
        </p>
        <h1 className="mt-1 font-display text-3xl">Your photo plan</h1>
        <p className="mt-1 max-w-lg text-sm text-muted">
          Ideas for the photos you’ll be glad you took. They’re suggestions, not rules — skip, change or add your own, and make the album whenever you like.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={progress.total ? progress.complete / progress.total : 0} className="flex-1" />
          <span className="shrink-0 text-sm text-muted">
            {progress.complete} of {progress.total} ideas
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/album/${project.id}/details`} className="text-sm text-brand hover:underline">
            Change details
          </Link>
        </div>
      </section>

      <div className="mt-4">
        <ImportStatus />
      </div>

      {ORDER.map((cat) => {
        const items = project.plan.filter((i) => i.category === cat && !i.skipped);
        if (!items.length) return null;
        return (
          <section key={cat} className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <span className={`h-3 w-3 rounded-full ${CATEGORY_DOT[cat]}`} aria-hidden="true" />
              {CATEGORY_LABELS[cat]}
            </h2>
            <ul className="mt-3 space-y-2">
              {items.map((item) => (
                <PlanRow key={item.id} item={item} photoIds={attached[item.id] ?? []} onToggle={() => setItem(item.id, { done: !item.done })} onEdit={() => setEditing(item)} onSkip={() => setItem(item.id, { skipped: true })} />
              ))}
            </ul>
          </section>
        );
      })}

      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon="plus"
          onClick={() => setEditing({ id: createId('custom'), title: '', category: 'moments', chapter: project.chapters[1]?.id ?? project.chapters[0].id, target: 1, custom: true })}
        >
          Add my own photo idea
        </Button>
        {skipped.length > 0 && (
          <Button variant="ghost" onClick={() => setShowSkipped((v) => !v)}>
            {showSkipped ? 'Hide' : 'Show'} skipped ({skipped.length})
          </Button>
        )}
      </div>
      {showSkipped && (
        <ul className="mt-3 space-y-2">
          {skipped.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 px-4 py-3 text-muted ring-1 ring-line">
              <span className="line-through">{i.title}</span>
              <Button size="sm" variant="ghost" onClick={() => setItem(i.id, { skipped: false })}>
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <span className="text-sm text-muted">{photos.length} photos so far</span>
          <ButtonLink to={`/album/${project.id}/photos`} size="lg">
            {photos.length ? 'Organise photos' : 'Add photos'}
          </ButtonLink>
        </div>
      </div>

      {editing && <EditItem item={editing} isNew={!project.plan.some((i) => i.id === editing.id)} onClose={() => setEditing(null)} chapters={project.chapters} />}
    </main>
  );
}

function PlanRow({ item, photoIds, onToggle, onEdit, onSkip }: { item: PlanItem; photoIds: string[]; onToggle: () => void; onEdit: () => void; onSkip: () => void }) {
  const complete = itemComplete(item, photoIds.length);
  return (
    <li className={`rounded-2xl bg-white p-3 ring-1 transition sm:p-4 ${complete ? 'bg-sage/40 ring-sage-ink/30' : 'ring-line'}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          role="checkbox"
          aria-checked={complete}
          aria-label={`Mark “${item.title}” as ${complete ? 'not done' : 'done'}`}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 transition ${complete ? 'bg-[#16a36a] text-white ring-[#16a36a]' : 'bg-white ring-line hover:bg-pop-soft'}`}
        >
          {complete && <Icon name="check" size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug ${complete ? 'text-muted' : ''}`}>{item.title}</p>
          {item.hint && <p className="mt-0.5 text-xs leading-snug text-muted">{item.hint}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cream px-2 py-0.5 text-xs text-muted">
              {photoIds.length}/{item.target} photo{item.target === 1 ? '' : 's'}
            </span>
            {photoIds.slice(0, 5).map((id) => (
              <Thumb key={id} photo={{ id }} className="h-9 w-9 rounded-lg" />
            ))}
            {photoIds.length > 5 && <span className="text-xs text-muted">+{photoIds.length - 5}</span>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          <PhotoInput extra={{ planItemId: item.id, chapter: item.chapter }} size="sm" variant="secondary" icon="plus" aria-label={`Attach photos to “${item.title}”`}>
            <span className="hidden sm:inline">Photo</span>
          </PhotoInput>
          <div className="flex">
            <button type="button" onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-cream" aria-label={`Edit “${item.title}”`}>
              <Icon name="edit" size={18} />
            </button>
            <button type="button" onClick={onSkip} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-cream" aria-label={`Skip “${item.title}”`}>
              <Icon name="skip" size={18} />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function EditItem({ item, isNew, onClose, chapters }: { item: PlanItem; isNew: boolean; onClose: () => void; chapters: { id: string; title: string }[] }) {
  const updateProject = useProject((s) => s.updateProject);
  const [draft, setDraft] = useState(item);
  const save = () => {
    const clean = { ...draft, title: draft.title.trim() };
    if (!clean.title) return;
    updateProject((p) => ({ ...p, plan: isNew ? [...p.plan, clean] : p.plan.map((i) => (i.id === item.id ? clean : i)) }));
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? 'New photo idea' : 'Edit photo idea'}
      footer={
        <div className="flex justify-between gap-2">
          {!isNew && item.custom ? (
            <Button variant="danger" onClick={() => (updateProject((p) => ({ ...p, plan: p.plan.filter((i) => i.id !== item.id) })), onClose())}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!draft.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 pb-2">
        <Field label="What to photograph" htmlFor="it-title">
          <input id="it-title" className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus placeholder="e.g. Our hotel’s resident cat" maxLength={120} />
        </Field>
        <Field label="Notes (optional)" htmlFor="it-hint">
          <input id="it-hint" className={inputClass} value={draft.hint ?? ''} onChange={(e) => setDraft({ ...draft, hint: e.target.value || undefined })} maxLength={160} />
        </Field>
        <Field label="How many photos?">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="secondary" onClick={() => setDraft({ ...draft, target: Math.max(1, draft.target - 1) })} aria-label="Fewer">
              −
            </Button>
            <span className="w-8 text-center text-lg tabular-nums">{draft.target}</span>
            <Button size="sm" variant="secondary" onClick={() => setDraft({ ...draft, target: Math.min(50, draft.target + 1) })} aria-label="More">
              +
            </Button>
          </div>
        </Field>
        <Field label="Group">
          <div className="flex flex-wrap gap-2">
            {ORDER.map((c) => (
              <Chip key={c} selected={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>
                {CATEGORY_LABELS[c]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Album chapter">
          <div className="flex flex-wrap gap-2">
            {chapters.map((c) => (
              <Chip key={c.id} selected={draft.chapter === c.id} onClick={() => setDraft({ ...draft, chapter: c.id })}>
                {c.title}
              </Chip>
            ))}
          </div>
        </Field>
      </div>
    </Sheet>
  );
}
