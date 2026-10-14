import { dayMonth } from "@/lib/format";

// Mock rows behind a card, for the rows modal. Deterministic: seeded by the card id, so the
// same card always shows the same ten rows.

export type RowKind = "subscriptions" | "trials" | "transactions" | "customers";
export type MockRow = {
  user: string;
  product: string;
  store: "App Store" | "Play";
  status: "Active" | "Trial" | "Cancelled";
  started: string;
  expires: string;
  revenue: number;
};

const PRODUCTS = [
  { name: "Pro Monthly", price: 7.99, days: 30 },
  { name: "Pro Annual", price: 49.99, days: 365 },
];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
// "9 Jun", or "9 Jun 2027" outside the cutoff's year (annual renewals).
const date = (base: number, days: number) => {
  const d = new Date(base + days * 86400000);
  return d.getUTCFullYear() === new Date(base).getUTCFullYear() ? dayMonth(d) : `${dayMonth(d)} ${d.getUTCFullYear()}`;
};

export function mockRows(cardId: string, kind: RowKind, asOf: string, count = 10): MockRow[] {
  const r = rng(hash(cardId));
  const now = Date.parse(asOf);
  return Array.from({ length: count }, () => {
    const p = PRODUCTS[r() < 0.6 ? 0 : 1];
    const user = `$RCAnonymousID:${Math.floor(r() * 0xffffffff).toString(16).padStart(8, "0")}…`;
    const store = r() < 0.65 ? "App Store" : "Play";
    if (kind === "trials") {
      const ago = Math.floor(r() * 7);
      return { user, product: p.name, store, status: "Trial", started: date(now, -ago), expires: date(now, 7 - ago), revenue: 0 };
    }
    // Subscriptions, customers and transactions: a renewal or purchase in the current term.
    const ago = Math.floor(r() * (kind === "transactions" ? 28 : p.days));
    const status = r() < 0.18 ? "Cancelled" : "Active";
    return { user, product: p.name, store, status, started: date(now, -ago), expires: date(now, p.days - ago), revenue: p.price };
  });
}
