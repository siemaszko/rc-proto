// Generates src/data/{normal,low_volume,new_project}.json. Deterministic (fixed seeds).
// Run: node scripts/gen-data.mjs
import { writeFileSync } from "node:fs";

const AS_OF = "2026-10-14T19:42:00Z";
const CACHED_AT = "2026-10-14T18:00:00Z";
// Flow periods are full days: the last one is the day before the cutoff.
const END = new Date("2026-10-13T00:00:00Z");
const DAYS = 200;
const AVG_TX = 4.716; // average revenue per transaction, USD
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
const downsample = (a, n = 28) => (a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.round((i * (a.length - 1)) / (n - 1))]));

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
  trial_conversion: "Share of trials that ended in the period and converted to paid.",
  churn: "Share of paid subscriptions active at the start of the period that expired during it.",
  realized_ltv: "Revenue per paying customer to date, net of refunds, for customers who started in the last 12 months.",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const through = () => `${END.getUTCDate()} ${MONTHS[END.getUTCMonth()]}`;
const fullDays = (n) => `Last ${n} full days · through ${through()}`;

function buildCards(s, rates) {
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

  // Every period carries the previous period too: `prev_value` (the level at the period's start
  // for now-cards, the previous total for period cards) and `sparkline_prev`, both cut from the
  // same series, so the chart's dashed line always agrees with the card's delta.
  const now = (series) => Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const w = series.slice(DAYS - n - 1), pw = series.slice(DAYS - 2 * n - 1, DAYS - n);
    return [k, { value: w.at(-1), delta_pct: pct(w.at(-1), w[0]), prev_value: w[0], sparkline: downsample(w.slice(1)), sparkline_prev: downsample(pw.slice(1)) }];
  }));
  const flow = (series) => Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const cur = series.slice(DAYS - n), prev = series.slice(DAYS - 2 * n, DAYS - n);
    const round = (x) => Math.round(x * 100) / 100;
    return [k, { value: round(sum(cur)), delta_pct: pct(sum(cur), sum(prev)), prev_value: round(sum(prev)), sparkline: downsample(cur), sparkline_prev: downsample(prev) }];
  }));
  // Active customers in a window ≈ active at the end + those who churned during it.
  const activeCustomers = Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const at = (i) => s.subs[i] + s.trials[i];
    const val = (from, to) => at(to) + Math.round(sum(s.churned.slice(from + 1, to + 1)));
    const cur = val(DAYS - n - 1, DAYS - 1), prev = val(DAYS - 2 * n - 1, DAYS - n - 1);
    const spark = s.subs.slice(DAYS - n).map((_, j) => at(DAYS - n + j));
    const sparkPrev = s.subs.slice(DAYS - 2 * n, DAYS - n).map((_, j) => at(DAYS - 2 * n + j));
    return [k, { value: cur, delta_pct: pct(cur, prev), prev_value: prev, sparkline: downsample(spark), sparkline_prev: downsample(sparkPrev) }];
  }));

  // A rate per preset: its value now, its value one window earlier, and a 30-point walk between.
  const rate = (seed, [now28, prev28, spread], decimals) => Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => {
    const r = rng(seed + n);
    const k1 = n / 28, round = (x) => Math.round(x * 10 ** decimals) / 10 ** decimals;
    const now = round(now28 + (r() - 0.5) * spread * (k1 - 1) * 0.5), prev = round(prev28 + (now - now28));
    const spark = Array.from({ length: 28 }, (_, i) => round(prev + ((now - prev) * i) / 27 + (r() - 0.5) * spread));
    spark[27] = now;
    const sparkPrev = Array.from({ length: 28 }, () => round(prev + (r() - 0.5) * spread));
    sparkPrev[27] = prev;
    return [k, { value: now, delta_pct: pct(now, prev), prev_value: prev, sparkline: spark, sparkline_prev: sparkPrev }];
  }));

  // Revenue's rows are transactions: a count for "See the 1,203 transactions behind this number".
  const withTransactions = (byPeriod) => Object.fromEntries(Object.entries(byPeriod).map(([k, v]) => [k, { ...v, transactions: Math.round(v.value / AVG_TX) }]));

  // The four default cards, in the order they show.
  const cards = [
    card("mrr", "now", "MRR", "USD", "In total, now", realtime, now(s.mrr)),
    card("active_subscriptions", "now", "Active subscriptions", "count", "In total, now", realtime, now(s.subs)),
    card("active_trials", "now", "Active trials", "count", "In total, now", realtime, now(s.trials)),
    card("revenue", "period", "Revenue", "USD", fullDays(28), { ...realtime, caveat: "Late refunds may adjust up to 7 days." }, withTransactions(flow(s.revenue))),
  ];
  // Cards one tap away under (+). Same shape as `cards`.
  const optional_cards = {
    new_customers: card("new_customers", "period", "New customers", "count", fullDays(28), cached, flow(s.newCustomers)),
    active_customers: card("active_customers", "period", "Active customers", "count", fullDays(28), cached, activeCustomers),
    trial_conversion: card("trial_conversion", "period", "Trial conversion", "percent", fullDays(28), cached, rate(11, rates.conversion, 0)),
    churn: card("churn", "period", "Churn", "percent", fullDays(28), cached, rate(23, rates.churn, 1)),
    realized_ltv: card("realized_ltv", "period", "Realized LTV", "USD", fullDays(28), cached, rate(37, rates.ltv, 0)),
  };
  return { cards, optional_cards };
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

function file(state, s, rates, subsSplit, extra) {
  return {
    as_of: AS_OF,
    period: { preset: "28d", ...periodRange(28) },
    periods: Object.fromEntries(Object.entries(PRESETS).map(([k, n]) => [k, periodRange(n)])),
    state,
    app: { id: "app_dayflow", name: "Dayflow", platform: "iOS" },
    ...buildCards(s, rates),
    // Active subscriptions with and without cancelled-but-not-expired, for its (i) popover.
    active_subs_incl: subsSplit[0],
    active_subs_excl: subsSplit[1],
    ...extra,
  };
}

// rates: [value now, value one window earlier, noise] for trial conversion %, churn %, LTV $.
const normal = file("normal", scenario(42, {
  subs: [389, 412, 6], trials: [68, 61, 4], mrr: [4826, 5120, 60],
  revenue: { mean: 205, trend: 0.25, noise: 0.5, weekly: 0.12 },
  newCustomers: { mean: 41, trend: 0.2, noise: 0.5, weekly: 0.15 },
  churned: { mean: 1.6, trend: 0, noise: 0.8, weekly: 0 },
}), { conversion: [31, 38, 3], churn: [4.2, 3.9, 0.6], ltv: [38, 36, 2] }, [412, 388], {
  // One item per default card, in card order. action.type: "chart" opens the chart modal for
  // that card, "experiment" and "explainer" open stubs. Text stays under 60 characters.
  what_changed: [
    { card_id: "mrr", direction: "up", text: "Up 6.1%, 31 new annual subs", kind: "business", action: { label: "Open chart", type: "chart" } },
    { card_id: "active_subscriptions", direction: "flat", text: "Flat. 12 cancellations, 14 new", kind: "business", action: { label: "Open chart", type: "chart" } },
    { card_id: "active_trials", direction: "down", text: "Down 10%. Trial-to-paid 38% → 31%", kind: "business", action: { label: "Test a new paywall", type: "experiment" } },
    { card_id: "revenue", direction: "info", text: "Restated 1–6 Oct, v3 definitions", kind: "definition", action: { label: "Read explainer", type: "explainer" } },
  ],
  volume_gate: { threshold_tx_per_week: 10, current: 84 },
  recent_transactions: transactions(42, 10, PRODUCTS),
});

const lowVolume = file("low_volume", scenario(7, {
  subs: [13, 14, 1], trials: [2, 2, 1], mrr: [131, 142, 4],
  revenue: { mean: 4.6, trend: 0.1, noise: 1.6, weekly: 0 },
  newCustomers: { mean: 3, trend: 0.1, noise: 1.2, weekly: 0 },
  churned: { mean: 0.1, trend: 0, noise: 1, weekly: 0 },
}), { conversion: [33, 40, 12], churn: [7.1, 6.5, 3], ltv: [24, 22, 4] }, [14, 13], {
  what_changed: [],
  volume_gate: { threshold_tx_per_week: 10, current: 4 },
  recent_transactions: transactions(7, 4, PRODUCTS),
});

const newProject = file("new_project", scenario(1234, {
  subs: [240, 256, 5], trials: [41, 44, 3], mrr: [2960, 3110, 40],
  revenue: { mean: 118, trend: 0.2, noise: 0.5, weekly: 0.1 },
  newCustomers: { mean: 26, trend: 0.2, noise: 0.5, weekly: 0.15 },
  churned: { mean: 1, trend: 0, noise: 0.8, weekly: 0 },
}), { conversion: [35, 33, 3], churn: [3.8, 4.1, 0.6], ltv: [41, 39, 2] }, [256, 241], {
  sample: true,
  what_changed: [],
  volume_gate: { threshold_tx_per_week: 10, current: 0 },
  recent_transactions: [],
  // Proposed: the round 2 setup checklist (opens the task drawer).
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
  // Today: RevenueCat's onboarding block on an empty project, as seen on 14 Oct.
  // primary / secondary: { label, flow } where flow names what the stub toast would open.
  onboarding: {
    title: "Let's get you ready to start using RevenueCat.",
    subtitle: "There are a few more things required before you can start selling inside your app.",
    tasks: [
      { id: "products", title: "Set up products", done: true,
        description: "Review your app's products configuration, or customize products, entitlements, and offerings as needed.",
        primary: { label: "Open product catalog", flow: "Product catalog" }, secondary: null, info: null },
      { id: "paywall", title: "Create your first paywall", done: true,
        description: "Set up a paywall to start selling in your app. Use RevenueCat's visual editor to design a paywall, or build your own using our docs.",
        primary: { label: "New paywall", flow: "Paywall editor" }, secondary: { label: "Code it", flow: "Paywall docs" }, info: null },
      { id: "sdk", title: "Integrate the SDK", done: false,
        description: "Add RevenueCat to your app. Copy your API key, use the sample code, or set up with AI prompts.",
        primary: { label: "Install SDK", flow: "SDK installation" }, secondary: null, info: "Supports iOS, Android, Flutter, React Native, Unity and web." },
      { id: "purchase", title: "Make your first purchase", done: false,
        description: "Test your setup by making a purchase in your app. Tap the purchase button on your Paywall or trigger a purchase directly in code.",
        primary: { label: "Present a Paywall", flow: "Paywall presentation guide" }, secondary: { label: "Purchase in code", flow: "Purchase code sample" }, info: null },
      { id: "sandbox", title: "Secure your sandbox access", done: false,
        description: "Test Store purchases run in a sandbox. The sandbox allow list lets you control who can make test purchases and helps keep entitlements and in-app currencies secure.",
        primary: { label: "Configure sandbox access", flow: "Sandbox access" }, secondary: null, info: "Only people on the allow list can make test purchases." },
      { id: "config", title: "Create a real app configuration", done: false,
        description: "Your app is connected to the Test Store. Before uploading, add a real App Store or Play Store configuration and use its API key in production so RevenueCat can process live purchases.",
        primary: { label: "Add configuration", flow: "App configuration" }, secondary: { label: "Learn more", flow: "Store configuration docs" }, info: null },
    ],
  },
});

for (const [name, data] of Object.entries({ normal, low_volume: lowVolume, new_project: newProject })) {
  writeFileSync(new URL(`../src/data/${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + "\n");
}
const o = normal.optional_cards;
console.log("MRR", normal.cards[0].value, normal.cards[0].delta_pct, "| subs", normal.cards[1].value, "| trials", normal.cards[2].value, "| revenue", normal.cards[3].value, normal.cards[3].delta_pct, normal.period,
  "| new", o.new_customers.value, o.new_customers.delta_pct, "| active cust", o.active_customers.value, "| conv", o.trial_conversion.value, "| churn", o.churn.value, "| ltv", o.realized_ltv.value);
