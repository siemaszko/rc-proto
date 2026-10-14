import { useState } from "react";
import { ArrowRight, BookOpen, ChevronDown, CircleCheck, Circle, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { Overview, Transaction } from "@/types";

const panel = "rounded-[12px] border border-neutral-200 bg-white shadow-none ring-0";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-medium text-neutral-700">{children}</h2>;
}

const ICONS = { up: TrendingUp, down: TrendingDown, book: BookOpen } as const;

export function WhatChanged({
  data,
  onOpen,
}: {
  data: Overview;
  onOpen: (item: Overview["what_changed"][number]) => void;
}) {
  if (data.state === "new_project") return null;
  const gate = data.volume_gate;
  if (gate.current < gate.threshold_tx_per_week) {
    return (
      <p className="text-sm text-neutral-400">
        What changed appears once you have {gate.threshold_tx_per_week}+ transactions a week.
      </p>
    );
  }
  return (
    <section className="flex flex-col gap-3" aria-labelledby="what-changed">
      <SectionTitle><span id="what-changed">What changed</span></SectionTitle>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {data.what_changed.slice(0, 3).map((item) => {
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
              <button onClick={() => onOpen(item)} className="flex items-center gap-1 self-start text-sm font-medium text-indigo-600 hover:underline">
                {item.link.label} <ArrowRight className="size-3.5" />
              </button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

export function RicoBar({ placeholder, prompts = [] }: { placeholder: string; prompts?: string[] }) {
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
      {prompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <button key={p} className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50">
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionsTable({ rows }: { rows: Transaction[] }) {
  if (!rows.length) return <p className="p-4 text-sm text-neutral-400">No transactions yet.</p>;
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

export function SetupChecklist({ setup }: { setup: NonNullable<Overview["setup"]> }) {
  const next = setup.steps.findIndex((s) => !s.done);
  return (
    <Card className={cn(panel, "gap-3 p-4")}>
      <div className="flex items-center justify-between">
        <SectionTitle>Finish setting up your project</SectionTitle>
        <span className="text-xs text-neutral-500">{setup.done} of {setup.steps.length} steps</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full bg-indigo-600" style={{ width: `${(setup.done / setup.steps.length) * 100}%` }} />
      </div>
      <ol className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {setup.steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            {s.done ? <CircleCheck className="size-4 text-emerald-600" /> : <Circle className="size-4 text-neutral-300" />}
            {i === next ? (
              <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-indigo-600 hover:underline">{s.label} →</a>
            ) : (
              <span className={s.done ? "text-neutral-400 line-through" : "text-neutral-700"}>{s.label}</span>
            )}
          </li>
        ))}
      </ol>
      <p className="text-xs text-neutral-400">The cards below show sample data until your first transactions arrive.</p>
    </Card>
  );
}

export function DesignRules({ onNotOnPage }: { onNotOnPage: () => void }) {
  return (
    <footer className="flex flex-col gap-3 border-t border-neutral-200 pt-5 text-xs text-neutral-500 sm:flex-row sm:items-end sm:justify-between">
      <ol className="flex list-decimal flex-col gap-1 pl-4">
        <li>You never have to ask if the number is right: definition, window and freshness are on the card.</li>
        <li>A number without direction is incomplete: every card shows change and trend.</li>
        <li>Every card leads somewhere: chart and rows, same period, same cutoff.</li>
      </ol>
      <Button variant="link" className="h-auto shrink-0 p-0 text-xs text-indigo-600" onClick={onNotOnPage}>
        Not on this page, and why →
      </Button>
    </footer>
  );
}
