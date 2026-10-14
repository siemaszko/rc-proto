import { Clock, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { dateRange, dateTimeUtc } from "@/lib/format";

type Ctx = { metric: string; periodLabel: string; start: string; end: string; asOf: string };

function Context({ periodLabel, start, end, asOf }: Ctx) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm">
      <dt className="text-neutral-500">Period</dt>
      <dd className="text-neutral-900">{periodLabel} · {dateRange(start, end)}</dd>
      <dt className="text-neutral-500">As of</dt>
      <dd className="flex flex-wrap items-center gap-2 text-neutral-900">
        {dateTimeUtc(asOf)}
        <Badge className="bg-indigo-50 text-indigo-700">carried over from Overview</Badge>
      </dd>
    </dl>
  );
}

export function ChartModal({
  ctx, definition, open, onOpenChange, onViewRows,
}: { ctx: Ctx | null; definition?: string; open: boolean; onOpenChange: (o: boolean) => void; onViewRows: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {ctx && (
          <>
            <DialogHeader>
              <DialogTitle>{ctx.metric} · Chart (stub)</DialogTitle>
              <DialogDescription>{definition ?? "Charts page would open here with the same period and cutoff."}</DialogDescription>
            </DialogHeader>
            <Context {...ctx} />
            <div className="grid h-32 place-items-center rounded-lg border border-dashed border-neutral-300 text-sm text-neutral-400">
              Chart for {ctx.metric}, {ctx.periodLabel.toLowerCase()}
            </div>
            <DialogFooter>
              <Button onClick={onViewRows} className="bg-indigo-600 text-white hover:bg-indigo-700">
                <Rows3 /> View rows (200)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RowsModal({ ctx, open, onOpenChange }: { ctx: Ctx | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {ctx && (
          <>
            <DialogHeader>
              <DialogTitle>{ctx.metric} · Rows (stub)</DialogTitle>
              <DialogDescription>The 200 customers and transactions behind this number, filtered to the same period and cutoff.</DialogDescription>
            </DialogHeader>
            <Context {...ctx} />
            <p className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock className="size-3.5" /> Rows match the card exactly because they share one cutoff.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const NOT_ON_PAGE = [
  ["New customers / Active customers", "Not daily-decision numbers for most small apps, and the slowest to refresh. One tap away under (+)."],
  ["Card swapping / custom layout", "Small devs don't configure; strong defaults work. Customization is an escape hatch for later."],
  ["Health score", "A new number nobody can check. It would add a trust problem, not solve one."],
  ["AI summary", "Rico already exists. This page's job is the 5-second glance, not a paragraph."],
  ["Needs-attention widget", "Overlaps with What changed. One capped list is enough."],
  ["Anomaly alerts", "Subscription numbers are lumpy and there's no baseline yet; it would cry wolf. Simple thresholds first."],
  ["Per-platform filter", "Most target devs ship 1-3 apps; the app selector covers it. Platform split lives in Charts."],
];

export function NotOnPageModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Not on this page, and why</DialogTitle>
          <DialogDescription>Considered and left out on purpose.</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {NOT_ON_PAGE.map(([title, why]) => (
            <li key={title} className="text-sm">
              <p className="font-medium text-neutral-900">{title}</p>
              <p className="text-neutral-600">{why}</p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

export function ExplainerModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Charts v3 definitions (stub)</DialogTitle>
          <DialogDescription>Since 6 Oct, refunds count on the refund date instead of the original purchase date.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-neutral-700">
          Revenue for 1-6 Oct was restated under the new rule. Overview, Charts, the API and the mobile app all use the same definitions.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function ExperimentModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test a new paywall (stub)</DialogTitle>
          <DialogDescription>Would open Experiments with this segment pre-selected.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
