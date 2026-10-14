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
npm run screenshots         # screenshots 01-13 into screenshots/, plus click-through checks (needs dev server + Chrome)
```

Push to `main` deploys to Netlify.

## What's in it

- **Prototype dock** (dark, floating at the bottom): Today / Proposed tabs and the State
  select (Normal, Below volume gate, New project). State only swaps the JSON file.
- **Proposed** (round 6 layout): header with app selector, the one "Data as of" cutoff and
  the 7d / 28d / 90d picker (it drives Revenue and every delta). One row of four cards:
  MRR, Active subscriptions, Active trials, Revenue (4 columns, 2x2 on a tablet, 1 on a
  phone), each carrying its own window ("In total, now" / "Last 28 full days · through
  13 Oct"). **(+)** at the row's end (a dashed "Add a card" row on a phone) adds up to two of
  New customers, Active customers, Trial conversion, Churn, Realized LTV, each removable,
  in memory only. **What changed** as two tiles (tag, sentence, "Ask Rico why" and the
  action), the rest behind "1 more"; below the volume gate one muted tile. Recent
  transactions (collapsed); footer with the 3 design rules and "Not on this page, and why".
- **Rico mascot** (round 5): an indigo blob whose eyes are holes in the body, drawn with the
  [bloub](https://github.com/jeremy-prt/bloub) engine (MIT, vendored in `src/vendor/bloub`,
  ported from its Vue component to `BloubRico.tsx`). It floats in the bottom-right corner
  (above the dock on a phone), blinks, lets its gaze drift and follows the pointer. Hover
  gives one small wobble, lights the face up and shows "Ask Rico anything about this page".
  Drag Rico and dashed "Drop here" spots appear in the other corners; it snaps to the
  nearest one on release (remembered per browser). Click opens the chat: a floating white
  card that slides in from the right with no sheet behind it (420px, full width on a
  phone), with the live Rico in its header (it turns into bloub's "thinking" dots while
  replying), iMessage-style bubbles with Rico's face beside its own, the 3 suggested prompts
  stacked above the input (a sent one disappears), a typing
  bubble, and a mocked chat: replies after 600ms, keyed on "new/active customers" (offers
  "Add card", same logic as (+)), "mrr", "trial", "right/correct/trust", else a default. MRR
  and trial replies have a button to the chart modal. "Ask Rico why" on a What changed tile
  opens the chat with the tile's sentence as your message.
- **New project** (round 7): both views open with RevenueCat's real onboarding block, from
  `onboarding` in new_project.json: progress ring, "Let's get you ready… (2 of 6)", "Mark all
  as done", "Show completed" / "Hide completed", and a snap-scrolling carousel of the open
  tasks (wide cards that stretch, stacked on a phone). No illustrations (RevenueCat's artwork isn't ours).
  "Mark as done" moves a task to completed in both views (one shared state). In **Today**
  the buttons are toasts ("Would open <flow>"), followed by the old Rico bar, the 6 cards at
  0 and "No live transactions to show": the faithful before. In **Proposed** the title and
  primary button open the task drawer (steps, a code snippet for the SDK, the flow button,
  "Mark as done"); below it the 4 cards stay empty until "Show sample data" is on, and the
  sparklines then draw in (600ms, ease-out).
- **Card**: label, (i) definition popover (Active subscriptions adds incl./excl. cancelled
  counts), big number, delta vs previous period (Churn going up is red),
  28-point sparkline in the delta color, window and freshness line, Open chart / View rows.
  Clicking anywhere on the card opens the chart.
- **Today**: the "before": Rico bar, 6 plain cards, recent transactions table (unchanged;
  New and Active customers come from `optional_cards` there). New project adds the
  onboarding block on top and shows every card at 0.

Stack: Vite + React 19 + TypeScript, Tailwind v4, shadcn/ui on **Base UI** primitives
(`base-nova` style), lucide-react, inline SVG sparklines. Mock data in `src/data/*.json`.

## Stubbed

- Chart modal and rows modal (they show metric, period, and the carried-over "as of"
  cutoff, no real chart or rows). "Full definition", "Read the explainer" (small stub
  modal) and sidebar nav do nothing.
- Rico answers are 5 canned replies with hardcoded Normal-state numbers, in every state.
  Setup "Open <flow>" buttons only show a toast; done state resets on reload.
- "Test a new paywall" opens a stub ("Would open Experiments with this segment
  pre-selected"). Extra cards from (+) reset on reload. Trial conversion, Churn and Realized
  LTV are mock values (31%, 4.2%, $38 in Normal).
- "All apps" in the app selector is disabled with a "Next" tooltip.
- No backend. The old Netlify Function (`/api/overview`) and its Netlify Database
  migrations from v0.0.1 are still deployed but the page no longer uses them.

## Decisions where the PRD was ambiguous (picked the simpler option)

- **Repo had no framework** (plain HTML + one Netlify Function), so "keep its framework"
  wasn't possible with shadcn. Added Vite + React to the same repo and kept the Netlify
  site, config and functions; `netlify.toml` now builds `dist/`.
- **Period picker** sits in the header next to "Data as of" (round 6; it was on the period
  row before). It drives Revenue and every card's delta and sparkline ("vs prev
  7d/28d/90d"), since a delta needs a comparison window. Each card carries `by_period` values for 7d/28d/90d;
  top-level fields are the 28d values, matching PRD section 8.
- **Period dates**: full days ending the day before the cutoff, so 28d is 16 Sep – 13 Oct
  (as in the PRD). Only the dates moved in round 6; the values are unchanged.
- **New project**: sample data is opt-in since round 2 (empty cards by default). Empty
  cards hide the window/freshness line and the chart/rows links too, so they show only
  label, dash and "No data yet". The first incomplete setup task is highlighted.
- **Rico entry point**: only the floating mascot, on the Proposed view (round 2 had an
  input under the header, round 3 a header link; both removed). Today keeps its old Rico bar.
- **Rico drawer closes without returning focus** (kept from round 2, when focusing the page
  input reopened the drawer).
- **iMessage blue** (#0a84ff) is used only inside the chat; the mascot stays page indigo.
- **Two Ricos in the code**: `RICO_VERSION` in `src/components/Rico.tsx` picks `"bloub"`
  (round 5, current) or `"blob3d"` (round 4: three.js blob in `RicoCanvas.tsx`, jiggle now
  toned down). Delete the loser once one is chosen.
- **Rico's rest face** is bloub's "attentif" (looks straight out) rather than its default
  "neutre", which looks up and to the side like the x.ai bot; hover switches to "excite".
- **New project Now row**: "Show sample data" switch sits left of "Data as of".
- **Below volume gate**: deltas and sparklines hidden with "Not enough data yet".
- **Default Rico reply** now says "the numbers on this page" instead of "the six numbers".
- **"Card swapping / custom layout"** stays in "Not on this page": (+) adds from a fixed list
  of five, it doesn't rearrange or swap the defaults.
- **Screenshot numbering** follows the briefs: 08 (+) picker, 09 What changed tiles, 10 Today
  in New project; the Rico mascot and drag shots moved to 12 and 13. 05 is now the phone in
  New project (onboarding stacked); the Normal phone page is `phone-full.png`.
- **Onboarding task cards** drop the illustrations (placeholders read as broken) and stretch
  to fill the row, never under 440px: four open tasks show about two and a bit and scroll,
  as on the real page. One footer row pinned to the bottom (buttons left, "Mark as done"
  right) keeps the buttons lined up.
- **"Business" tag** is indigo (the page's one accent) rather than a separate blue.
- **Dialog backdrop blur removed** so the What changed strip stays readable behind the
  chart modal in screenshot 4.

## Cut, and why

- Real charts, routing, auth, tests: out of scope per PRD section 10. Animations are limited
  to the sample sparklines and Rico.
- The "late refunds may adjust up to 7 days" caveat is a tooltip on Revenue's "as of"
  only, not a separate line, to keep cards the same height.
- Mobile nav is a top bar with a non-functional menu button; the phone pass only makes
  the page stack cleanly (1 column, no horizontal scroll).
