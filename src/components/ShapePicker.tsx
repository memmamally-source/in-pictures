import type { BookFormat } from '@/domain/types';
import { FORMATS } from '@/layouts/schema';

/** Portrait / Landscape / Square, each drawn to scale. */
export function ShapePicker({ value, onChange }: { value: BookFormat; onChange: (f: BookFormat) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Book shape">
      {(Object.keys(FORMATS) as BookFormat[]).map((f) => {
        const { w, h } = FORMATS[f].inches;
        const s = 34 / Math.max(w, h);
        const selected = value === f;
        return (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(f)}
            className={`flex flex-col items-center gap-2 rounded-2xl p-3 text-center ring-1 transition ${selected ? 'bg-pop-soft ring-2 ring-pop' : 'bg-white ring-line hover:bg-pop-soft/50'}`}
          >
            <span className="grid h-10 place-items-center">
              <span className={`block rounded-[3px] ${selected ? 'bg-pop' : 'bg-sand'}`} style={{ width: w * s, height: h * s }} />
            </span>
            <span className="text-sm font-medium">{FORMATS[f].label}</span>
            <span className="text-[11px] leading-tight text-muted">{FORMATS[f].help.split(' — ')[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
