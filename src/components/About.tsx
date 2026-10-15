import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// "About this prototype": the notes that used to sit in the page footer, now behind (i) at
// the end of the prototype bar. Not part of the product UI.

const RULES = [
  "You never have to ask if the number is right: definition, window and freshness are on the card.",
  "A number without direction is incomplete: every card shows change and trend.",
  "Every card leads somewhere: the chart, and when there's something to do, the action.",
];

const NOT_ON_PAGE = [
  ["Full custom dashboards", "small devs don't configure; strong defaults work."],
  ["Health score", "a new number nobody can check."],
  ["AI summary", "Rico already exists; this page is the 5-second glance."],
  ["Needs-attention widget", "overlaps with What changed."],
  ["Anomaly alerts", "lumpy numbers, no baseline yet; it would cry wolf."],
  ["Per-app filter", "most target devs ship 1–3 apps; the selector covers it."],
  ["New customers / Active customers", "slowest to refresh; one tap away under +."],
];

const ASSUMPTIONS = [
  ["A0", "No answers from the recruiter; I picked the segment."],
  ["A1", "Big customers read RC via API / MCP."],
  ["A2", "Mobile share unknown."],
  ["A3", "Test project empty, sparklines unseen with real data."],
  ["A4", "Only size claim: “more than 1 in 3 new subscription apps”."],
  ["A5", "Team: 3 of 6 engineers, 1 designer, 10 weeks after v3 settles."],
  ["A6", "Baseline unknown until week 1."],
  ["A7", "Idea sizes are my estimates."],
  ["A8", "Card definitions paraphrased from RC docs."],
];

function Heading({ children }: { children: string }) {
  return <h3 className="text-[11px] font-medium tracking-wide text-neutral-400 uppercase">{children}</h3>;
}

export function AboutPrototype() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={<PopoverTrigger render={<button aria-label="About this prototype" />} />}
          className="grid size-7 place-items-center rounded-md text-neutral-300 hover:bg-neutral-700 hover:text-white"
        >
          <Info className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="top">About this prototype</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="max-h-[60vh] w-[min(380px,calc(100vw-32px))] gap-4 overflow-y-auto rounded-[12px] bg-neutral-900 p-4 text-[13px] text-white ring-neutral-700"
      >
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
              <li key={title}>{title} <span className="text-neutral-400">— {why}</span></li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2">
          <Heading>Assumptions</Heading>
          <ul className="flex flex-col gap-1.5">
            {ASSUMPTIONS.map(([id, text]) => (
              <li key={id} className="flex gap-2"><span className="w-5 shrink-0 text-neutral-400 tabular-nums">{id}</span>{text}</li>
            ))}
          </ul>
        </section>
      </PopoverContent>
    </Popover>
  );
}
