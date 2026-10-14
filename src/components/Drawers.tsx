import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Plus, XIcon } from "lucide-react";
import type { OptionalCardId } from "@/components/AddCard";
import type { OnboardingTask } from "@/types";
import { RicoAvatar, RicoLive } from "@/components/Rico";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// One right-side drawer for Rico and for onboarding tasks: 420px, full width on a phone.
export function SideDrawer({
  open, onOpenChange, initialFocus, returnFocus = true, showCloseButton = true, className, children,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; initialFocus?: React.RefObject<HTMLElement | null>;
  returnFocus?: boolean; showCloseButton?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" initialFocus={initialFocus} finalFocus={returnFocus} showCloseButton={showCloseButton} className={cn("gap-0 bg-white data-[side=right]:w-full data-[side=right]:sm:max-w-[420px]", className)}>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Rico ---------- */

export const RICO_CHIPS = ["Why did MRR go up?", "Is this number right?", "What should I look at today?"];

type Message = {
  from: "me" | "rico";
  text: string;
  chart?: { label: string; metric: string };
  /** A card Rico offers to put back on the page, through the same logic as (+). */
  addCard?: { label: string; id: OptionalCardId };
};

function reply(q: string): Message {
  const t = q.toLowerCase();
  if (t.includes("new customers") || t.includes("active customers"))
    return { from: "rico", text: "Those cards moved off the defaults. New customers, last 28 full days: 1,148, up 0.3%. Add it back?", addCard: { label: "Add card", id: "new_customers" } };
  if (t.includes("mrr"))
    return { from: "rico", text: "MRR is $5,120, up 6.1% vs the previous 28 days. 31 new annual subscriptions drove most of it. Open the MRR chart?", chart: { label: "Open MRR chart", metric: "MRR" } };
  if (t.includes("trial"))
    return { from: "rico", text: "Trial-to-paid conversion fell from 38% to 31% this period. Most of the drop is on Android. Want the conversion chart?", chart: { label: "Open conversion chart", metric: "Trial conversion" } };
  if (["right", "correct", "trust"].some((w) => t.includes(w)))
    return { from: "rico", text: "All numbers on this page use Charts v3 definitions and the same cutoff, 14 Oct 19:42 UTC. Customer cards are cached, as of 18:00 UTC." };
  return { from: "rico", text: "I can answer questions about the numbers on this page, what changed, and your business. Try: why did MRR go up?" };
}

export function RicoDrawer({
  open, onOpenChange, draft, onDraftChange, onOpenChart, onAddCard, ask,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; draft: string; onDraftChange: (v: string) => void;
  onOpenChart: (metric: string) => void; onAddCard: (id: OptionalCardId) => void;
  /** A question sent from elsewhere on the page ("Ask Rico why"); `n` changes on every ask. */
  ask?: { text: string; n: number } | null;
}) {
  const [messages, setMessages] = useState<Message[]>([
    { from: "rico", text: "Hi, I'm Rico. Ask me about the numbers on this page, what changed, or your business." },
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

  useEffect(() => {
    if (ask) send(ask.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.n]);

  // iMessage: Rico's avatar sits by the last bubble of each of its runs; that bubble gets a tail.
  const lastOfRun = (i: number) => messages[i + 1]?.from !== messages[i].from && !(typing && i === messages.length - 1 && messages[i].from === "rico");

  return (
    // No sheet behind the chat: the sheet is transparent and only the white chat card slides in.
    <SideDrawer
      open={open} onOpenChange={onOpenChange} initialFocus={inputRef} returnFocus={false} showCloseButton={false}
      className="bg-transparent p-2 shadow-none data-[side=right]:border-l-0 sm:p-3"
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-2xl shadow-neutral-900/20 ring-1 ring-black/5">
        <SheetClose render={<Button variant="ghost" size="icon-sm" className="absolute top-2.5 right-2.5" />}>
          <XIcon />
          <span className="sr-only">Close</span>
        </SheetClose>
        <div className="flex flex-col items-center border-b border-neutral-100 pt-3 pb-2 text-center">
          <RicoLive size={76} thinking={typing} />
          <SheetTitle className="-mt-2 text-xs font-medium text-neutral-900">Rico</SheetTitle>
          <SheetDescription className="text-[11px] text-neutral-400">{typing ? "Thinking…" : "Answers about your business"}</SheetDescription>
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
                  {m.addCard && (
                    <button onClick={() => onAddCard(m.addCard!.id)} className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-[13px] font-medium text-[#0a84ff] hover:bg-neutral-50">
                      {m.addCard.label} <Plus className="size-3.5" />
                    </button>
                  )}
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
              placeholder="Ask Rico about your business"
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

/* ---------- Onboarding tasks ---------- */

// Instructions per onboarding task id, for the Proposed view's drawer. Mock text, no real docs.
export const TASK_GUIDES: Record<string, { steps: string[]; snippet?: string }> = {
  products: { steps: ["Open the product catalog.", "Check the products imported from your store.", "Attach them to an entitlement, e.g. \"pro\".", "Group them in an offering for your paywall."] },
  paywall: { steps: ["Pick a template in the visual editor.", "Choose the offering it should sell.", "Adjust copy and colours, then publish."] },
  sdk: {
    steps: ["Add the Purchases package to your app.", "Copy the public API key for this app.", "Configure Purchases once, at app launch.", "Run the app and check the debug log for a customer ID."],
    snippet: `// Package.swift or Xcode: add purchases-ios
import RevenueCat

Purchases.configure(withAPIKey: "test_XXXXXXXX")`,
  },
  purchase: { steps: ["Present your paywall, or call purchase(package:) in code.", "Buy any product with a Test Store account.", "Find the purchase under Customers within a minute."] },
  sandbox: { steps: ["Open Sandbox access in project settings.", "Add the emails or customer IDs allowed to test.", "Save; everyone else gets a clear error on test purchases."] },
  config: { steps: ["Add an App Store or Play Store configuration.", "Upload the store credentials.", "Swap the Test Store key for the new API key before you ship."] },
};

export function TaskDrawer({
  task, index, total, open, onOpenChange, onToggleDone,
}: {
  task: OnboardingTask | null; index: number; total: number;
  open: boolean; onOpenChange: (o: boolean) => void; onToggleDone: (done: boolean) => void;
}) {
  const guide = task && TASK_GUIDES[task.id];
  return (
    <SideDrawer open={open} onOpenChange={onOpenChange}>
      {task && guide && (
        <>
          <SheetHeader className="border-b border-neutral-200 pr-12">
            <SheetTitle>{task.title}</SheetTitle>
            <SheetDescription>Setup step {index + 1} of {total}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <p className="text-sm text-neutral-600">{task.description}</p>
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-neutral-800 marker:text-neutral-400">
              {guide.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
            {guide.snippet && (
              <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 font-mono text-xs leading-relaxed text-neutral-100">{guide.snippet}</pre>
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <Checkbox checked={task.done} onCheckedChange={(c) => onToggleDone(Boolean(c))} />
              Mark as done
            </label>
          </div>
          <div className="flex gap-2 border-t border-neutral-200 p-4">
            <Button className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => toast(`Would open ${task.primary.flow}`)}>
              {task.primary.label} <ArrowRight />
            </Button>
            {task.secondary && (
              <Button variant="outline" onClick={() => toast(`Would open ${task.secondary!.flow}`)}>{task.secondary.label}</Button>
            )}
          </div>
        </>
      )}
    </SideDrawer>
  );
}
