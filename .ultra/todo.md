## v0.0.1 — bootstrap
- [x] Netlify project: static `public/` + function `/api/overview`
- [x] Netlify Database schema + fake-data seed migration (a year of subscriptions)
- [x] Dashboard: RevenueCat-style metric tiles + MRR and revenue charts
- [x] Local run via `netlify dev` verified
- [x] Create Netlify site (team Petit) and deploy preview
- [x] Deploy to production — https://rc-proto.netlify.app
- [x] GitHub repo (siemaszko/rc-proto, public) with Netlify deploys on push to `main`

## Next
- [ ] Write the spec
- [ ] Swap fake data for the RevenueCat API once a project has real data

## Overview prototype (PRD: rc-home-test/prd/prd-prototype.md, 90 min box)
- [x] Scaffold Vite + React + Tailwind v4 + shadcn, mock JSON x3, shell (sidebar, header, toggles)
- [x] Card: delta, sparkline, window, freshness, (i) popover
- [x] What changed strip + states
- [x] Modals (chart stub, rows stub, not-on-this-page) + Today view
- [x] Phone width pass
- [x] 5 screenshots (Playwright), README, push

## Round 2 (design review 14.10, 45 min box)
- [x] Rico input under the header (all states) + chat drawer with mocked replies and chips
- [x] New project: setup tasks open a drawer (steps, snippet, Open flow toast, mark done)
- [x] New project: empty cards by default, "Show sample data" switch, sparkline draw-in
- [x] Screenshots 02, 04, 06, 07 re-taken and copied; README; push and confirm deploy
