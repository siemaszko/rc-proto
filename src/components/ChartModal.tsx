import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Context, type Ctx } from "@/components/Modals";
import { cn } from "@/lib/utils";
import { dayMonth, formatValue } from "@/lib/format";
import type { CardData, Preset } from "@/types";

// The chart behind every card: this period (solid indigo, light fill) against the previous
// one (dashed), drawn as inline SVG. Same period and cutoff as the Overview.

const PAD = { top: 12, right: 12, bottom: 28, left: 52 };

// Three evenly spaced gridlines on round steps that cover both lines, as tight as possible.
function ticks(min: number, max: number) {
  const span = max - min || Math.abs(max) || 1;
  for (let mag = 10 ** Math.floor(Math.log10(span / 4)); ; mag *= 10) {
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
      const step = m * mag, lo = Math.floor(min / step) * step;
      if (lo + 2 * step >= max) return [lo, lo + step, lo + 2 * step];
    }
  }
}

function axisLabel(v: number, unit: string) {
  if (unit === "USD") return v >= 1000 ? `$${+(v / 1000).toFixed(2)}k` : `$${Math.round(v)}`;
  if (unit === "percent") return `${Math.round(v * 10) / 10}%`;
  return formatValue(Math.round(v), "count");
}

// A point's date: points are spread evenly over the period.
function dateAt(i: number, count: number, start: string, end: string) {
  const a = Date.parse(start + "T00:00:00Z"), b = Date.parse(end + "T00:00:00Z");
  const t = a + Math.round(((b - a) / 86400000) * (i / Math.max(1, count - 1))) * 86400000;
  return dayMonth(new Date(t));
}

function LineChart({ cur, prev, unit, start, end }: { cur: number[]; prev: number[]; unit: string; start: string; end: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // Drawn at the real pixel size so text and strokes never stretch: 260px tall, 200px on a phone.
  const [W, setW] = useState(672);
  const H = W < 500 ? 200 : 260;
  useLayoutEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 672));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = cur.length;

  const { yTicks, x, y, path, prevPath, area } = useMemo(() => {
    const all = [...cur, ...prev];
    const yTicks = ticks(Math.min(...all), Math.max(...all));
    const [lo, hi] = [yTicks[0], yTicks[2]];
    const x = (i: number) => PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.top - PAD.bottom);
    const line = (pts: number[]) => pts.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const path = line(cur);
    return { yTicks, x, y, path, prevPath: line(prev), area: `${path}L${x(n - 1)},${H - PAD.bottom}L${x(0)},${H - PAD.bottom}Z` };
  }, [cur, prev, n, W, H]);

  const onMove = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (n - 1)))));
  };
  const mid = Math.floor((n - 1) / 2);

  return (
    <div ref={box} className="relative w-full min-w-0">
      <svg
        ref={svg}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Chart of this period against the previous period"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-neutral-200" />
            <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-neutral-400 text-[11px]">{axisLabel(t, unit)}</text>
          </g>
        ))}
        {[0, mid, n - 1].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-neutral-400 text-[11px]">
            {dateAt(i, n, start, end)}
          </text>
        ))}
        <path d={prevPath} fill="none" className="stroke-neutral-400" strokeWidth={1.5} strokeDasharray="5 4" />
        <path d={area} className="fill-indigo-600" fillOpacity={0.08} />
        <path d={path} fill="none" className="stroke-indigo-600" strokeWidth={2} strokeLinejoin="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} className="stroke-neutral-300" />
            <circle cx={x(hover)} cy={y(cur[hover])} r={4} className="fill-indigo-600 stroke-white" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-1 rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white tabular-nums"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})` }}
        >
          {dateAt(hover, n, start, end)} · {formatValue(cur[hover], unit)} · prev {formatValue(prev[hover], unit)}
        </div>
      )}
    </div>
  );
}

export function ChartModal({
  ctx, card, preset, open, onOpenChange, onViewRows,
}: { ctx: Ctx | null; card: CardData | null; preset: Preset; open: boolean; onOpenChange: (o: boolean) => void; onViewRows: () => void }) {
  const p = card?.by_period[preset] as (CardData["by_period"]["28d"] & { prev_value: number; sparkline_prev: number[] }) | undefined;
  const now = card?.row === "now";
  const up = (p?.delta_pct ?? 0) > 0, down = (p?.delta_pct ?? 0) < 0;
  const good = card?.id === "churn" ? down : up, bad = card?.id === "churn" ? up : down;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "grid-cols-1 gap-4 p-6 sm:max-w-[720px]", // grid-cols-1 = minmax(0, 1fr): the chart follows the dialog, not the other way round
          // Phone: a full-screen sheet.
          "max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:content-start max-sm:overflow-y-auto max-sm:rounded-none max-sm:p-4",
        )}
      >
        {ctx && card && p && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{ctx.metric}</DialogTitle>
              <DialogDescription className="text-neutral-500">{card.definition}</DialogDescription>
            </DialogHeader>
            <Context {...ctx} />
            <div className="flex flex-col gap-2">
              <LineChart cur={p.sparkline} prev={p.sparkline_prev} unit={card.unit} start={ctx.start} end={ctx.end} />
              <p className="flex gap-4 text-xs text-neutral-500">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-600" /> This period</span>
                <span className="flex items-center gap-1.5"><span className="w-4 border-t-[1.5px] border-dashed border-neutral-400" /> Previous period</span>
              </p>
            </div>
            {/* Summary from the data: start and end for levels, totals for period cards. */}
            <dl className="grid grid-cols-1 gap-2 rounded-lg bg-neutral-50 p-3 text-sm sm:grid-cols-3">
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-neutral-500">{now ? "Start" : "Previous period"}</dt>
                <dd className="font-medium text-neutral-900 tabular-nums">{formatValue(p.prev_value, card.unit)}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-neutral-500">{now ? "End" : "This period"}</dt>
                <dd className="font-medium text-neutral-900 tabular-nums">{formatValue(p.value, card.unit)}</dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-neutral-500">Change</dt>
                <dd className={cn("font-medium tabular-nums", good ? "text-emerald-600" : bad ? "text-rose-600" : "text-neutral-900")}>
                  {p.delta_pct > 0 ? "+" : p.delta_pct < 0 ? "−" : ""}{Math.abs(p.delta_pct).toFixed(1)}%
                </dd>
              </div>
            </dl>
            <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-neutral-400">Same definition as Charts v3</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onViewRows}><Rows3 /> View rows (200)</Button>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => toast(`Would open Charts → ${ctx.metric} with this period and cutoff`)}>
                  Open in Charts <ArrowRight />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
