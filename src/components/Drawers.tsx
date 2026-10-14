import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp } from "lucide-react";
import { RicoAvatar, RicoLive } from "@/components/Rico";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// One right-side drawer for Rico and for setup tasks: 420px, full width on a phone.
export function SideDrawer({
  open, onOpenChange, initialFocus, returnFocus = true, className, children,
}: { open: boolean; onOpenChange: (o: boolean) => void; initialFocus?: React.RefObject<HTMLElement | null>; returnFocus?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" initialFocus={initialFocus} finalFocus={returnFocus} className={cn("gap-0 bg-white data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]", className)}>
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
  const [messages, setMessages] = useState<Message[]>([
    { from: "rico", text: "Hi, I'm Rico. Ask me about the six numbers on this page and what changed." },
  ]);
  const [typing, setTyping] = useState(false);
  const chips = RICO_CHIPS.filter((c) => !messages.some((m) => m.from === "me" && m.text === c));
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

  // iMessage: Rico's avatar sits by the last bubble of each of its runs; that bubble gets a tail.
  const lastOfRun = (i: number) => messages[i + 1]?.from !== messages[i].from && !(typing && i === messages.length - 1 && messages[i].from === "rico");

  return (
    <SideDrawer open={open} onOpenChange={onOpenChange} initialFocus={inputRef} returnFocus={false} className="bg-neutral-100">
      {/* The white chat container, with Rico floating on its top edge. */}
      <div className="relative mx-3 mt-16 mb-3 flex min-h-0 flex-1 flex-col rounded-[20px] bg-white shadow-sm ring-1 ring-neutral-200/70">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <RicoLive size={96} thinking={typing} />
        </div>
        <div className="border-b border-neutral-100 pt-9 pb-2 text-center">
          <SheetTitle className="text-xs font-medium text-neutral-900">Rico</SheetTitle>
          <SheetDescription className="text-[11px] text-neutral-400">{typing ? "Thinking…" : "Answers about this page"}</SheetDescription>
        </div>

        <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2 pb-3" aria-live="polite">
          <p className="mb-3 text-center text-[11px] text-neutral-400"><span className="font-medium">Today</span> 19:43</p>
          {messages.map((m, i) => {
            const me = m.from === "me", tail = lastOfRun(i);
            return (
              <div key={i} className={cn("flex items-end gap-1.5", me ? "justify-end" : "justify-start", tail && "mb-2")}>
                {!me && (tail ? <RicoAvatar size={28} className="shrink-0" /> : <span className="w-7 shrink-0" />)}
                <Bubble me={me} tail={tail}>
                  {m.text}
                  {m.chart && (
                    <button onClick={() => onOpenChart(m.chart!.metric)} className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-[13px] font-medium text-[#0a84ff] hover:bg-neutral-50">
                      {m.chart.label} <ArrowRight className="size-3.5" />
                    </button>
                  )}
                </Bubble>
              </div>
            );
          })}
          {typing && (
            <div className="mb-2 flex items-end gap-1.5" aria-label="Rico is typing">
              <RicoAvatar size={28} className="shrink-0" />
              <Bubble me={false} tail>
                <span className="flex h-5 items-center gap-1">
                  {[0, 150, 300].map((d) => <span key={d} className="size-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: `${d}ms` }} />)}
                </span>
              </Bubble>
            </div>
          )}
        </div>

        {/* Suggestions sit right above the input, one per line; a sent one goes away. */}
        {chips.length > 0 && (
          <div className="flex flex-col items-end gap-1.5 px-3 pb-2">
            {chips.map((c) => (
              <button key={c} onClick={() => send(c)} className="rounded-full border border-[#0a84ff]/30 bg-white px-3 py-1.5 text-[13px] text-[#0a84ff] hover:bg-[#0a84ff]/5">
                {c}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="border-t border-neutral-100 p-3">
          <div className="flex min-w-0 items-center rounded-full border border-neutral-300 py-1 pr-1 pl-4 focus-within:border-neutral-400">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="iMessage Rico"
              aria-label="Message Rico"
              className="h-7 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <button type="submit" aria-label="Send" disabled={!draft.trim()} className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a84ff] text-white disabled:bg-neutral-300">
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </form>
      </div>
    </SideDrawer>
  );
}

// A chat bubble. The tail is a small curved notch on the bottom corner, iMessage style.
function Bubble({ me, tail, children }: { me: boolean; tail: boolean; children: React.ReactNode }) {
  const color = me ? "#0a84ff" : "#e9e9eb";
  return (
    <div className={cn("relative max-w-[78%] rounded-[18px] px-3 py-1.5 text-[15px] leading-snug", me ? "bg-[#0a84ff] text-white" : "bg-[#e9e9eb] text-neutral-900")}>
      {children}
      {tail && (
        <svg aria-hidden viewBox="0 0 12 16" className={cn("absolute bottom-0 h-4 w-3", me ? "-right-1.5" : "-left-1.5 -scale-x-100")}>
          <path d="M0 0 C0 9 3 14 12 16 C6 16.5 2 15 0 13 Z" fill={color} />
        </svg>
      )}
    </div>
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
