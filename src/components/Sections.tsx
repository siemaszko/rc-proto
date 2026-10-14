import { useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight, CircleCheck, Circle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RicoAvatar } from "@/components/Rico";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { Overview, Transaction } from "@/types";

const panel = "rounded-[12px] border border-neutral-200 bg-white shadow-none ring-0";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-neutral-700">{children}</h2>;
}

const ICONS = { up: TrendingUp, down: TrendingDown, book: BookOpen } as const;

type ChangeItem = Overview["what_changed"][number];

// Two tiles side by side under the cards; anything past two waits behind "N more".
// Each tile: tag, sentence, and bottom-right the action plus "Ask Rico why".
export function WhatChanged({
  data, onAction, onAskRico,
}: { data: Overview; onAction: (item: ChangeItem) => void; onAskRico: (item: ChangeItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (data.state === "new_project") return null;
  const gate = data.volume_gate;
  const gated = gate.current < gate.threshold_tx_per_week;
  const shown = expanded ? data.what_changed : data.what_changed.slice(0, 2);
  const more = data.what_changed.length - shown.length;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="what-changed">
      <SectionTitle><span id="what-changed">What changed</span></SectionTitle>
      {gated ? (
        <Card className={cn(panel, "border-dashed bg-transparent p-4")}>
          <p className="text-sm text-neutral-400">What changed appears at {gate.threshold_tx_per_week}+ transactions a week.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS];
              const business = item.kind === "business";
              return (
                <Card key={item.text} className={cn(panel, "gap-3 p-4")}>
                  <div className="flex items-center justify-between">
                    <Icon className={cn("size-4", item.icon === "up" ? "text-emerald-600" : item.icon === "down" ? "text-rose-600" : "text-neutral-500")} />
                    <Badge className={business ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-700"}>
                      {business ? "Business" : "Definition / data"}
                    </Badge>
                  </div>
                  <p className="flex-1 text-sm text-neutral-800">{item.text}</p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" className="text-neutral-600" onClick={() => onAskRico(item)}>
                      <RicoAvatar size={16} /> Ask Rico why
                    </Button>
                    <Button variant="outline" size="sm" className="text-indigo-700" onClick={() => onAction(item)}>
                      {item.link.label} <ArrowRight />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
          {more > 0 && (
            <button onClick={() => setExpanded(true)} className="self-start text-sm font-medium text-indigo-600 hover:underline">
              {more} more
            </button>
          )}
        </>
      )}
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

export function DesignRules({ onNotOnPage }: { onNotOnPage: () => void }) {
  return (
    <footer className="flex flex-col gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500 sm:flex-row sm:items-end sm:justify-between">
      <ol className="flex list-decimal flex-col gap-1 pl-4">
        <li>You never have to ask if the number is right: definition, window and freshness are on the card.</li>
        <li>A number without direction is incomplete: every card shows change and trend.</li>
        <li>Every card leads somewhere: chart, rows, and when there&apos;s something to do, the action.</li>
      </ol>
      <Button variant="link" className="h-auto shrink-0 p-0 text-xs text-indigo-600" onClick={onNotOnPage}>
        Not on this page, and why →
      </Button>
    </footer>
  );
}
