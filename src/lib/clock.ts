import type { Overview } from "@/types";

// The cutoff is live: "now" in UTC at load, rounded down to the minute. Cached cards are
// 1h40 older, rounded down to the hour. Periods are full days ending yesterday (UTC).
// Only times and dates move; the mock values stay as generated.

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const t = Date.now();
export const NOW = new Date(Math.floor(t / MIN) * MIN).toISOString();
export const CACHED_AT = new Date(Math.floor((t - 100 * MIN) / HOUR) * HOUR).toISOString();

const yesterday = Math.floor(t / DAY) * DAY - DAY;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const range = (days: number) => ({ start: ymd(yesterday - (days - 1) * DAY), end: ymd(yesterday) });

export function live(data: Overview): Overview {
  const shift = Date.parse(NOW) - Date.parse(data.as_of);
  const freshness = <C extends { freshness: { kind: string } }>(c: C): C =>
    ({ ...c, freshness: { ...c.freshness, computed_at: c.freshness.kind === "cached" ? CACHED_AT : NOW } });
  return {
    ...data,
    as_of: NOW,
    period: { ...data.period, ...range(28) },
    periods: { "7d": range(7), "28d": range(28), "90d": range(90) },
    cards: data.cards.map(freshness),
    optional_cards: Object.fromEntries(Object.entries(data.optional_cards).map(([k, c]) => [k, freshness(c)])) as Overview["optional_cards"],
    // Recent transactions keep their spacing before the cutoff.
    recent_transactions: data.recent_transactions.map((r) => ({ ...r, at: new Date(Date.parse(r.at) + shift).toISOString() })),
  };
}
