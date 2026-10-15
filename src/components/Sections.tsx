import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, ChevronDown, ChevronRight, CircleCheck, Circle, Minus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RicoAvatar } from "@/components/Rico";
import { GRID } from "@/lib/grid";
import { cn } from "@/lib/utils";
import { formatMoney, presetDays } from "@/lib/format";
import type { Overview, Preset, Transaction } from "@/types";

const panel = "rounded-[12px] border border-neutral-200 bg-white shadow-none ring-0";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-neutral-700">{children}</h2>;
}


type ChangeData = Overview["what_changed"][number];
// One tile for the picked period.
export type ChangeItem = {
  cardId: string;
  kind: string;
  text: string;
  direction: string;
  action: { label: string; type: string };
};

const DIRECTION = {
  up: { Icon: ArrowUp, tone: "text-emerald-600" },
  down: { Icon: ArrowDown, tone: "text-rose-600" },
  flat: { Icon: Minus, tone: "text-neutral-500" },
  info: { Icon: BookOpen, tone: "text-neutral-500" },
} as const;

const tile = "min-h-[144px] rounded-[12px] border border-neutral-200 bg-white p-5";

// One row of four compact tiles, each under its card in the same grid. The header's period
// picker drives them. Metric label + tag; icon + a sentence of at most two lines; the action
// link, and Rico as "Ask Rico why" only where the action is the chart.
export function WhatChanged({
  data, preset, cardIds, labelFor, onAction, onAskRico,
}: {
  data: Overview;
  preset: Preset;
  cardIds: string[];
  labelFor: (cardId: string) => string;
  onAction: (item: ChangeItem) => void;
  onAskRico: (item: ChangeItem) => void;
}) {
  if (data.state === "new_project") return null;
  const gate = data.volume_gate;
  const gated = gate.current < gate.threshold_tx_per_week;
  const byCard = new Map<string, ChangeData>(data.what_changed.map((w) => [w.card_id, w]));
  const resolve = (w: ChangeData): ChangeItem => ({
    cardId: w.card_id, kind: w.kind, text: w.text[preset], direction: w.direction[preset], action: w.action[preset],
  });
  return (
    <section className="flex flex-col gap-4" aria-labelledby="what-changed">
      {/* 15px semibold, 40px above (24px page gap + 16px), 16px below. Same grid as the cards. */}
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h2 id="what-changed" className="text-[15px] font-semibold text-neutral-900">What changed</h2>
        <span className="text-xs text-neutral-400">last {presetDays[preset]} full days</span>
      </div>
      <div className={GRID}>
        {cardIds.map((id) => {
          const label = (
            <span className="truncate text-[11px] font-medium text-neutral-500 uppercase">{labelFor(id)}</span>
          );
          const w = byCard.get(id);
          if (gated || !w) {
            return (
              <div key={id} className={cn(tile, "flex flex-col gap-2 border-dashed bg-transparent")}>
                {label}
                <p className="text-sm text-neutral-400">Appears at {gate.threshold_tx_per_week}+ transactions a week.</p>
              </div>
            );
          }
          const item = resolve(w);
          const { Icon, tone } = DIRECTION[item.direction as keyof typeof DIRECTION];
          const business = item.kind === "business";
          return (
            <article key={id} aria-label={`${labelFor(id)}: ${item.text}`} className={cn(tile, "flex flex-col gap-2 transition-colors hover:border-neutral-300")}>
              <div className="flex items-center justify-between gap-2">
                {label}
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-none font-medium", business ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-700")}>
                  {business ? "Business" : "Definition"}
                </span>
              </div>
              <p className="flex gap-2 text-base leading-snug text-neutral-800">
                <Icon className={cn("mt-[3px] size-4 shrink-0", tone)} />
                <span className="line-clamp-2">{item.text}</span>
              </p>
              <div className="mt-auto flex min-h-8 items-center justify-between gap-2">
                <button onClick={() => onAction(item)} className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
                  {item.action.label} <ArrowRight className="size-3.5" />
                </button>
                {item.action.type === "chart" && (
                  <Tooltip>
                    <TooltipTrigger
                      render={<button onClick={() => onAskRico(item)} aria-label="Ask Rico why" />}
                      className="grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:outline-none"
                    >
                      <RicoAvatar size={32} />
                    </TooltipTrigger>
                    <TooltipContent>Ask Rico why</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// The "before" Rico bar on the Today view. Proposed uses RicoInput + RicoDrawer.
export function RicoBar({ placeholder }: { placeholder: string }) {
  return (
    <div className={cn(panel, "flex flex-col gap-3 p-3")}>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
        <Sparkles className="size-4 shrink-0 text-indigo-600" />
        <input
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        <span className="hidden text-xs text-neutral-400 sm:inline">Rico</span>
      </div>
    </div>
  );
}

function TransactionsTable({ rows }: { rows: Transaction[] }) {
  if (!rows.length) return <p className="p-4 text-sm text-neutral-400">No live transactions to show</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-neutral-500">
          <tr className="border-b border-neutral-200">
            {["Customer", "Product", "Event", "Country", "Revenue", "Time"].map((h) => (
              <th key={h} className={cn("px-4 py-2 font-medium", h === "Revenue" && "text-right")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-neutral-100 last:border-0">
              <td className="max-w-[180px] truncate px-4 py-2 font-mono text-xs text-neutral-600">{t.customer}</td>
              <td className="px-4 py-2 text-neutral-800">{t.product}</td>
              <td className="px-4 py-2 text-neutral-600">{t.kind}</td>
              <td className="px-4 py-2 text-neutral-600">{t.country}</td>
              <td className={cn("px-4 py-2 text-right tabular-nums", t.amount_usd < 0 ? "text-rose-600" : "text-neutral-800")}>{formatMoney(t.amount_usd)}</td>
              <td className="px-4 py-2 text-neutral-500 tabular-nums">{t.at.slice(11, 16)} UTC</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecentTransactions({ rows, collapsible }: { rows: Transaction[]; collapsible: boolean }) {
  const [open, setOpen] = useState(false);
  if (!collapsible) {
    return (
      <Card className={cn(panel, "gap-0 p-0")}>
        <div className="px-4 py-3"><SectionTitle>Recent transactions</SectionTitle></div>
        <TransactionsTable rows={rows} />
      </Card>
    );
  }
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn(panel, "overflow-hidden")}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50">
        <SectionTitle>Recent transactions</SectionTitle>
        <span className="flex items-center gap-1 text-xs text-neutral-500">
          {open ? "Hide" : `Show ${rows.length}`}
          <ChevronDown className={cn("size-4", open && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-neutral-200">
        <TransactionsTable rows={rows} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SetupChecklist({ steps, onOpenStep }: { steps: { label: string; done: boolean }[]; onOpenStep: (i: number) => void }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card className={cn(panel, "gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Finish setting up your project</SectionTitle>
        <span className="text-xs text-neutral-500">{done} of {steps.length} done</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-indigo-600" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-1 gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            <button onClick={() => onOpenStep(i)} className="-mx-2 flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-neutral-50">
              {s.done ? <CircleCheck className="size-4 shrink-0 text-emerald-600" /> : <Circle className="size-4 shrink-0 text-neutral-300" />}
              <span className={cn("flex-1", s.done ? "text-neutral-400 line-through" : i === next ? "font-medium text-indigo-600" : "text-neutral-700")}>{s.label}</span>
              <ChevronRight className="size-4 shrink-0 text-neutral-300" />
            </button>
          </li>
        ))}
      </ol>
      <p className="text-xs text-neutral-400">The cards stay empty until your first transactions arrive. Turn on "Show sample data" to preview them.</p>
    </Card>
  );
}
