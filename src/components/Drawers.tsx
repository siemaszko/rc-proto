import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// One right-side drawer for Rico and for setup tasks: 420px, full width on a phone.
export function SideDrawer({
  open, onOpenChange, initialFocus, returnFocus = true, children,
}: { open: boolean; onOpenChange: (o: boolean) => void; initialFocus?: React.RefObject<HTMLElement | null>; returnFocus?: boolean; children: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" initialFocus={initialFocus} finalFocus={returnFocus} className="gap-0 bg-white data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]">
        {children}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Rico ---------- */

export const RICO_CHIPS = ["Why did MRR go up?", "Is this number right?", "What should I look at today?"];

type Message = { from: "me" | "rico"; text: string; chart?: { label: string; metric: string } };

function reply(q: string): Message {
  const t = q.toLowerCase();
  if (t.includes("mrr"))
    return { from: "rico", text: "MRR is $5,120, up 6.1% vs the previous 28 days. 31 new annual subscriptions drove most of it. Open the MRR chart?", chart: { label: "Open MRR chart", metric: "MRR" } };
  if (t.includes("trial"))
    return { from: "rico", text: "Trial-to-paid conversion fell from 38% to 31% this period. Most of the drop is on Android. Want the conversion chart?", chart: { label: "Open conversion chart", metric: "Trial conversion" } };
  if (["right", "correct", "trust"].some((w) => t.includes(w)))
    return { from: "rico", text: "All numbers on this page use Charts v3 definitions and the same cutoff, 14 Oct 19:42 UTC. Customer cards are cached, as of 18:00 UTC." };
  return { from: "rico", text: "I can answer questions about the six numbers on this page and what changed. Try: why did MRR go up?" };
}

export function RicoDrawer({
  open, onOpenChange, draft, onDraftChange, onOpenChart,
}: { open: boolean; onOpenChange: (o: boolean) => void; draft: string; onDraftChange: (v: string) => void; onOpenChart: (metric: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [messages, typing]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { from: "me", text: q }]);
    onDraftChange("");
    setTyping(true);
    timers.current.push(window.setTimeout(() => { setMessages((m) => [...m, reply(q)]); setTyping(false); }, 600));
  };

  return (
    // Focus must not return to the page input on close: focusing it opens the drawer again.
    <SideDrawer open={open} onOpenChange={onOpenChange} initialFocus={inputRef} returnFocus={false}>
      <SheetHeader className="gap-3 border-b border-neutral-200 pr-12">
        <SheetTitle className="flex items-center gap-2"><Sparkles className="size-4 text-indigo-600" /> Rico</SheetTitle>
        <SheetDescription className="sr-only">Ask about the numbers on this page.</SheetDescription>
        <div className="flex flex-wrap gap-2">
          {RICO_CHIPS.map((c) => (
            <button key={c} onClick={() => send(c)} className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50">
              {c}
            </button>
          ))}
        </div>
      </SheetHeader>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {!messages.length && !typing && (
          <p className="text-sm text-neutral-400">Ask about the six numbers on this page and what changed.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex max-w-[85%] flex-col gap-2 rounded-2xl px-3 py-2 text-sm", m.from === "me" ? "self-end bg-indigo-600 text-white" : "self-start bg-neutral-100 text-neutral-800")}>
            {m.text}
            {m.chart && (
              <Button size="sm" variant="outline" className="self-start bg-white" onClick={() => onOpenChart(m.chart!.metric)}>
                {m.chart.label} <ArrowRight />
              </Button>
            )}
          </div>
        ))}
        {typing && <p className="self-start text-xs text-neutral-400">Rico is typing…</p>}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="flex items-center gap-2 border-t border-neutral-200 p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Ask Rico about this page"
          aria-label="Message Rico"
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-indigo-300"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={!draft.trim()} className="bg-indigo-600 text-white hover:bg-indigo-700">
          <ArrowUp />
        </Button>
      </form>
    </SideDrawer>
  );
}

/* ---------- Setup tasks ---------- */

type Guide = { flow: string; steps: string[]; snippet?: string };

// Keyed by the step label in new_project.json. Mock text, no real docs.
export const SETUP_GUIDES: Record<string, Guide> = {
  "Create a project": {
    flow: "Project settings",
    steps: ["Name the project after your app or company.", "Invite anyone who should see revenue.", "Pick the currency your reports use."],
  },
  "Add your app": {
    flow: "App settings",
    steps: ["Choose the store: App Store, Play Store, or web.", "Enter the bundle ID exactly as in the store.", "Upload the store credentials so purchases can be validated."],
  },
  "Install the SDK and configure Purchases": {
    flow: "API keys",
    steps: ["Add the Purchases package to your app.", "Copy the public API key for this app.", "Configure Purchases once, at app launch.", "Run the app and check the debug log for a customer ID."],
    snippet: `// Package.swift or Xcode: add purchases-ios
import RevenueCat

Purchases.configure(withAPIKey: "appl_XXXXXXXX")`,
  },
  "Add products and an entitlement": {
    flow: "Product catalog",
    steps: ["Import the products you created in the store.", "Create an entitlement, e.g. \"pro\".", "Attach every product that unlocks it.", "Group them in an offering for your paywall."],
  },
  "Make a sandbox purchase": {
    flow: "Sandbox testing",
    steps: ["Sign in with a sandbox tester on a device.", "Buy any product from your paywall.", "Find the purchase in Customers within a minute."],
  },
  "Connect App Store Server Notifications": {
    flow: "Integrations",
    steps: ["Copy the notification URL for this app.", "Paste it in App Store Connect under App Information.", "Send a test notification and wait for the green check."],
  },
};

export function SetupDrawer({
  step, index, total, open, onOpenChange, onToggleDone,
}: { step: { label: string; done: boolean } | null; index: number; total: number; open: boolean; onOpenChange: (o: boolean) => void; onToggleDone: (done: boolean) => void }) {
  const guide = step && SETUP_GUIDES[step.label];
  return (
    <SideDrawer open={open} onOpenChange={onOpenChange}>
      {step && guide && (
        <>
          <SheetHeader className="border-b border-neutral-200 pr-12">
            <SheetTitle>{step.label}</SheetTitle>
            <SheetDescription>Setup step {index + 1} of {total}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-neutral-800 marker:text-neutral-400">
              {guide.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            {guide.snippet && (
              <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-xs leading-relaxed text-neutral-100">{guide.snippet}</pre>
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <Checkbox checked={step.done} onCheckedChange={(c) => onToggleDone(Boolean(c))} />
              Mark done
            </label>
          </div>
          <div className="border-t border-neutral-200 p-4">
            <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => toast(`Would open ${guide.flow}`)}>
              Open {guide.flow} <ArrowRight />
            </Button>
          </div>
        </>
      )}
    </SideDrawer>
  );
}
