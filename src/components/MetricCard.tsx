import { ArrowDownRight, ArrowRight, ArrowUpRight, Info, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { formatDelta, formatValue, presetDays, timeUtc } from "@/lib/format";
import type { CardData, Preset } from "@/types";

type Props = {
  card: CardData;
  preset: Preset;
  /** "In total, now" or "Last 28 full days · through 13 Oct" */
  window: string;
  /** Extra lines under the definition in the (i) popover. */
  notes?: string[];
  /** Cards added under (+) can be removed again. */
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

export function MetricCard({ card, preset, window, notes, onRemove, asOf, gated, sample, empty, onOpenChart, onOpenRows }: Props) {
  const p = card.by_period[preset];
  const up = p.delta_pct > 0, down = p.delta_pct < 0;
  const good = LOWER_IS_BETTER.has(card.id) ? down : up, bad = LOWER_IS_BETTER.has(card.id) ? up : down;
  const tone = good ? "text-emerald-600" : bad ? "text-rose-600" : "text-neutral-500";
  const cached = card.freshness.kind === "cached";
  const caveat = "caveat" in card.freshness ? (card.freshness.caveat as string) : null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpenChart}
      onKeyDown={(e) => e.key === "Enter" && onOpenChart()}
      className="relative cursor-pointer gap-0 rounded-[12px] border border-neutral-200 bg-white p-4 shadow-none ring-0 hover:border-neutral-300 focus-visible:outline-2 focus-visible:outline-indigo-600"
    >
      {sample && !empty && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-semibold tracking-widest text-neutral-900/[0.04] uppercase select-none -rotate-12">
          Sample
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium tracking-wide text-neutral-500 uppercase">{card.label}</span>
        <div className="flex items-center gap-1.5">
          {sample && !empty && <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">Sample</Badge>}
          <Popover>
            <PopoverTrigger
              onClick={stop}
              aria-label={`What is ${card.label}?`}
              className="-m-1 rounded p-1 text-neutral-400 hover:text-neutral-700"
            >
              <Info className="size-4" />
            </PopoverTrigger>
            <PopoverContent side="right" align="start" sideOffset={12} className="w-80 gap-2 p-3" onClick={stop}>
              <p className="text-sm font-medium text-neutral-900">{card.label}</p>
              <p className="text-sm text-neutral-700">{card.definition}</p>
              {notes && <div className="text-sm text-neutral-900 tabular-nums">{notes.map((n) => <p key={n}>{n}</p>)}</div>}
              <p className="text-xs text-neutral-500">Same definition as Charts v3.</p>
              <Separator />
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-neutral-600">
                <dt className="text-neutral-400">Window</dt>
                <dd>{window}</dd>
                <dt className="text-neutral-400">Data as of</dt>
                <dd>
                  {cached ? `Cached, computed ${timeUtc(card.freshness.computed_at)}` : `${timeUtc(asOf)} (page cutoff)`}
                </dd>
              </dl>
              <div className="flex items-center justify-between pt-1">
                <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-indigo-600 hover:underline">
                  Full definition →
                </a>
                <span className="text-[11px] text-neutral-400 italic">Definitions paraphrased</span>
              </div>
            </PopoverContent>
          </Popover>
          {onRemove && (
            <button onClick={(e) => { stop(e); onRemove(); }} aria-label={`Remove ${card.label}`} className="-m-1 rounded p-1 text-neutral-400 hover:text-neutral-700">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Number, then the delta on its own line: four cards to a row leave no room side by side. */}
      <div className="mt-2 flex flex-col gap-1">
        <span className={cn("text-[28px] leading-none font-semibold tabular-nums", empty ? "text-neutral-300" : "text-neutral-900")}>
          {empty ? "—" : formatValue(p.value, card.unit)}
        </span>
        {empty ? (
          <span className="text-xs text-neutral-400">No data yet</span>
        ) : gated ? (
          <span className="text-xs text-neutral-400">Not enough data yet</span>
        ) : (
          <span className={cn("flex items-center gap-0.5 text-[13px] font-medium whitespace-nowrap tabular-nums", tone)}>
            {up ? <ArrowUpRight className="size-3.5" /> : down ? <ArrowDownRight className="size-3.5" /> : null}
            {formatDelta(p.delta_pct)}
            <span className="ml-1 font-normal text-neutral-400">vs prev {presetDays[preset]}d</span>
          </span>
        )}
      </div>

      {!empty && (
        <>
          <div className={cn("mt-3 h-7", tone)}>
            {!gated && <Sparkline points={p.sparkline} drawIn={sample} className="h-7 w-full" />}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-400">
            <span>{window}</span>
            <span aria-hidden>·</span>
            {cached ? (
              <span className="italic">cached · as of {timeUtc(card.freshness.computed_at)}</span>
            ) : caveat ? (
              <Tooltip>
                <TooltipTrigger render={<span onClick={stop} />} className="cursor-help underline decoration-dotted underline-offset-2">
                  as of {timeUtc(asOf)}
                </TooltipTrigger>
                <TooltipContent>{caveat}</TooltipContent>
              </Tooltip>
            ) : (
              <span>as of {timeUtc(asOf)}</span>
            )}
          </div>

          <div className="mt-3 flex gap-1 border-t border-neutral-100 pt-2">
            <Button variant="ghost" size="sm" className="-ml-2 text-indigo-600 hover:text-indigo-700" onClick={(e) => { stop(e); onOpenChart(); }}>
              Open chart <ArrowRight />
            </Button>
            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700" onClick={(e) => { stop(e); onOpenRows(); }}>
              View rows <ArrowRight />
            </Button>
          </div>
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
