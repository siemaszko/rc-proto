import type { Preset } from "@/types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const count = new Intl.NumberFormat("en-US");

export const formatValue = (value: number, unit: string) =>
  unit === "USD" ? usd.format(value) : unit === "percent" ? `${value}%` : count.format(value);
export const formatMoney = (value: number) => usdCents.format(value);


export const presetDays: Record<Preset, number> = { "7d": 7, "28d": 28, "90d": 90 };
export const periodLabel = (p: Preset) => `Last ${presetDays[p]} days`;

// "19:42 UTC"
export const timeUtc = (iso: string) => `${iso.slice(11, 16)} UTC`;

// "14 Oct, 19:42 UTC"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dayMonth = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export const dateTimeUtc = (iso: string) => `${dayMonth(new Date(iso))}, ${timeUtc(iso)}`;

// "16 Sep – 14 Oct"
export const dateRange = (start: string, end: string) =>
  `${dayMonth(new Date(start + "T00:00:00Z"))} – ${dayMonth(new Date(end + "T00:00:00Z"))}`;

// "Last 28 full days · through 13 Oct"
export const fullDaysLabel = (p: Preset, end: string) => `Last ${presetDays[p]} full days · through ${dayMonth(new Date(end + "T00:00:00Z"))}`;
