import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Brand } from '@/config/brand';

import { IconButton } from './ui';

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label={`${Brand.name} home`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand via-[#ff6f61] to-pop text-white shadow-soft">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14" />
        </svg>
      </span>
      <span className="font-display text-xl tracking-tight">{Brand.name}</span>
    </Link>
  );
}

export function AppHeader({ title, back, right, sub }: { title?: ReactNode; back?: string | true; right?: ReactNode; sub?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-ivory/90 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-5">
        {back ? (
          <IconButton icon="back" label="Back" onClick={() => (back === true ? navigate(-1) : navigate(back))} />
        ) : (
          <Logo />
        )}
        <div className="min-w-0 flex-1 truncate font-display text-lg">{title}</div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
      {sub}
    </header>
  );
}
