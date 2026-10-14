import { ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { mockRows, type RowKind } from "@/lib/rows";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dateRange, dateTimeUtc, formatMoney, formatValue } from "@/lib/format";

const STATUS = {
  Active: "bg-emerald-50 text-emerald-700",
  Trial: "bg-indigo-50 text-indigo-700",
  Cancelled: "bg-neutral-100 text-neutral-600",
} as const;

export type Ctx = { metric: string; periodLabel: string; start: string; end: string; asOf: string };

export function Context({ periodLabel, start, end, asOf }: Ctx) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-lg bg-neutral-50 p-3 text-sm">
      <dt className="text-neutral-500">Period</dt>
      <dd className="text-neutral-900">{periodLabel} · {dateRange(start, end)}</dd>
      <dt className="text-neutral-500">As of</dt>
      <dd className="text-neutral-900">{dateTimeUtc(asOf)}</dd>
    </dl>
  );
}

// The rows behind a card: ten mock rows of the right kind, with the same cutoff as the card.
export function RowsModal({
  ctx, cardId, kind, count, open, onOpenChange,
}: { ctx: Ctx | null; cardId: string; kind: RowKind; count: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const rows = ctx ? mockRows(cardId, kind, ctx.asOf) : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 gap-4 p-6 sm:max-w-3xl">
        {ctx && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{ctx.metric}</DialogTitle>
              <DialogDescription className="text-neutral-500">
                {formatValue(count, "count")} {kind} · as of {dateTimeUtc(ctx.asOf)}
              </DialogDescription>
            </DialogHeader>
            <div className="min-w-0 overflow-x-auto rounded-lg border border-neutral-200">
              <Table className="min-w-[680px] text-[13px]">
                <TableHeader>
                  <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                    {["App user ID", "Product", "Store", "Status", "Started", "Expires", "Revenue"].map((h) => (
                      <TableHead key={h} className={cn("h-9 px-3 text-xs text-neutral-500", h === "Revenue" && "text-right")}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user}>
                      <TableCell className="max-w-[170px] truncate px-3 font-mono text-xs text-neutral-600">{r.user}</TableCell>
                      <TableCell className="px-3 text-neutral-800">{r.product}</TableCell>
                      <TableCell className="px-3 text-neutral-600">{r.store}</TableCell>
                      <TableCell className="px-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS[r.status])}>{r.status}</span>
                      </TableCell>
                      <TableCell className="px-3 text-neutral-600 tabular-nums">{r.started}</TableCell>
                      <TableCell className="px-3 text-neutral-600 tabular-nums">{r.expires}</TableCell>
                      <TableCell className="px-3 text-right text-neutral-800 tabular-nums">{formatMoney(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-neutral-400">Showing {rows.length} of {formatValue(count, "count")}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => toast("Would email the export")}><Download /> Export CSV</Button>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => toast(`Would open Customers filtered to these ${kind}`)}>
                  Open in Customers <ArrowRight />
                </Button>
              </div>
            </div>
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
