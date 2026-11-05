import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-soft',
  secondary: 'bg-white text-ink ring-1 ring-line hover:bg-pop-soft hover:ring-pop/30',
  ghost: 'text-ink hover:bg-cream',
  danger: 'bg-white text-[#9b2c2c] ring-1 ring-[#e8c4c4] hover:bg-[#fbeeee]',
};
const sizes = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-13 px-7 text-base' };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof sizes;
  icon?: IconName;
}

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: LinkProps & { variant?: Variant; size?: keyof typeof sizes; icon?: IconName }) {
  return (
    <Link className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
      {children}
    </Link>
  );
}

export function IconButton({ icon, label, className = '', active, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-cream disabled:opacity-40 ${active ? 'bg-pop-soft text-pop-dark' : 'text-ink'} ${className}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

export function Chip({ selected, children, onClick, className = '' }: { selected?: boolean; children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`h-10 rounded-full px-4 text-sm transition ring-1 ${selected ? 'bg-pop text-white ring-pop shadow-soft' : 'bg-white text-ink ring-line hover:bg-pop-soft'} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'w-full rounded-2xl border-0 bg-white px-4 py-3 text-ink ring-1 ring-line placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-pop';

export function Toggle({ checked, onChange, label, help }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-line">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[15px] text-ink">{label}</span>
        {help && <span className="mt-0.5 block text-xs text-muted">{help}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-pop' : 'bg-sand'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-sand ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand via-[#ff7a59] to-pop transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
}

/**
 * Modal sheet: slides up from the bottom on phones, centred dialog on wide
 * screens. Closes on Escape and backdrop tap; focus moves into it.
 */
export function Sheet({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <div className="animate-fade absolute inset-0 bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-rise relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-ivory shadow-lift outline-none sm:rounded-3xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-display text-xl">{title}</h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line px-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => (onConfirm(), onClose())}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="pb-2 text-[15px] text-muted">{body}</div>
    </Sheet>
  );
}

export function Notice({ tone = 'info', children, className = '' }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode; className?: string }) {
  const tones = { info: 'bg-mist text-mist-ink', warn: 'bg-butter/70 text-butter-ink', error: 'bg-[#f6dcdc] text-[#7d2a2a]' };
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-3 text-sm ${tones[tone]} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={tone === 'info' ? 'info' : 'info'} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export const TINTS: Record<string, { bg: string; ink: string }> = {
  rose: { bg: 'bg-rose', ink: 'text-rose-ink' },
  peach: { bg: 'bg-peach', ink: 'text-peach-ink' },
  butter: { bg: 'bg-butter', ink: 'text-butter-ink' },
  sage: { bg: 'bg-sage', ink: 'text-sage-ink' },
  mist: { bg: 'bg-mist', ink: 'text-mist-ink' },
  lilac: { bg: 'bg-lilac', ink: 'text-lilac-ink' },
  sand: { bg: 'bg-tan', ink: 'text-tan-ink' },
  sky: { bg: 'bg-sky', ink: 'text-sky-ink' },
};
