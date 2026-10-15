import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// "About this prototype": the notes that used to sit in the page footer, now behind (i) at
// the start of the prototype bar, in a centered dialog. Not part of the product UI.

const RULES = [
  "You never have to ask if the number is right: definition, window and freshness are on the card.",
  "A number without direction is incomplete: every card shows change and trend.",
  "Every card leads somewhere: the chart, and when there's something to do, the action.",
];

const NOT_ON_PAGE = [
  ["Full custom dashboards", "Small devs don't configure; strong defaults work."],
  ["Health score", "A new number nobody can check."],
  ["AI summary", "Rico already exists; this page is the 5-second glance."],
  ["Needs-attention widget", "Overlaps with What changed."],
  ["Anomaly alerts", "Lumpy numbers, no baseline yet; it would cry wolf."],
  ["Per-app filter", "Most target devs ship 1–3 apps; the selector covers it."],
  ["New customers / Active customers", "Slowest to refresh; one tap away under +."],
  ["Drag to rearrange cards", "Next, together with card swapping. The default order should be right without it."],
];

function Heading({ children }: { children: string }) {
  return <h3 className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">{children}</h3>;
}

export function AboutPrototype() {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={<DialogTrigger render={<button aria-label="About this prototype" />} />}
          className="grid size-7 place-items-center rounded-md text-neutral-300 hover:bg-neutral-700 hover:text-white"
        >
          <Info className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="top">About this prototype</TooltipContent>
      </Tooltip>
      <DialogContent
        className="max-h-[85vh] gap-5 overflow-y-auto rounded-[12px] bg-neutral-900 p-6 text-[13px] text-white ring-neutral-700 sm:max-w-[480px] [&_[data-slot=dialog-close]]:text-neutral-400 [&_[data-slot=dialog-close]]:hover:bg-neutral-800 [&_[data-slot=dialog-close]]:hover:text-white"
      >
        <DialogTitle className="sr-only">About this prototype</DialogTitle>
        <section className="flex flex-col gap-2">
          <Heading>Design rules</Heading>
          <ol className="flex flex-col gap-1.5">
            {RULES.map((r, i) => (
              <li key={i} className="flex gap-2"><span className="text-neutral-400 tabular-nums">{i + 1}.</span>{r}</li>
            ))}
          </ol>
        </section>
        <section className="flex flex-col gap-2">
          <Heading>Not on this page, and why</Heading>
          <ul className="flex flex-col gap-1.5">
            {NOT_ON_PAGE.map(([title, why]) => (
              <li key={title}>{title}: <span className="text-neutral-400">{why}</span></li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <Heading>Author</Heading>
          <p>
            This prototype was built with Claude Code by Lukasz Siemaszko.{" "}
            <span className="text-neutral-400">Questions:</span>{" "}
            <a href="mailto:L.Siemaszko@gmail.com" className="underline underline-offset-2 hover:text-indigo-300">L.Siemaszko@gmail.com</a>
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
