# rc-proto: Overview redesign prototype

Clickable prototype of a redesigned analytics Overview page for a subscription-app
dashboard, for a solo developer with 1-3 apps. Four beats on one screen: see the number,
see it moved, see why (and trust it), click through to act.

Live: https://rc-proto.netlify.app · Spec: `rc-home-test/prd/prd-prototype.md`

## Run

```sh
npm install
npm run dev                 # http://localhost:5173
npm run build               # static build into dist/ (what Netlify serves)
node scripts/gen-data.mjs   # regenerate the mock JSON (fixed seeds, deterministic)
npm run screenshots         # 5 PRD screenshots into screenshots/ (needs dev server + Chrome)
```

Push to `main` deploys to Netlify.

## What's in it

- **Prototype bar** (dashed, above the page): Today / Proposed tabs and the State select
  (Normal, Below volume gate, New project). State only swaps the JSON file.
- **Proposed**: header with app selector and one "Data as of" cutoff; **Now** row
  (Active subscriptions, Active trials, MRR); **period** row (Revenue, New customers,
  Active customers) with the 7d / 28d / 90d picker; **What changed** strip (max 3, tagged
  Business or Definition / data); Rico bar with 3 page-scoped prompts; Recent transactions
  (collapsed); footer with the 3 design rules and "Not on this page, and why".
- **Card**: label, (i) definition popover, big number, delta vs previous period,
  28-point sparkline in the delta color, window and freshness line, Open chart / View rows.
  Clicking anywhere on the card opens the chart.
- **Today**: the "before": Rico bar, 6 plain cards, recent transactions table.

Stack: Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui on **Base UI** primitives
(`base-nova` style), lucide-react, inline SVG sparklines. Mock data in `src/data/*.json`.

## Stubbed

- Chart modal and rows modal (they show metric, period, and the carried-over "as of"
  cutoff, no real chart or rows). "Full definition", "Read the explainer" (small stub
  modal), setup checklist link, sidebar nav, Rico input and prompt chips do nothing.
- "All apps" in the app selector is disabled with a "Next" tooltip.
- No backend. The old Netlify Function (`/api/overview`) and its Netlify Database
  migrations from v0.0.1 are still deployed but the page no longer uses them.

## Decisions where the PRD was ambiguous (picked the simpler option)

- **Repo had no framework** (plain HTML + one Netlify Function), so "keep its framework"
  wasn't possible with shadcn. Added Vite + React to the same repo and kept the Netlify
  site, config and functions; `netlify.toml` now builds `dist/`.
- **Period picker** sits on the right of the period row (per the build brief), not in the
  header. It also drives the Now row's delta and sparkline ("vs prev 7d/28d/90d"), since a
  delta needs a comparison window. Each card carries `by_period` values for 7d/28d/90d;
  top-level fields are the 28d values, matching PRD section 8.
- **Period dates**: 28 days inclusive, 17 Sep – 14 Oct (PRD example said 16 Sep).
- **New project**: shows sample values with deltas and sparklines (as the PRD's state
  table says), watermark + "Sample" badge, and the checklist links the first *incomplete*
  step.
- **Below volume gate**: deltas and sparklines hidden with "Not enough data yet"; Rico
  prompt chips hidden too, because they reference What changed items that don't exist.
- **"Business" tag** is indigo (the page's one accent) rather than a separate blue.
- **Dialog backdrop blur removed** so the What changed strip stays readable behind the
  chart modal in screenshot 4.

## Cut, and why

- Real charts, routing, auth, animations, tests: out of scope per PRD section 10.
- The "late refunds may adjust up to 7 days" caveat is a tooltip on Revenue's "as of"
  only, not a separate line, to keep cards the same height.
- Mobile nav is a top bar with a non-functional menu button; the phone pass only makes
  the page stack cleanly (1 column, no horizontal scroll).
