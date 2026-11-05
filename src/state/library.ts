import { create } from 'zustand';

import type { Answers, Project } from '@/domain/types';
import { createId } from '@/lib/id';
import { suggestedFormat } from '@/engine/kinds';
import { recommendThemes, type AlbumKind } from '@/layouts/themes';
import { repo } from '@/services/repository';
import { getOccasion } from '@/templates/occasions';
import { buildPlan, chaptersFor } from '@/templates/planner';

interface LibraryState {
  projects: Project[];
  loaded: boolean;
  refresh: () => Promise<void>;
  create: (occasionId: string, answers: Answers, options?: { quick?: boolean; kind?: AlbumKind }) => Promise<Project>;
  rename: (id: string, title: string) => Promise<void>;
  duplicate: (id: string) => Promise<Project | undefined>;
  remove: (id: string) => Promise<void>;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  projects: [],
  loaded: false,
  async refresh() {
    set({ projects: await repo.listProjects(), loaded: true });
  },
  async create(occasionId, answers, options = {}) {
    const occasion = getOccasion(occasionId);
    const now = Date.now();
    const themeId = recommendThemes(occasion.themes, answers.mood, options.kind)[0];
    const format = suggestedFormat(themeId, occasionId);
    const project: Project = {
      id: createId('album'),
      schemaVersion: 1,
      occasionId,
      answers,
      plan: buildPlan(occasion, answers),
      chapters: chaptersFor(occasion),
      themeId,
      format,
      step: options.quick ? 'album' : answers.mode === 'plan' ? 'plan' : 'photos',
      quick: options.quick || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await repo.saveProject(project);
    await get().refresh();
    return project;
  },
  async rename(id, title) {
    const p = await repo.getProject(id);
    if (!p) return;
    const old = p.answers.title;
    const album = p.album && {
      ...p.album,
      pages: p.album.pages.map((pg) => (pg.text.title === old ? { ...pg, text: { ...pg.text, title } } : pg)),
    };
    await repo.saveProject({ ...p, answers: { ...p.answers, title }, album, updatedAt: Date.now() });
    await get().refresh();
  },
  async duplicate(id) {
    const p = await repo.getProject(id);
    if (!p) return undefined;
    const copy = await repo.duplicateProject(id, createId('album'), `${p.answers.title} (copy)`);
    await get().refresh();
    return copy;
  },
  async remove(id) {
    await repo.deleteProject(id);
    await get().refresh();
  },
}));
