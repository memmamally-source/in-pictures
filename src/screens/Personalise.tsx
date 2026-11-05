import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AppHeader } from '@/components/AppHeader';
import { Button, Chip, Field, TINTS, Toggle, inputClass } from '@/components/ui';
import type { AlbumLength, Answers, GroupType, Mood } from '@/domain/types';
import { useLibrary } from '@/state/library';
import { useProject } from '@/state/project';
import { getOccasion } from '@/templates/occasions';
import type { OccasionDef } from '@/templates/schema';
import { buildPlan, defaultParticipants, GROUP_LABELS, mergePlan, suggestTitle } from '@/templates/planner';

const MOODS: { id: Mood; label: string }[] = [
  { id: 'joyful', label: 'Joyful' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'calm', label: 'Calm' },
  { id: 'adventurous', label: 'Adventurous' },
  { id: 'nostalgic', label: 'Nostalgic' },
  { id: 'elegant', label: 'Elegant' },
  { id: 'playful', label: 'Playful' },
];

const LENGTHS: { id: AlbumLength; label: string; help: string }[] = [
  { id: 'short', label: 'Short', help: 'Fewer pages, more photos on each. Core shots only.' },
  { id: 'standard', label: 'Standard', help: 'A balanced book.' },
  { id: 'long', label: 'Long', help: 'More single-photo pages and extra photo ideas.' },
];

function defaults(o: OccasionDef, have: boolean): Answers {
  const group = o.questions.groupDefault;
  const extras: Answers['extras'] = {};
  for (const e of o.questions.extras ?? []) if (e.type !== 'text') extras[e.id] = e.default;
  return {
    title: '',
    group,
    participants: defaultParticipants(group),
    names: [],
    children: false,
    mood: o.defaultMood,
    length: o.defaultLength ?? 'standard',
    mode: have ? 'have-photos' : 'plan',
    extras,
  };
}

/** Create a new album (route /new/:occasionId) or edit an album's details (/album/:id/details). */
export function Personalise({ edit }: { edit?: boolean }) {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const create = useLibrary((s) => s.create);
  const project = useProject((s) => s.project);
  const updateProject = useProject((s) => s.updateProject);
  const occasion = getOccasion(edit ? project?.occasionId ?? 'custom' : params.occasionId ?? 'custom');
  const q = occasion.questions;

  const [a, setA] = useState<Answers>(() => (edit && project ? project.answers : defaults(occasion, !!search.get('have'))));
  const [titleTouched, setTitleTouched] = useState(!!edit);
  const [namesText, setNamesText] = useState(a.names.join(', '));
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));
  const setExtra = (id: string, v: string | boolean) => setA((prev) => ({ ...prev, extras: { ...prev.extras, [id]: v } }));
  const suggested = suggestTitle(occasion, a);
  const title = titleTouched ? a.title : suggested;
  const groups: GroupType[] = q.groupOptions ?? ['solo', 'couple', 'family', 'friends', 'group'];
  const groupish = a.group !== 'solo' && a.group !== 'couple';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const answers: Answers = {
      ...a,
      title: title.trim() || occasion.fallbackTitle,
      names: namesText.split(/[,&\n]/).map((s) => s.trim()).filter(Boolean),
      endDate: q.dates === 'range' ? a.endDate : undefined,
      location: q.location === 'hidden' ? undefined : a.location?.trim() || undefined,
      honoree: a.honoree?.trim() || undefined,
    };
    if (edit && project) {
      updateProject((p) => ({ ...p, answers, plan: mergePlan(p.plan, buildPlan(occasion, answers)) }));
      navigate(-1);
      return;
    }
    const created = await create(occasion.id, answers);
    navigate(`/album/${created.id}/${created.step}`, { replace: true });
  }

  return (
    <div className="min-h-dvh">
      {!edit && <AppHeader back="/new" title={occasion.name} />}
      <main className="mx-auto max-w-2xl px-4 pb-32 sm:px-6">
        {!edit && (
          <div className={`mt-5 flex items-center gap-4 rounded-3xl p-5 ${TINTS[occasion.tint].bg}`}>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/80 text-4xl shadow-soft" aria-hidden="true">
              {occasion.icon}
            </span>
            <div>
              <h1 className={`font-display text-2xl ${TINTS[occasion.tint].ink}`}>Tell us a little about it</h1>
              <p className="text-sm text-ink/70">A few answers shape your photo ideas and the album. Everything is optional except the essentials.</p>
            </div>
          </div>
        )}
        {edit && <h1 className="mt-6 font-display text-2xl">Album details</h1>}

        <form onSubmit={submit} className="mt-6 space-y-6">
          {q.location !== 'hidden' && (
            <Field label={q.locationLabel ?? 'Location'} htmlFor="loc">
              <input id="loc" className={inputClass} placeholder={q.locationPlaceholder} value={a.location ?? ''} onChange={(e) => set({ location: e.target.value })} required={q.location === 'required'} autoComplete="off" />
            </Field>
          )}

          {q.honoree && (
            <Field label={q.honoree.label} htmlFor="hon" hint="Used in your photo ideas and titles — only what you type here.">
              <input id="hon" className={inputClass} placeholder={q.honoree.placeholder} value={a.honoree ?? ''} onChange={(e) => set({ honoree: e.target.value })} autoComplete="off" />
            </Field>
          )}

          {q.dates !== 'none' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={q.dates === 'range' ? 'Start date (optional)' : 'Date (optional)'} htmlFor="sd">
                <input id="sd" type="date" className={inputClass} value={a.startDate ?? ''} onChange={(e) => set({ startDate: e.target.value || undefined })} />
              </Field>
              {q.dates === 'range' && (
                <Field label="End date (optional)" htmlFor="ed">
                  <input id="ed" type="date" className={inputClass} min={a.startDate} value={a.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value || undefined })} />
                </Field>
              )}
              {q.dates === 'range' && !(a.startDate && a.endDate) && (
                <Field label="Or roughly how many days?" htmlFor="days">
                  <input id="days" type="number" min={1} max={60} inputMode="numeric" className={inputClass} value={a.days ?? ''} onChange={(e) => set({ days: e.target.value ? Number(e.target.value) : undefined })} />
                </Field>
              )}
            </div>
          )}

          {groups.length > 1 && (
            <Field label="Who’s in the photos?">
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <Chip key={g} selected={a.group === g} onClick={() => set({ group: g, participants: defaultParticipants(g), children: g === 'solo' || g === 'couple' ? false : a.children })}>
                    {GROUP_LABELS[g]}
                  </Chip>
                ))}
              </div>
            </Field>
          )}

          {groupish && (
            <Field label="How many people, roughly?" htmlFor="ppl">
              <input id="ppl" type="number" min={2} max={200} inputMode="numeric" className={`${inputClass} max-w-32`} value={a.participants} onChange={(e) => set({ participants: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
          )}

          {a.group !== 'solo' && (
            <Field label="Names (optional)" htmlFor="names" hint="Separate with commas. Shown on the closing page; never shared.">
              <input id="names" className={inputClass} placeholder={a.group === 'couple' ? 'e.g. Anna, Ben' : 'e.g. Mum, Dad, Leo, Ava'} value={namesText} onChange={(e) => setNamesText(e.target.value)} autoComplete="off" />
            </Field>
          )}

          {q.askChildren && groupish && <Toggle checked={a.children} onChange={(v) => set({ children: v })} label="Children are taking part" help="Adds kid-friendly photo ideas." />}

          {(q.extras ?? []).map((ex) =>
            ex.type === 'toggle' ? (
              <Toggle key={ex.id} checked={!!a.extras[ex.id]} onChange={(v) => setExtra(ex.id, v)} label={ex.label} help={ex.help} />
            ) : ex.type === 'choice' ? (
              <Field key={ex.id} label={ex.label}>
                <div className="flex flex-wrap gap-2">
                  {ex.options.map((o) => (
                    <Chip key={o.value} selected={a.extras[ex.id] === o.value} onClick={() => setExtra(ex.id, o.value)}>
                      {o.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            ) : (
              <Field key={ex.id} label={ex.label} htmlFor={`x-${ex.id}`}>
                <input id={`x-${ex.id}`} className={inputClass} placeholder={ex.placeholder} value={String(a.extras[ex.id] ?? '')} onChange={(e) => setExtra(ex.id, e.target.value)} autoComplete="off" />
              </Field>
            ),
          )}

          <Field label="Mood">
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Chip key={m.id} selected={a.mood === m.id} onClick={() => set({ mood: m.id })}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Album length" hint={LENGTHS.find((l) => l.id === a.length)?.help}>
            <div className="flex flex-wrap gap-2">
              {LENGTHS.map((l) => (
                <Chip key={l.id} selected={a.length === l.id} onClick={() => set({ length: l.id })}>
                  {l.label}
                </Chip>
              ))}
            </div>
          </Field>

          {!edit && (
            <Field label="Where are you starting?">
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['plan', 'Planning ahead', 'Get a photo checklist to shoot from.'],
                    ['have-photos', 'I already have photos', 'Go straight to adding photos.'],
                  ] as const
                ).map(([id, label, help]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => set({ mode: id })}
                    aria-pressed={a.mode === id}
                    className={`rounded-2xl p-4 text-left ring-1 transition ${a.mode === id ? 'bg-pop text-white ring-pop' : 'bg-white ring-line hover:bg-pop-soft'}`}
                  >
                    <span className="block font-medium">{label}</span>
                    <span className={`mt-0.5 block text-sm ${a.mode === id ? 'text-white/80' : 'text-muted'}`}>{help}</span>
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Album name" htmlFor="title" hint={titleTouched ? undefined : 'Suggested from your answers — change it to anything.'}>
            <input id="title" className={inputClass} value={title} maxLength={80} onChange={(e) => (setTitleTouched(true), set({ title: e.target.value }))} />
          </Field>

          <Field label="A line for the last page (optional)" htmlFor="note" hint="Your words, printed on the closing page. Leave blank for none.">
            <textarea id="note" rows={2} className={inputClass} maxLength={240} value={a.closingNote ?? ''} onChange={(e) => set({ closingNote: e.target.value })} />
          </Field>

          <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory/95 pt-3 backdrop-blur">
            <div className="mx-auto flex max-w-2xl justify-end gap-2 px-4 sm:px-6">
              {edit && (
                <Button variant="ghost" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              )}
              <Button type="submit" size="lg" disabled={busy}>
                {edit ? 'Save details' : a.mode === 'plan' ? 'Create my photo plan' : 'Continue to photos'}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
