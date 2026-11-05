import { describe, expect, it } from 'vitest';

import type { Answers } from '@/domain/types';

import { getOccasion, OCCASIONS, searchOccasions } from './occasions';
import { buildPlan, computeTarget, fillTokens, joinNames, mergePlan, planProgress, resolveShots, suggestTitle, tripDays } from './planner';

const answers = (over: Partial<Answers> = {}): Answers => ({
  title: '',
  group: 'couple',
  participants: 2,
  names: [],
  children: false,
  mood: 'romantic',
  length: 'standard',
  mode: 'plan',
  extras: {},
  ...over,
});

const titles = (occasionId: string, a: Answers) => buildPlan(getOccasion(occasionId), a).map((i) => i.title);
const shotIds = (occasionId: string, a: Answers) => buildPlan(getOccasion(occasionId), a).map((i) => i.shotId);

describe('occasion catalogue', () => {
  it('has the 20 required categories, each with distinct shots', () => {
    expect(OCCASIONS).toHaveLength(20);
    const signatures = new Set(OCCASIONS.map((o) => resolveShots(o).map((s) => s.id).sort().join(',')));
    expect(signatures.size).toBe(OCCASIONS.length);
  });

  it('puts every shot into a chapter the occasion defines', () => {
    for (const o of OCCASIONS) {
      const chapters = new Set(o.chapters.map((c) => c.id));
      for (const s of resolveShots(o)) expect(chapters.has(s.chapter), `${o.id}/${s.id} → ${s.chapter}`).toBe(true);
      expect(o.chapters.filter((c) => c.ending)).toHaveLength(1);
    }
  });

  it('produces a non-empty plan for every occasion and group', () => {
    for (const o of OCCASIONS) {
      for (const group of o.questions.groupOptions ?? (['solo', 'couple', 'family', 'friends', 'group'] as const)) {
        const plan = buildPlan(o, answers({ group, participants: group === 'solo' ? 1 : 4, length: 'short' }));
        expect(plan.length, `${o.id}/${group}`).toBeGreaterThan(2);
        expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
      }
    }
  });

  it('searches by name and keyword', () => {
    expect(searchOccasions('honeymoon').map((o) => o.id)).toEqual(['honeymoon']);
    expect(searchOccasions('rollercoaster').map((o) => o.id)).toEqual(['theme-park']);
    expect(searchOccasions('DOG').map((o) => o.id)).toContain('pets');
    expect(searchOccasions('')).toHaveLength(20);
  });
});

describe('personalised plans', () => {
  it('honeymoon in Greece: couple shots, the place named, the brief’s examples present', () => {
    const t = titles('honeymoon', answers({ location: 'Greece', startDate: '2026-06-01', endDate: '2026-06-08' }));
    expect(t).toContain('First view of Greece');
    expect(t).toContain('A candid photograph of you both laughing');
    expect(t).toContain('A romantic dinner');
    expect(t).toContain('A sunset together');
    expect(t).toContain('A souvenir or small detail worth remembering');
    expect(t).toContain('A photograph from the final day');
    expect(t.some((x) => /Everyone together|children/i.test(x))).toBe(false);
  });

  it('a solo trip never suggests couple photos', () => {
    const ids = shotIds('international-travel', answers({ group: 'solo', participants: 1, location: 'Japan' }));
    expect(ids).not.toContain('couple-laughing');
    expect(ids).not.toContain('couple-portrait');
    expect(ids).toContain('solo-portrait');
  });

  it('family birthday centres the birthday person and uses their name', () => {
    const plan = buildPlan(getOccasion('birthday'), answers({ group: 'family', participants: 5, honoree: 'Maya', children: true, extras: { party: true } }));
    const t = plan.map((p) => p.title);
    expect(t).toContain('Maya blowing out the candles');
    expect(t).toContain('A portrait of Maya');
    expect(t).toContain('Party games');
    expect(plan.find((p) => p.shotId === 'honoree-with-guests')!.target).toBe(4);
  });

  it('without a name, falls back to neutral wording instead of inventing one', () => {
    const t = titles('birthday', answers({ group: 'family', extras: { party: false } }));
    expect(t).toContain('Blowing out the candles');
    expect(t.some((x) => x.includes('{'))).toBe(false);
    expect(t).not.toContain('Party games');
  });

  it('graduation focuses on the graduate, attire, ceremony and family — no travel shots', () => {
    const plan = buildPlan(getOccasion('graduation'), answers({ group: 'family', participants: 4, honoree: 'Daniel', extras: { celebration: true } }));
    const t = plan.map((p) => p.title);
    expect(t).toContain('Daniel in cap and gown');
    expect(t).toContain('Crossing the stage');
    expect(t).toContain('Daniel with family');
    expect(plan.map((p) => p.shotId)).not.toContain('first-view');
    expect(getOccasion('graduation').questions.location).not.toBe('required');
  });

  it('adds children prompts only when children take part', () => {
    expect(shotIds('family-gathering', answers({ group: 'family', children: true }))).toContain('kids-candid');
    expect(shotIds('family-gathering', answers({ group: 'family', children: false }))).not.toContain('kids-candid');
  });

  it('scales targets with trip length and repeats per-day shots', () => {
    const short = buildPlan(getOccasion('international-travel'), answers({ location: 'Rome', days: 1 }));
    const week = buildPlan(getOccasion('international-travel'), answers({ location: 'Rome', startDate: '2026-05-01', endDate: '2026-05-05' }));
    const target = (plan: typeof short, id: string) => plan.find((p) => p.shotId === id)!.target;
    expect(target(week, 'landmark')).toBeGreaterThan(target(short, 'landmark'));
    expect(week.filter((p) => p.shotId === 'daily-highlight')).toHaveLength(5);
    expect(week.find((p) => p.id === 'daily-highlight#1')!.title).toContain('Fri 1 May');
    expect(short.some((p) => p.shotId === 'daily-highlight')).toBe(false);
    const long = buildPlan(getOccasion('international-travel'), answers({ location: 'Rome', days: 14 }));
    expect(long.filter((p) => p.shotId === 'daily-highlight')).toEqual([expect.objectContaining({ target: 14 })]);
  });

  it('album length controls how many prompts appear', () => {
    const n = (length: Answers['length']) => buildPlan(getOccasion('wedding'), answers({ group: 'group', length, extras: { role: 'couple' } })).length;
    expect(n('short')).toBeLessThan(n('standard'));
    expect(n('standard')).toBeLessThan(n('long'));
  });

  it('occasion-specific choices change the plan (wedding guest vs couple)', () => {
    const guest = shotIds('wedding', answers({ group: 'friends', extras: { role: 'guest' } }));
    const couple = shotIds('wedding', answers({ group: 'friends', extras: { role: 'couple' } }));
    expect(guest).toContain('guest-with-couple');
    expect(guest).not.toContain('couple-portraits');
    expect(couple).toContain('couple-portraits');
  });

  it('is deterministic', () => {
    const a = answers({ location: 'Lisbon', days: 3 });
    expect(buildPlan(getOccasion('road-trip'), a)).toEqual(buildPlan(getOccasion('road-trip'), a));
  });
});

describe('helpers', () => {
  it('counts days inclusively and caps silly ranges', () => {
    expect(tripDays({ startDate: '2026-06-01', endDate: '2026-06-01' })).toBe(1);
    expect(tripDays({ startDate: '2026-06-01', endDate: '2026-06-07' })).toBe(7);
    expect(tripDays({ startDate: '2026-06-07', endDate: '2026-06-01', days: 3 })).toBe(3);
    expect(tripDays({})).toBe(1);
  });

  it('joins names naturally', () => {
    expect(joinNames(['Anna'])).toBe('Anna');
    expect(joinNames(['Anna', ' Ben '])).toBe('Anna & Ben');
    expect(joinNames(['A', 'B', 'C', ''])).toBe('A, B & C');
  });

  it('fills tokens or reports missing answers', () => {
    expect(fillTokens('Trip to {location}', answers({ location: 'Oslo' }))).toBe('Trip to Oslo');
    expect(fillTokens('Trip to {location}', answers())).toBeNull();
    expect(fillTokens('{extra:grade}', answers({ extras: { grade: 'Year 2' } }))).toBe('Year 2');
  });

  it('suggests titles from the answers', () => {
    expect(suggestTitle(getOccasion('honeymoon'), answers({ location: 'Greece' }))).toBe('Honeymoon in Greece');
    expect(suggestTitle(getOccasion('honeymoon'), answers())).toBe('Our honeymoon');
    expect(suggestTitle(getOccasion('seasonal'), answers({ startDate: '2026-12-24', extras: { 'celebration-name': 'Christmas' } }))).toBe('Christmas 2026');
  });

  it('computes targets from rules', () => {
    expect(computeTarget({ base: 1, perPerson: 1, max: 8 }, answers({ participants: 20 }), 1)).toBe(8);
    expect(computeTarget({ base: 2, perDay: 0.5 }, answers(), 5)).toBe(4);
  });

  it('merges a rebuilt plan without losing the user’s edits', () => {
    const before = buildPlan(getOccasion('honeymoon'), answers({ location: 'Greece' }));
    before[0] = { ...before[0], target: 5, skipped: true };
    const custom = { id: 'custom-1', title: 'Our hotel cat', category: 'details' as const, chapter: 'arrival', target: 1, custom: true };
    const after = mergePlan([...before, custom], buildPlan(getOccasion('honeymoon'), answers({ location: 'Crete' })));
    expect(after[0]).toMatchObject({ target: 5, skipped: true });
    expect(after.at(-1)).toEqual(custom);
  });

  it('measures progress without requiring completion', () => {
    const plan = buildPlan(getOccasion('pets'), answers({ group: 'family', honoree: 'Biscuit', extras: { 'pet-kind': 'dog' } }));
    plan[1] = { ...plan[1], skipped: true };
    const p = planProgress(plan, { [plan[0].id]: plan[0].target });
    expect(p).toMatchObject({ complete: 1, skipped: 1, total: plan.length - 1 });
  });
});
