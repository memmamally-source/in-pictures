import { memo, useId, useMemo, type PointerEvent as ReactPointerEvent } from 'react';

import type { AlbumPage, Photo } from '@/domain/types';
import { PAGE_H, PAGE_W } from '@/layouts/schema';
import type { ThemeDef } from '@/layouts/themes';
import type { Variant } from '@/storage/db';
import { usePhotoUrl } from '@/storage/urls';

import { useFontsVersion } from './fonts';
import { buildScene, type FrameOp, type ResolvedPart, type Xform } from './scene';
import { browserMeasure } from './text';
import { linePositions } from './textLayout';

/**
 * Renders one album page as inline SVG from the shared scene. Used for the
 * reader, the editor, thumbnails and style previews.
 */

export interface PageViewProps {
  page: AlbumPage;
  theme: ThemeDef;
  photos: Map<string, Photo>;
  variant?: Variant;
  /** Show empty frames as "add photo" placeholders (editor only). */
  showEmpty?: boolean;
  selectedSlot?: number | null;
  onSlotPointerDown?: (slot: number, e: ReactPointerEvent<SVGElement>) => void;
  className?: string;
  title?: string;
}

const rot = (xf?: Xform) => (xf ? `rotate(${xf.rot} ${xf.cx} ${xf.cy})` : undefined);

function Parts({ parts, shadeId }: { parts: ResolvedPart[]; shadeId: string }) {
  return (
    <>
      {parts.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.shade ? `url(#${shadeId})` : p.fill ?? 'none'}
          stroke={p.stroke ?? 'none'}
          strokeWidth={p.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={p.opacity}
        />
      ))}
    </>
  );
}

function FrameView({ op, ids, variant, showEmpty, selected, onPointerDown }: {
  op: FrameOp;
  ids: { shadow: string; clip: string };
  variant: Variant;
  showEmpty?: boolean;
  selected?: boolean;
  onPointerDown?: (e: ReactPointerEvent<SVGElement>) => void;
}) {
  const url = usePhotoUrl(op.photo?.id, variant);
  const clipId = `${ids.clip}-${op.slot}`;
  const { inner } = op;
  let image = null;
  if (op.photo) {
    const { crop } = op.photo;
    const w = inner.w / crop.sw;
    const h = inner.h / crop.sh;
    image = url ? (
      <image href={url} x={inner.x - crop.sx * w} y={inner.y - crop.sy * h} width={w} height={h} preserveAspectRatio="none" />
    ) : (
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="#00000010" />
    );
  } else if (showEmpty) {
    const cx = inner.x + inner.w / 2;
    const cy = inner.y + inner.h / 2;
    const s = Math.min(inner.w, inner.h) * 0.12;
    image = (
      <g>
        <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} fill="#00000012" />
        <path d={`M${cx - s} ${cy}H${cx + s}M${cx} ${cy - s}V${cy + s}`} stroke="#00000055" strokeWidth={Math.max(0.4, s * 0.15)} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={rot(op.xf)} onPointerDown={onPointerDown} style={onPointerDown ? { cursor: 'pointer' } : undefined} data-slot={op.slot}>
      {op.paper && <path d={op.paper} fill={op.paperColor} filter={op.shadow ? `url(#${ids.shadow})` : undefined} />}
      {!op.paper && op.shadow && <path d={op.clip} fill="#fff" filter={`url(#${ids.shadow})`} />}
      <clipPath id={clipId}>
        <path d={op.clip} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{image}</g>
      {op.over && <Parts parts={op.over} shadeId="" />}
      {selected && <path d={op.clip} fill="none" stroke="#6A3FF0" strokeWidth={0.9} strokeDasharray="2 1.2" />}
      {onPointerDown && <rect x={op.box.x} y={op.box.y} width={op.box.w} height={op.box.h} fill="transparent" />}
    </g>
  );
}

export const PageView = memo(function PageView({ page, theme, photos, variant = 'display', showEmpty, selectedSlot, onSlotPointerDown, className, title }: PageViewProps) {
  const fonts = useFontsVersion();
  const uid = useId().replace(/:/g, '');
  const scene = useMemo(() => buildScene({ page, theme, photos, measure: browserMeasure }), [page, theme, photos, fonts]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = { shadow: `sh${uid}`, clip: `cl${uid}`, shade: `sd${uid}` };
  return (
    <svg
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      className={className}
      role="img"
      aria-label={title ?? 'Album page'}
      style={{ display: 'block', width: '100%', height: 'auto', background: scene.background, touchAction: onSlotPointerDown ? 'none' : undefined }}
    >
      <defs>
        <filter id={ids.shadow} x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.7" floodColor="#3a2a1a" floodOpacity="0.22" />
        </filter>
        <linearGradient id={ids.shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {scene.ops.map((op, i) => {
        if (op.t === 'path') {
          return (
            <g key={i} transform={rot(op.xf)}>
              <Parts parts={op.parts} shadeId={ids.shade} />
            </g>
          );
        }
        if (op.t === 'frame') {
          return (
            <FrameView
              key={i}
              op={op}
              ids={ids}
              variant={variant}
              showEmpty={showEmpty}
              selected={selectedSlot === op.slot}
              onPointerDown={onSlotPointerDown ? (e) => onSlotPointerDown(op.slot, e) : undefined}
            />
          );
        }
        const anchor = op.align === 'left' ? 'start' : op.align === 'right' ? 'end' : 'middle';
        return (
          <text
            key={i}
            transform={rot(op.xf)}
            fontFamily={`"${op.font.family}"`}
            fontWeight={op.font.weight}
            fontStyle={op.font.style}
            fontSize={op.size}
            letterSpacing={op.font.tracking ? op.font.tracking * op.size : undefined}
            fill={op.color}
            textAnchor={anchor}
            style={{ userSelect: 'none' }}
          >
            {linePositions(op).map((l, j) => (
              <tspan key={j} x={l.x} y={l.y}>
                {l.text}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
});
