import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OnboardingTask, Onboarding as OnboardingData } from "@/types";

// RevenueCat's onboarding block on an empty project, reproduced as-is: progress ring, title
// with "(2 of 6)", a carousel of open tasks, "Mark all as done" and "Show completed".
// Today view only: Proposed keeps its own setup checklist (SetupChecklist + SetupDrawer).

function Ring({ done, total }: { done: number; total: number }) {
  const r = 8, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 20 20" className="size-5 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" className="stroke-neutral-200" />
      <circle cx="10" cy="10" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-indigo-600" strokeDasharray={`${(done / total) * c} ${c}`} />
    </svg>
  );
}

type CardProps = { t: OnboardingTask; onDone: (id: string) => void; onFlow: (flow: string) => void };

// Today: the faithful "before". Wide cards that stretch, no illustrations, one footer row.
function TodayTaskCard({ t, onDone, onFlow }: CardProps) {
  const open = () => onFlow(t.primary.flow);
  return (
    <article
      className={cn(
        "relative flex snap-start flex-col gap-2 rounded-[12px] border border-neutral-200 bg-white p-5 sm:min-w-[440px] sm:flex-1",
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
      {/* No illustrations: RevenueCat's artwork isn't ours, and placeholders read as broken. */}
      <div className="flex min-w-0 flex-col gap-1 pr-6">
        <h3 className="text-sm font-semibold text-neutral-900">{t.title}</h3>
        {t.done && <span className="text-xs font-medium text-emerald-600">Completed</span>}
      </div>
      <p className="text-sm text-neutral-600">{t.description}</p>
      {/* One footer row pinned to the bottom, as on the real page: buttons left,
          "Mark as done" right. Lines up across the row. */}
      {!t.done && (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button size="sm" className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={open}>{t.primary.label}</Button>
          {t.secondary && (
            <Button size="sm" variant="outline" onClick={() => onFlow(t.secondary!.flow)}>{t.secondary.label}</Button>
          )}
          <button onClick={() => onDone(t.id)} className="ml-auto text-sm font-medium whitespace-nowrap text-indigo-600 hover:underline">
            Mark as done
          </button>
        </div>
      )}
    </article>
  );
}

export function OnboardingBlock({
  data, tasks, onDone, onAllDone, onFlow,
}: {
  data: OnboardingData;
  tasks: OnboardingTask[];
  onDone: (id: string) => void;
  onAllDone: () => void;
  /** Stub for every button that would leave the page: toast "Would open <flow>". */
  onFlow: (flow: string) => void;
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
        // Carousel from sm up: cards stretch to fill the row but never go under 440px, so four
        // open tasks show about two and a bit (as on the real page) and scroll. Stacked on a phone.
        <div className="onboarding-carousel -mx-1 flex flex-col gap-3 px-1 pb-2 sm:snap-x sm:snap-mandatory sm:flex-row sm:overflow-x-auto">
          {shown.map((t) => <TodayTaskCard key={t.id} t={t} onDone={onDone} onFlow={onFlow} />)}
        </div>
      )}
    </section>
  );
}
