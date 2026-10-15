import { ArrowUpRight, Info, Minus, Triangle, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { formatValue, presetDays, timeUtc } from "@/lib/format";
import type { CardData, Preset } from "@/types";

type Props = {
  card: CardData;
  preset: Preset;
  /** "In total, now" or "Last 28 full days · 17 Sep – 14 Oct" */
  window: string;
  /** Extra lines under the definition in the (i) popover. */
  notes?: string[];
  /** Cards added under "+ Add a card" can be removed again. */
  onRemove?: () => void;
  asOf: string;
  gated: boolean;
  sample: boolean;
  // New project with "Show sample data" off: label and a dash, nothing else.
  empty?: boolean;
  onOpenChart: () => void;
  onOpenRows: () => void;
};

const stop = (e: React.SyntheticEvent) => e.stopPropagation();
// Cards where a rise is bad news: the delta turns red when it goes up.
const LOWER_IS_BETTER = new Set(["churn"]);

// What the (i) panel's last line offers: the rows behind the number.
function rowsLink(card: CardData, preset: Preset) {
  const p = card.by_period[preset] as { value: number; transactions?: number };
  if (card.id === "active_subscriptions") return `See the ${formatValue(p.value, "count")} subscriptions behind this number`;
  if (card.id === "active_trials") return `See the ${formatValue(p.value, "count")} trials behind this number`;
  if (card.id === "mrr") return "See the subscriptions behind this MRR";
  if (p.transactions) return `See the ${formatValue(p.transactions, "count")} transactions behind this number`;
  return "See the rows behind this number";
}

// Proposed KPI card. Number and trend on the face; definition and rows behind the (i).
// No links on the face: the whole card opens the chart, an arrow hints at it on hover.
export function MetricCard({ card, preset, window, notes, onRemove, asOf, gated, sample, empty, onOpenChart, onOpenRows }: Props) {
  const p = card.by_period[preset];
  const up = p.delta_pct > 0, down = p.delta_pct < 0;
  const good = LOWER_IS_BETTER.has(card.id) ? down : up, bad = LOWER_IS_BETTER.has(card.id) ? up : down;
  const tone = good ? "text-emerald-600" : bad ? "text-rose-600" : "text-neutral-500";
  const cached = card.freshness.kind === "cached";
  const caveat = "caveat" in card.freshness ? (card.freshness.caveat as string) : null;
  // "In total, now · as of 06:22 UTC", or "Last 28 full days · 17 Sep – 14 Oct · as of 06:22 UTC".
  const line = `${window} · as of ${timeUtc(cached ? card.freshness.computed_at : asOf)}`;

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${card.label}, open chart`}
      onClick={onOpenChart}
      onKeyDown={(e) => e.key === "Enter" && onOpenChart()}
      className="group/metric relative min-h-[256px] cursor-pointer gap-0 rounded-[12px] border border-neutral-200 bg-white p-6 shadow-none ring-0 transition-colors hover:border-neutral-300 focus-visible:outline-2 focus-visible:outline-indigo-600"
    >
      {sample && !empty && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-semibold tracking-widest text-neutral-900/[0.04] uppercase select-none -rotate-12">
          Sample
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">{card.label}</span>
        <div className="flex items-center gap-1.5">
          {sample && !empty && <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">Sample</Badge>}
          <ArrowUpRight
            aria-hidden
            className="size-3.5 text-neutral-400 opacity-0 transition-opacity duration-150 group-hover/metric:opacity-100 group-focus-visible/metric:opacity-100 [@media(hover:none)]:opacity-100"
          />
          <Popover>
            <PopoverTrigger
              onClick={stop}
              aria-label={`What is ${card.label}?`}
              className="-m-1 rounded p-1 text-neutral-400 hover:text-neutral-700"
            >
              <Info className="size-4" />
            </PopoverTrigger>
            {/* Trust panel: what the number is, that it matches Charts, and the rows behind it. */}
            <PopoverContent side="right" align="start" sideOffset={12} className="w-80 gap-2 p-3" onClick={stop}>
              <p className="text-sm font-medium text-neutral-900">{card.label}</p>
              <p className="text-sm text-neutral-700">{card.definition}</p>
              <p className="text-xs text-neutral-500">Same definition as Charts v3</p>
              {notes && <div className="text-sm text-neutral-900 tabular-nums">{notes.map((n) => <p key={n}>{n}</p>)}</div>}
              {caveat && <p className="text-xs text-neutral-500">{caveat}</p>}
              <button onClick={onOpenRows} className="self-start pt-1 text-left text-xs font-medium text-indigo-600 hover:underline">
                {rowsLink(card, preset)} →
              </button>
            </PopoverContent>
          </Popover>
          {onRemove && (
            <button onClick={(e) => { stop(e); onRemove(); }} aria-label={`Remove ${card.label}`} className="-m-1 rounded p-1 text-neutral-400 hover:text-neutral-700">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Number left, delta chip right on the same baseline; "vs prev" under the chip. */}
      <div className="mt-2 flex items-start justify-between gap-2">
        <span className={cn("text-[40px] leading-none font-semibold tabular-nums", empty ? "text-neutral-300" : "text-neutral-900")}>
          {empty ? "-" : formatValue(p.value, card.unit)}
        </span>
        {empty ? (
          <span className="pt-1.5 text-xs text-neutral-400">No data yet</span>
        ) : gated ? (
          <span className="pt-1.5 text-right text-xs text-neutral-400">Not enough data yet</span>
        ) : (
          <span className="flex shrink-0 flex-col items-end pt-1">
            <span className={cn("flex items-center gap-1 text-sm leading-none font-medium whitespace-nowrap tabular-nums", tone)}>
              {up ? <Triangle className="size-2.5 fill-current" /> : down ? <Triangle className="size-2.5 rotate-180 fill-current" /> : <Minus className="size-3" />}
              {Math.abs(p.delta_pct).toFixed(1)}%
            </span>
            <span className="mt-1 text-[11px] leading-none whitespace-nowrap text-neutral-400">vs prev {presetDays[preset]}d</span>
          </span>
        )}
      </div>

      {!empty && (
        <>
          <div className={cn("mt-4 h-[72px]", tone)}>
            {!gated && <Sparkline points={p.sparkline} drawIn={sample} strokeWidth={1.75} area className="h-[72px] w-full" />}
          </div>
          <p className="mt-auto pt-3 text-xs text-neutral-400">{line}</p>
        </>
      )}
    </Card>
  );
}

// Today's card. `zero`: a new project, where today's page shows every number at 0.
export function PlainCard({ card, zero, onOpenChart }: { card: CardData; zero?: boolean; onOpenChart: () => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpenChart}
      onKeyDown={(e) => e.key === "Enter" && onOpenChart()}
      className="cursor-pointer gap-0 rounded-[12px] border border-neutral-200 bg-white p-4 shadow-none ring-0 hover:border-neutral-300"
    >
      <span className="text-[13px] font-medium tracking-wide text-neutral-500 uppercase">{card.label}</span>
      <span className="mt-2 text-[28px] leading-none font-semibold text-neutral-900 tabular-nums">{formatValue(zero ? 0 : card.value, card.unit)}</span>
      <span className="mt-2 text-xs text-neutral-400">{card.row === "now" ? "In total" : "Last 28 days"}</span>
    </Card>
  );
}
