import { useState } from "react";
import { FlaskConical, Info } from "lucide-react";
import normalData from "@/data/normal.json";
import lowVolumeData from "@/data/low_volume.json";
import newProjectData from "@/data/new_project.json";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sidebar, TopBar } from "@/components/Shell";
import { MetricCard, PlainCard } from "@/components/MetricCard";
import { DesignRules, RecentTransactions, RicoBar, SectionTitle, SetupChecklist, WhatChanged } from "@/components/Sections";
import { RicoDrawer, RicoInput, SetupDrawer } from "@/components/Drawers";
import { ChartModal, ExplainerModal, NotOnPageModal, RowsModal } from "@/components/Modals";
import { dateTimeUtc, periodLabel } from "@/lib/format";
import type { CardData, ChartTarget, Overview, Preset, StateKey, View } from "@/types";

const DATA: Record<StateKey, Overview> = {
  normal: normalData as Overview,
  low_volume: lowVolumeData as Overview,
  new_project: newProjectData as Overview,
};

const STATES = { normal: "Normal", low_volume: "Below volume gate", new_project: "New project" };
const PRESETS = { "7d": "Last 7 days", "28d": "Last 28 days", "90d": "Last 90 days" };
// The order of today's page: "in total" cards first, then "last 28 days".
const TODAY_ORDER = ["active_trials", "active_subscriptions", "mrr", "revenue", "new_customers", "active_customers"];

export default function App() {
  const [view, setView] = useState<View>("proposed");
  const [stateKey, setStateKey] = useState<StateKey>("normal");
  const [preset, setPreset] = useState<Preset>("28d");
  const [chart, setChart] = useState<ChartTarget | null>(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [rowsOpen, setRowsOpen] = useState(false);
  const [notOnPageOpen, setNotOnPageOpen] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [ricoOpen, setRicoOpen] = useState(false);
  const [ricoDraft, setRicoDraft] = useState("");
  const [showSample, setShowSample] = useState(false);
  const [setupSteps, setSetupSteps] = useState(DATA.new_project.setup!.steps);
  const [setupIndex, setSetupIndex] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);

  const data = DATA[stateKey];
  const sample = Boolean(data.sample);
  // Sample data always shows deltas; real data hides them below the volume gate.
  const gated = !sample && data.volume_gate.current < data.volume_gate.threshold_tx_per_week;
  const range = data.periods[preset];
  // Now-cards are "in total", but their delta and trend still follow the picker.
  const ctx = chart && { metric: chart.metric, periodLabel: periodLabel(preset), start: range.start, end: range.end, asOf: data.as_of };

  const empty = sample && !showSample;
  const openMetric = (metric: string) => {
    const card = data.cards.find((c) => c.label === metric);
    setChart({ metric, definition: card?.definition });
    setChartOpen(true);
  };
  const openChart = (c: CardData) => { setChart({ metric: c.label, definition: c.definition, cardId: c.id }); setChartOpen(true); };
  const openRows = (c: CardData) => { setChart({ metric: c.label, definition: c.definition, cardId: c.id }); setRowsOpen(true); };

  const cardsFor = (row: "now" | "period") =>
    data.cards.filter((c) => c.row === row).map((c) => (
      <MetricCard key={c.id} card={c} preset={preset} asOf={data.as_of} gated={gated} sample={sample} empty={empty} onOpenChart={() => openChart(c)} onOpenRows={() => openRows(c)} />
    ));

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          {/* Prototype controls: not part of the product UI. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-dashed border-neutral-300 bg-white px-4 py-2 md:px-8">
            <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-500"><FlaskConical className="size-3.5" /> Prototype</span>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="proposed">Proposed</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">State</span>
              <Select items={STATES} value={stateKey} onValueChange={(v) => setStateKey(v as StateKey)}>
                <SelectTrigger size="sm" className="w-[170px] bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATES).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 md:px-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-semibold">Overview</h1>
                <Select items={{ app_dayflow: `${data.app.name} (${data.app.platform})`, all: "All apps" }} defaultValue="app_dayflow">
                  <SelectTrigger size="sm" className="w-[160px] bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="app_dayflow">{data.app.name} ({data.app.platform})</SelectItem>
                    <Tooltip>
                      <TooltipTrigger render={<div />}>
                        <SelectItem value="all" disabled>All apps</SelectItem>
                      </TooltipTrigger>
                      <TooltipContent side="right">Next</TooltipContent>
                    </Tooltip>
                  </SelectContent>
                </Select>
              </div>
              {view === "proposed" && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                  Data as of {dateTimeUtc(data.as_of)}
                  <Popover>
                    <PopoverTrigger aria-label="About the data cutoff" className="rounded p-0.5 text-neutral-400 hover:text-neutral-700">
                      <Info className="size-3.5" />
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-3 text-xs text-neutral-700">
                      All cards on this page use this cutoff. Cached cards show their own time.
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </header>

            {view === "today" ? (
              <>
                <RicoBar placeholder="Ask about insights or growth opportunities for your apps" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {TODAY_ORDER.map((id) => data.cards.find((c) => c.id === id)!).map((c) => (
                    <PlainCard key={c.id} card={c} onOpenChart={() => openChart(c)} />
                  ))}
                </div>
                <RecentTransactions rows={data.recent_transactions} collapsible={false} />
              </>
            ) : (
              <>
                <RicoInput value={ricoDraft} onChange={setRicoDraft} onOpen={() => setRicoOpen(true)} />

                {data.setup && <SetupChecklist steps={setupSteps} onOpenStep={(i) => { setSetupIndex(i); setSetupOpen(true); }} />}

                <section className="flex flex-col gap-3">
                  <div className="flex h-8 items-center justify-between gap-3">
                    <SectionTitle>Now</SectionTitle>
                    {sample && (
                      <label className="flex items-center gap-2 text-xs text-neutral-600">
                        <Switch checked={showSample} onCheckedChange={setShowSample} />
                        Show sample data
                      </label>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{cardsFor("now")}</div>
                </section>

                <section className="flex flex-col gap-3">
                  <div className="flex h-8 items-center justify-between gap-3">
                    <SectionTitle>{periodLabel(preset)}</SectionTitle>
                    <Select items={PRESETS} value={preset} onValueChange={(v) => setPreset(v as Preset)}>
                      <SelectTrigger size="sm" className="w-[140px] bg-white" aria-label="Period"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRESETS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{cardsFor("period")}</div>
                </section>

                <WhatChanged
                  data={data}
                  onOpen={(item) => {
                    if (!item.link.metric) return setExplainerOpen(true);
                    openMetric(item.link.metric);
                  }}
                />

                <RecentTransactions rows={data.recent_transactions} collapsible />
                <DesignRules onNotOnPage={() => setNotOnPageOpen(true)} />
              </>
            )}
          </main>
        </div>
      </div>

      <ChartModal ctx={ctx} definition={chart?.definition} open={chartOpen} onOpenChange={setChartOpen} onViewRows={() => { setChartOpen(false); setRowsOpen(true); }} />
      <RowsModal ctx={ctx} open={rowsOpen} onOpenChange={setRowsOpen} />
      <NotOnPageModal open={notOnPageOpen} onOpenChange={setNotOnPageOpen} />
      <ExplainerModal open={explainerOpen} onOpenChange={setExplainerOpen} />
      <RicoDrawer
        open={ricoOpen}
        onOpenChange={setRicoOpen}
        draft={ricoDraft}
        onDraftChange={setRicoDraft}
        onOpenChart={(metric) => { setRicoOpen(false); openMetric(metric); }}
      />
      <SetupDrawer
        step={setupSteps[setupIndex]}
        index={setupIndex}
        total={setupSteps.length}
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onToggleDone={(done) => setSetupSteps((steps) => steps.map((s, i) => (i === setupIndex ? { ...s, done } : s)))}
      />
      <Toaster position="bottom-center" />
    </TooltipProvider>
  );
}
