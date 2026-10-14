export function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const W = 100, H = 28;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((p, i) => `${i ? "L" : "M"}${((i / (points.length - 1)) * W).toFixed(2)},${(H - 2 - ((p - min) / span) * (H - 4)).toFixed(2)}`)
    .join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
