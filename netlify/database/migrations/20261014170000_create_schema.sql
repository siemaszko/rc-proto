-- Subscription data modelled loosely after RevenueCat: customers buy products,
-- every purchase or renewal is one transaction covering [purchased_at, expires_at).

CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  months      INTEGER NOT NULL,          -- billing period length
  price_usd   NUMERIC(10, 2) NOT NULL
);

CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL,
  last_seen_at  TIMESTAMPTZ NOT NULL,
  country       TEXT NOT NULL,
  platform      TEXT NOT NULL
);

CREATE TABLE transactions (
  id            SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(id),
  product_id    TEXT NOT NULL REFERENCES products(id),
  is_trial      BOOLEAN NOT NULL,
  purchased_at  TIMESTAMPTZ NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  amount_usd    NUMERIC(10, 2) NOT NULL
);

CREATE INDEX transactions_period_idx ON transactions (purchased_at, expires_at);
CREATE INDEX customers_created_idx ON customers (created_at);
CREATE INDEX customers_seen_idx ON customers (last_seen_at);
