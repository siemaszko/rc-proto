import { useLayoutEffect, useRef, useState } from "react";

export function Sparkline({
  points, className, drawIn, strokeWidth = 1.5, area,
}: { points: number[]; className?: string; drawIn?: boolean; strokeWidth?: number; area?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [len, setLen] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const W = 100, H = 28;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * W, H - 2 - ((p - min) / span) * (H - 4)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join("");

  // The stroke is non-scaling, so its dashes are in screen pixels: measure the line on screen.
  useLayoutEffect(() => {
    if (!drawIn || !ref.current) return;
    const sx = ref.current.clientWidth / W, sy = ref.current.clientHeight / H;
    setLen(xy.slice(1).reduce((sum, [x, y], i) => sum + Math.hypot((x - xy[i][0]) * sx, (y - xy[i][1]) * sy), 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawIn]);

  if (points.length < 2) return null;
  const drawing = drawIn && !drawn && len !== null;
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {/* A 6% wash under the line in the same colour. */}
      {area && <path d={`${d}L${W},${H}L0,${H}Z`} fill="currentColor" fillOpacity={0.06} stroke="none" />}
      <path
        d={d}
        className={drawing ? "spark-draw" : undefined}
        style={drawing ? ({ "--spark-len": Math.ceil(len) } as React.CSSProperties) : drawIn && !drawn ? { opacity: 0 } : undefined}
        // Drop the dash once drawn so a new period's longer line is not clipped.
        onAnimationEnd={() => setDrawn(true)}
        fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
