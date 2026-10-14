import { useState } from "react";
import { Code2, Info, KeyRound, LayoutTemplate, Package, ShoppingCart, Smartphone, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OnboardingTask, Onboarding as OnboardingData } from "@/types";

// RevenueCat's onboarding block on an empty project, reproduced as-is: progress ring, title
// with "(2 of 6)", a carousel of open tasks, "Mark all as done" and "Show completed".
// Both views use it; Proposed only adds `onOpenTask`, which sends the title and the primary
// button to the task drawer instead of straight to the flow.

// Placeholder illustrations, one icon per task. No RevenueCat artwork.
const ICONS: Record<string, LucideIcon> = {
  products: Package, paywall: LayoutTemplate, sdk: Code2, purchase: ShoppingCart, sandbox: KeyRound, config: Smartphone,
};

function Ring({ done, total }: { done: number; total: number }) {
  const r = 8, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" className="stroke-neutral-200" />
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-600" strokeDasharray={`${(done / total) * c} ${c}`} />
    </svg>
  );
}

export function OnboardingBlock({
  data, tasks, onDone, onAllDone, onFlow, onOpenTask,
}: {
  data: OnboardingData;
  tasks: OnboardingTask[];
  onDone: (id: string) => void;
  onAllDone: () => void;
  /** Stub for every button that would leave the page: toast "Would open <flow>". */
  onFlow: (flow: string) => void;
  /** Proposed only: open the task drawer from the title and the primary button. */
  onOpenTask?: (task: OnboardingTask) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const done = tasks.filter((t) => t.done).length;
  const shown = showCompleted ? tasks : tasks.filter((t) => !t.done);

  return (
    <section aria-label="Onboarding" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2.5">
          <span className="mt-0.5"><Ring done={done} total={tasks.length} /></span>
          <div>
            <p className="text-[15px] text-neutral-900">
              <span className="font-semibold">{data.title}</span>{" "}
              <span className="text-neutral-400">({done} of {tasks.length})</span>
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">{data.subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-4 pl-7 text-sm sm:pl-0">
          <button onClick={onAllDone} disabled={done === tasks.length} className="font-medium text-indigo-600 hover:underline disabled:text-neutral-400 disabled:no-underline">
            Mark all as done
          </button>
          <button onClick={() => setShowCompleted((v) => !v)} className="font-medium text-indigo-600 hover:underline">
            {showCompleted ? "Hide completed" : "Show completed"}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">All done. Show completed to review them.</p>
      ) : (
        // Carousel from sm up: three cards per view at 1280px, snap, thin scrollbar. Stacked on a phone.
        <div className="onboarding-carousel -mx-1 flex flex-col gap-3 px-1 pb-2 sm:snap-x sm:snap-mandatory sm:flex-row sm:overflow-x-auto">
          {shown.map((t) => {
            const Icon = ICONS[t.id] ?? Package;
            const open = onOpenTask ? () => onOpenTask(t) : () => onFlow(t.primary.flow);
            return (
              <article
                key={t.id}
                className={cn(
                  "relative flex shrink-0 snap-start flex-col gap-3 rounded-[12px] border border-neutral-200 bg-white p-4 sm:w-[calc((100%-1.5rem)/3)] sm:min-w-[300px]",
                  t.done && "bg-neutral-50",
                )}
              >
                {t.info && (
                  <Tooltip>
                    <TooltipTrigger render={<button aria-label={`About ${t.title}`} />} className="absolute top-3 right-3 rounded p-0.5 text-neutral-400 hover:text-neutral-700">
                      <Info className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56">{t.info}</TooltipContent>
                  </Tooltip>
                )}
                <div className="flex items-start gap-3">
                  <div className="grid h-[120px] w-[150px] shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-400">
                    <Icon className="size-8" strokeWidth={1.5} />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 pr-5">
                    {onOpenTask && !t.done ? (
                      <button onClick={open} className="text-left text-sm font-semibold text-neutral-900 hover:text-indigo-700 hover:underline">{t.title}</button>
                    ) : (
                      <h3 className="text-sm font-semibold text-neutral-900">{t.title}</h3>
                    )}
                    {t.done && <span className="text-xs font-medium text-emerald-600">Completed</span>}
                  </div>
                </div>
                <p className="text-sm text-neutral-600">{t.description}</p>
                {!t.done && (
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={open}>{t.primary.label}</Button>
                    {t.secondary && (
                      <Button size="sm" variant="outline" onClick={() => onFlow(t.secondary!.flow)}>{t.secondary.label}</Button>
                    )}
                    <button onClick={() => onDone(t.id)} className="ml-auto text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:underline">
                      Mark as done
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
