import type { TextOp } from './scene';

/** Line positions (baselines) for a text op; shared by SVG and canvas. */
export function linePositions(op: TextOp): { x: number; y: number; text: string }[] {
  const lh = op.font.lineHeight * op.size;
  const block = op.lines.length * lh;
  const topAligned = op.key.startsWith('caption') || op.key === 'note' || op.key === 'body';
  const top = topAligned ? op.box.y : op.box.y + Math.max(0, (op.box.h - block) / 2);
  const x = op.align === 'left' ? op.box.x : op.align === 'right' ? op.box.x + op.box.w : op.box.x + op.box.w / 2;
  return op.lines.map((text, i) => ({ x, y: top + i * lh + (lh - op.size) / 2 + op.size * 0.8, text }));
}
