import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GRID } from "@/lib/grid";
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
import { DesignRules, RecentTransactions, RicoBar, SetupChecklist, WhatChanged } from "@/components/Sections";
import { OnboardingBlock } from "@/components/Onboarding";
import { AddCard, MAX_EXTRA, OPTIONAL_CARDS, type OptionalCardId } from "@/components/AddCard";
import { RicoDrawer, SetupDrawer } from "@/components/Drawers";
import { RicoLauncher } from "@/components/Rico";
import { ExperimentModal, ExplainerModal, NotOnPageModal, RowsModal } from "@/components/Modals";
import { ChartModal } from "@/components/ChartModal";
import { dateTimeUtc, formatValue, fullDaysLabel, presetDays } from "@/lib/format";
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
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [extra, setExtra] = useState<OptionalCardId[]>([]);
  const [ricoOpen, setRicoOpen] = useState(false);
  const [ricoDraft, setRicoDraft] = useState("");
  const [showSample, setShowSample] = useState(false);
  // New project. Today: RevenueCat's onboarding block. Proposed: the setup checklist.
  // Separate data and state: the two views are separate designs.
  const [tasks, setTasks] = useState(DATA.new_project.onboarding!.tasks);
  const [setupSteps, setSetupSteps] = useState(DATA.new_project.setup!.steps);
  const [setupIndex, setSetupIndex] = useState(0);
  const [setupOpen, setSetupOpen] = useState(false);

  const data = DATA[stateKey];
  const sample = Boolean(data.sample);
  // Sample data always shows deltas; real data hides them below the volume gate.
  const gated = !sample && data.volume_gate.current < data.volume_gate.threshold_tx_per_week;
  const range = data.periods[preset];
  // Now-cards are "in total", but their delta and trend still follow the picker.
  const ctx = chart && { metric: chart.metric, periodLabel: `Last ${presetDays[preset]} full days`, start: range.start, end: range.end, asOf: data.as_of };

  const empty = sample && !showSample;
  const allCards = [...data.cards, ...Object.values(data.optional_cards)];
  const openMetric = (metric: string) => {
    const card = allCards.find((c) => c.label === metric);
    setChart({ metric, definition: card?.definition, cardId: card?.id });
    setChartOpen(true);
  };
  const openMetricRows = (metric: string) => {
    const card = allCards.find((c) => c.label === metric);
    setChart({ metric, definition: card?.definition, cardId: card?.id });
    setRowsOpen(true);
  };
  const openChart = (c: CardData) => { setChart({ metric: c.label, definition: c.definition, cardId: c.id }); setChartOpen(true); };
  const openRows = (c: CardData) => { setChart({ metric: c.label, definition: c.definition, cardId: c.id }); setRowsOpen(true); };

  const setDone = (id: string, done = true) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)));
  const onboarding = data.onboarding && (
    <OnboardingBlock
      data={data.onboarding}
      tasks={tasks}
      onDone={(id) => setDone(id)}
      onAllDone={() => setTasks((ts) => ts.map((t) => ({ ...t, done: true })))}
      onFlow={(flow) => toast(`Would open ${flow}`)}
    />
  );

  // (+) and Rico's "Add card" share this: no duplicates, at most MAX_EXTRA.
  const addCard = (id: OptionalCardId) => {
    const label = OPTIONAL_CARDS.find((c) => c.id === id)!.label;
    if (extra.includes(id)) return toast(`${label} is already on the page`);
    if (extra.length >= MAX_EXTRA) return toast(`Up to ${MAX_EXTRA} extra cards`);
    setExtra([...extra, id]);
  };
  const labelFor = (id: string) => allCards.find((c) => c.id === id)?.label ?? id;
  // "Ask Rico why" pre-fills the chat input with the tile's sentence; the user sends it.
  const askRico = (text: string) => {
    setRicoDraft(text);
    setRicoOpen(true);
  };

  const cardFor = (c: CardData, onRemove?: () => void) => (
    <MetricCard
      key={c.id}
      card={c}
      preset={preset}
      window={c.row === "now" ? c.window : fullDaysLabel(preset, range.end)}
      notes={c.id === "active_subscriptions" ? [
        `Incl. cancelled, not yet expired: ${formatValue(data.active_subs_incl, "count")}`,
        `Excl.: ${formatValue(data.active_subs_excl, "count")}`,
      ] : undefined}
      onRemove={onRemove}
      asOf={data.as_of} gated={gated} sample={sample} empty={empty}
      onOpenChart={() => openChart(c)} onOpenRows={() => openRows(c)}
    />
  );
  const optional = data.optional_cards as Record<OptionalCardId, CardData>;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-neutral-50 font-sans text-neutral-900">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <main
            className={cn(
              "mx-auto flex w-full flex-col gap-6 pt-6 pb-24",
              // Today keeps the page as it is; Proposed gets the 1120px column with 24px sides.
              view === "today" ? "max-w-[1200px] px-4 md:px-8" : "max-w-[1120px] px-6",
            )}
          >
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {sample && (
                    <label className="flex items-center gap-2 text-xs text-neutral-600">
                      <Switch checked={showSample} onCheckedChange={setShowSample} />
                      Show sample data
                    </label>
                  )}
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
                  {/* Drives Revenue and every delta. */}
                  <Select items={PRESETS} value={preset} onValueChange={(v) => setPreset(v as Preset)}>
                    <SelectTrigger size="sm" className="w-[140px] bg-white" aria-label="Period"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESETS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </header>

            {view === "today" ? (
              <>
                {onboarding}
                <RicoBar placeholder="Ask about insights or growth opportunities for your apps" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {TODAY_ORDER.map((id) => allCards.find((c) => c.id === id)!).map((c) => (
                    <PlainCard key={c.id} card={c} zero={sample} onOpenChart={() => openChart(c)} />
                  ))}
                </div>
                <RecentTransactions rows={data.recent_transactions} collapsible={false} />
              </>
            ) : (
              <>
                {data.setup && <SetupChecklist steps={setupSteps} onOpenStep={(i) => { setSetupIndex(i); setSetupOpen(true); }} />}

                {/* Four default cards in one row; extras from "+ Add a card" go to a second row. */}
                <section aria-label="Key numbers" className="flex flex-col gap-3">
                  <div className="flex justify-end">
                    <AddCard added={extra} onAdd={addCard} />
                  </div>
                  <div className={GRID}>
                    {data.cards.map((c) => cardFor(c))}
                    {extra.map((id) => cardFor(optional[id], () => setExtra(extra.filter((x) => x !== id))))}
                  </div>
                </section>

                <WhatChanged
                      data={data}
                      cardIds={data.cards.map((c) => c.id)}
                      labelFor={labelFor}
                      onAction={(item) => {
                        if (item.action.type === "experiment") return setExperimentOpen(true);
                        if (item.action.type === "explainer") return setExplainerOpen(true);
                        openMetric(labelFor(item.card_id));
                      }}
                      onAskRico={(item) => askRico(`${labelFor(item.card_id)}: ${item.text}`)}
                    />

                <RecentTransactions rows={data.recent_transactions} collapsible />
                <DesignRules onNotOnPage={() => setNotOnPageOpen(true)} />
              </>
            )}
          </main>
        </div>
      </div>

      {/* Prototype controls: not part of the product UI. A floating dock, dark tokens via .dark. */}
      <div className="dark fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 shadow-lg shadow-neutral-900/20 md:left-[calc(50%+110px)]">
        <span className="hidden items-center gap-1.5 text-xs font-medium text-neutral-400 sm:flex"><FlaskConical className="size-3.5" /> Prototype</span>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="bg-neutral-900">
            <TabsTrigger value="today" className="dark:data-active:bg-neutral-700">Today</TabsTrigger>
            <TabsTrigger value="proposed" className="dark:data-active:bg-neutral-700">Proposed</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">State</span>
          <Select items={STATES} value={stateKey} onValueChange={(v) => setStateKey(v as StateKey)}>
            <SelectTrigger size="sm" className="w-[150px] sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATES).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "proposed" && <RicoLauncher onOpen={() => setRicoOpen(true)} />}

      <ChartModal
        ctx={ctx}
        card={allCards.find((c) => c.id === chart?.cardId) ?? null}
        preset={preset}
        open={chartOpen} onOpenChange={setChartOpen} onViewRows={() => { setChartOpen(false); setRowsOpen(true); }} />
      <RowsModal ctx={ctx} open={rowsOpen} onOpenChange={setRowsOpen} />
      <NotOnPageModal open={notOnPageOpen} onOpenChange={setNotOnPageOpen} />
      <ExplainerModal open={explainerOpen} onOpenChange={setExplainerOpen} />
      <ExperimentModal open={experimentOpen} onOpenChange={setExperimentOpen} />
      <RicoDrawer
        open={ricoOpen}
        onOpenChange={setRicoOpen}
        draft={ricoDraft}
        onDraftChange={setRicoDraft}
        onOpenChart={(metric) => { setRicoOpen(false); openMetric(metric); }}
        onOpenRows={(metric) => { setRicoOpen(false); openMetricRows(metric); }}
        onExperiment={() => { setRicoOpen(false); setExperimentOpen(true); }}
        onAddCard={(id) => { setRicoOpen(false); addCard(id); }}
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
