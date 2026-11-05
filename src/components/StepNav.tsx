import { NavLink } from 'react-router-dom';

import { useProject } from '@/state/project';

const STEPS = [
  { to: 'plan', label: 'Plan' },
  { to: 'photos', label: 'Photos' },
  { to: 'style', label: 'Style' },
  { to: 'album', label: 'Album' },
] as const;

export function StepNav() {
  const project = useProject((s) => s.project);
  const photos = useProject((s) => s.photos.length);
  if (!project) return null;
  return (
    <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-5" aria-label="Album steps">
      {STEPS.map((s, i) => (
        <NavLink
          key={s.to}
          to={`/album/${project.id}/${s.to}`}
          className={({ isActive }) =>
            `flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition ${isActive ? 'bg-pop text-white shadow-soft' : 'text-muted hover:bg-pop-soft'}`
          }
        >
          <span className="text-xs opacity-70">{i + 1}</span>
          {s.label}
          {s.to === 'photos' && photos > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{photos}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
