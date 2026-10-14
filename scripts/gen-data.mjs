// Generates src/data/{normal,low_volume,new_project}.json. Deterministic (fixed seeds).
// Run: node scripts/gen-data.mjs
import { writeFileSync } from "node:fs";

const AS_OF = "2026-10-14T19:42:00Z";
const CACHED_AT = "2026-10-14T18:00:00Z";
const END = new Date("2026-10-14T00:00:00Z");
const DAYS = 200;
const PRESETS = { "7d": 7, "28d": 28, "90d": 90 };

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const day = (i) => new Date(END.getTime() - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);

// A noisy walk bent so it hits `end` today and `ref` 28 days ago, which keeps the
// headline numbers (and the "What changed" copy) exact.
function stateSeries(rand, { ref, end, noise, round = true }) {
  const raw = [];
  let v = 0;
  for (let i = 0; i < DAYS; i++) { v += (rand() - 0.5) * noise; raw.push(v); }
  const iRef = DAYS - 29, iEnd = DAYS - 1;
  const slope = (end - ref) / 28;
  const base = (i) => ref + slope * (i - iRef);
  const a = raw[iRef], b = raw[iEnd];
  return raw.map((r, i) => {
    const corr = a + ((b - a) * (i - iRef)) / (iEnd - iRef);
    const x = Math.max(0, base(i) + (r - corr));
    return round ? Math.round(x) : Math.round(x * 100) / 100;
  });
}

function flowSeries(rand, { mean, trend, noise, weekly }) {
  return Array.from({ length: DAYS }, (_, i) => {
    const t = mean * (1 + trend * (i - DAYS) / DAYS);
    const w = 1 + weekly * Math.sin((2 * Math.PI * i) / 7);
    return Math.max(0, Math.round(t * w * (1 + (rand() - 0.5) * noise)));
  });
}

const sum = (a) => a.reduce((s, x) => s + x, 0);
const pct = (now, prev) => (prev ? Math.round(((now - prev) / prev) * 1000) / 10 : 0);
const downsample = (a, n = 30) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.round((i * (a.length - 1)) / (n - 1))]));

function periodRange(n) {
  return { start: day(DAYS - n), end: day(DAYS - 1) };
}

const DEFS = {
  active_subscriptions: "Paid subscriptions that are currently active, excluding trials. Cancelled-but-not-expired are included until expiry.",
  active_trials: "Trials currently in their trial period, not yet converted or expired.",
  mrr: "Monthly recurring revenue from active paid subscriptions, normalized to one month, in USD.",
  revenue: "Gross revenue from all transactions in the period, refunds on refund date.",
  new_customers: "Customers first seen in the period.",
  active_customers: "Customers with at least one active entitlement at any point in the period.",
};

function buildCards(s) {
  const card = (id, row, label, unit, window, freshness, byPeriod) => ({
    id, row, label, unit, window,
    ...byPeriod["28d"],
    delta_vs: "previous 28 days",
    by_period: byPeriod,
    freshness,
    definition: DEFS[id],
    definition_version: "charts_v3",
    links: { chart: `/charts/${id}?period=28d&as_of=${AS_OF}`, rows: `/customers?metric=${id}&period=28d&as_of=${AS_OF}` },
  });
  const realtime = { kind: "realtime", computed_at: AS_OF };
  const cached = { kind: "cached", computed_at: CACHED_AT };

  const now = (series) => Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const w = series.slice(DAYS - n - 1);
    return [k, { value: w.at(-1), delta_pct: pct(w.at(-1), w[0]), sparkline: downsample(w.slice(1)) }];
  }));
  const flow = (series) => Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const cur = series.slice(DAYS - n), prev = series.slice(DAYS - 2 * n, DAYS - n);
    return [k, { value: Math.round(sum(cur) * 100) / 100, delta_pct: pct(sum(cur), sum(prev)), sparkline: downsample(cur) }];
  }));
  // Active customers in a window ≈ active at the end + those who churned during it.
  const activeCustomers = Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const at = (i) => s.subs[i] + s.trials[i];
    const val = (from, to) => at(to) + Math.round(sum(s.churned.slice(from + 1, to + 1)));
    const cur = val(DAYS - n - 1, DAYS - 1), prev = val(DAYS - 2 * n - 1, DAYS - n - 1);
    const spark = s.subs.slice(DAYS - n).map((_, j) => at(DAYS - n + j));
    return [k, { value: cur, delta_pct: pct(cur, prev), sparkline: downsample(spark) }];
  }));

  return [
    card("active_subscriptions", "now", "Active subscriptions", "count", "In total, now", realtime, now(s.subs)),
    card("active_trials", "now", "Active trials", "count", "In total, now", realtime, now(s.trials)),
    card("mrr", "now", "MRR", "USD", "In total, now", realtime, now(s.mrr)),
    card("revenue", "period", "Revenue", "USD", "Last 28 days", { ...realtime, caveat: "Late refunds may adjust up to 7 days." }, flow(s.revenue)),
    card("new_customers", "period", "New customers", "count", "Last 28 days", cached, flow(s.newCustomers)),
    card("active_customers", "period", "Active customers", "count", "Last 28 days", cached, activeCustomers),
  ];
}

function scenario(seed, p) {
  const r = rng(seed);
  return {
    subs: stateSeries(r, { ref: p.subs[0], end: p.subs[1], noise: p.subs[2] }),
    trials: stateSeries(r, { ref: p.trials[0], end: p.trials[1], noise: p.trials[2] }),
    mrr: stateSeries(r, { ref: p.mrr[0], end: p.mrr[1], noise: p.mrr[2] }),
    revenue: flowSeries(r, p.revenue).map((x) => x / 1),
    newCustomers: flowSeries(r, p.newCustomers),
    churned: flowSeries(r, p.churned),
  };
}

function transactions(seed, count, products) {
  const r = rng(seed);
  const countries = ["US", "US", "GB", "DE", "PL", "BR", "JP", "CA", "FR"];
  const kinds = ["Renewal", "Renewal", "Renewal", "New subscription", "Trial started", "Trial converted", "Refund"];
  let t = new Date(AS_OF).getTime();
  return Array.from({ length: count }, (_, i) => {
    t -= Math.round((8 + r() * 50) * 60000);
    const product = products[Math.floor(r() * products.length)];
    const kind = kinds[Math.floor(r() * kinds.length)];
    const amount = kind === "Trial started" ? 0 : kind === "Refund" ? -product.price : product.price;
    return {
      id: `tx_${(seed * 7919 + i * 104729).toString(36)}`,
      customer: `$RCAnonymousID:${Math.floor(r() * 0xffffffff).toString(16).padStart(8, "0")}`,
      product: product.name, kind, country: countries[Math.floor(r() * countries.length)],
      amount_usd: amount, at: new Date(t).toISOString(),
    };
  });
}

const PRODUCTS = [
  { name: "Pro Monthly", price: 7.99 },
  { name: "Pro Annual", price: 49.99 },
];

function file(state, s, extra) {
  return {
    as_of: AS_OF,
    period: { preset: "28d", ...periodRange(28) },
    periods: Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => [k, periodRange(n)])),
    state,
    app: { id: "app_dayflow", name: "Dayflow", platform: "iOS" },
    cards: buildCards(s),
    ...extra,
  };
}

const normal = file("normal", scenario(42, {
  subs: [389, 412, 6], trials: [68, 61, 4], mrr: [4826, 5120, 60],
  revenue: { mean: 205, trend: 0.25, noise: 0.5, weekly: 0.12 },
  newCustomers: { mean: 41, trend: 0.2, noise: 0.5, weekly: 0.15 },
  churned: { mean: 1.6, trend: 0, noise: 0.8, weekly: 0 },
}), {
  what_changed: [
    { kind: "business", icon: "up", text: "MRR up 6.1% vs previous 28 days, driven by 31 new annual subscriptions.", link: { label: "Open MRR chart", metric: "MRR" } },
    { kind: "business", icon: "down", text: "Trial-to-paid conversion down from 38% to 31% this period.", link: { label: "Open conversion chart", metric: "Trial conversion" } },
    { kind: "definition", icon: "book", text: "Charts v3 definitions since 6 Oct: refunds now count on refund date. Revenue for 1-6 Oct restated.", link: { label: "Read the explainer", metric: null } },
  ],
  volume_gate: { threshold_tx_per_week: 10, current: 84 },
  recent_transactions: transactions(42, 10, PRODUCTS),
});

const lowVolume = file("low_volume", scenario(7, {
  subs: [13, 14, 1], trials: [2, 2, 1], mrr: [131, 142, 4],
  revenue: { mean: 4.6, trend: 0.1, noise: 1.6, weekly: 0 },
  newCustomers: { mean: 3, trend: 0.1, noise: 1.2, weekly: 0 },
  churned: { mean: 0.1, trend: 0, noise: 1, weekly: 0 },
}), {
  what_changed: [],
  volume_gate: { threshold_tx_per_week: 10, current: 4 },
  recent_transactions: transactions(7, 4, PRODUCTS),
});

const newProject = file("new_project", scenario(1234, {
  subs: [240, 256, 5], trials: [41, 44, 3], mrr: [2960, 3110, 40],
  revenue: { mean: 118, trend: 0.2, noise: 0.5, weekly: 0.1 },
  newCustomers: { mean: 26, trend: 0.2, noise: 0.5, weekly: 0.15 },
  churned: { mean: 1, trend: 0, noise: 0.8, weekly: 0 },
}), {
  sample: true,
  what_changed: [],
  volume_gate: { threshold_tx_per_week: 10, current: 0 },
  recent_transactions: [],
  setup: {
    done: 2,
    steps: [
      { label: "Create a project", done: true },
      { label: "Add your app", done: true },
      { label: "Install the SDK and configure Purchases", done: false },
      { label: "Add products and an entitlement", done: false },
      { label: "Make a sandbox purchase", done: false },
      { label: "Connect App Store Server Notifications", done: false },
    ],
  },
});

for (const [name, data] of Object.entries({ normal, low_volume: lowVolume, new_project: newProject })) {
  writeFileSync(new URL(`../src/data/${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");
}
console.log("MRR", normal.cards[2].value, normal.cards[2].delta_pct, "| subs", normal.cards[0].value, "| trials", normal.cards[1].value, "| revenue", normal.cards[3].value, normal.cards[3].delta_pct, "| new", normal.cards[4].value, "| active cust", normal.cards[5].value);
