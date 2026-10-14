import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// The cards one tap away under (+), in picker order. Keys of `optional_cards` in the JSON.
export const OPTIONAL_CARDS = [
  { id: "new_customers", label: "New customers (28d)" },
  { id: "active_customers", label: "Active customers (28d)" },
  { id: "trial_conversion", label: "Trial conversion" },
  { id: "churn", label: "Churn" },
  { id: "realized_ltv", label: "Realized LTV" },
] as const;
export type OptionalCardId = (typeof OPTIONAL_CARDS)[number]["id"];
export const MAX_EXTRA = 2;

// (+) at the end of the card row: a 32px circle on desktop and tablet, a full-width dashed
// row under the cards on a phone. Both open the same list.
export function AddCard({
  variant, added, onAdd, className,
}: { variant: "circle" | "row"; added: OptionalCardId[]; onAdd: (id: OptionalCardId) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const full = added.length >= MAX_EXTRA;

  const trigger =
    variant === "circle" ? (
      <button
        aria-label="Add a card"
        aria-disabled={full}
        className={cn(
          "grid size-8 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-400",
          full ? "cursor-not-allowed opacity-50" : "hover:border-neutral-400 hover:text-neutral-600",
        )}
      />
    ) : (
      <button
        aria-disabled={full}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-neutral-300 text-sm text-neutral-500",
          full ? "cursor-not-allowed opacity-50" : "hover:border-neutral-400 hover:text-neutral-700",
        )}
      />
    );

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={(o) => setOpen(o && !full)}>
        <Tooltip>
          <TooltipTrigger render={<PopoverTrigger render={trigger} />}>
            <Plus className="size-4" />
            {variant === "row" && (full ? "Up to 2 extra cards" : "Add a card")}
          </TooltipTrigger>
          {variant === "circle" && <TooltipContent side="left">{full ? "Up to 2 extra cards" : "Add a card (up to 2)"}</TooltipContent>}
        </Tooltip>
        <PopoverContent align="end" className="w-64 gap-0 p-1">
          {OPTIONAL_CARDS.map((c) => {
            const on = added.includes(c.id);
            return (
              <button
                key={c.id}
                disabled={on}
                onClick={() => { onAdd(c.id); setOpen(false); }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span className="flex flex-col">
                  <span className="text-sm text-neutral-900">{c.label}</span>
                  <span className="text-xs text-neutral-500">Same definition as Charts v3</span>
                </span>
                {on && <Check className="size-4 text-neutral-500" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
