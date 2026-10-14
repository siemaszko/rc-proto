# rc-proto

RevenueCat dashboard prototype. Live: https://rc-proto.netlify.app

Static page in `public/`, one Netlify Function (`/api/overview`) and Netlify Database
(Postgres). Data is fake: the schema and a year of subscription history are seeded by
the migrations in `netlify/database/migrations/`. The API response mirrors RevenueCat's
`GET /v2/projects/{id}/metrics/overview`, so the frontend can switch to real data later.

## Run locally

```sh
npm install
npm run dev          # netlify dev on http://localhost:8888, starts a local Postgres
npm run db:migrate   # first run only: apply migrations to the local database
```

## Deploy

Push to `main` deploys to production; migrations run before publish. Never edit an
applied migration — add a new one instead.
