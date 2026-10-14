-- Prototype only: a year of fake, deterministic subscription history ending at
-- the moment this migration runs.

SELECT setseed(0.42);

INSERT INTO products (id, name, months, price_usd) VALUES
  ('pro_monthly', 'Pro Monthly', 1, 9.99),
  ('pro_yearly',  'Pro Yearly', 12, 59.99);

-- Signups grow from ~20/day a year ago to ~80/day today.
INSERT INTO customers (created_at, last_seen_at, country, platform)
SELECT ts,
       ts + (now() - ts) * random(),
       (ARRAY['US','US','US','GB','DE','PL','FR','BR','JP','CA'])[1 + floor(random() * 10)::int],
       CASE WHEN random() < 0.6 THEN 'ios' ELSE 'android' END
FROM generate_series(0, 364) AS d,
     LATERAL generate_series(1, (20 + (364 - d) / 6 + floor(random() * 12))::int) AS i,
     LATERAL (SELECT least(now(), date_trunc('day', now()) - d * interval '1 day'
                                   + random() * interval '1 day') AS ts) AS t;

-- 35% start a 7-day trial (45% convert), 5% buy directly. Each paid
-- subscription renews a geometric number of times (monthly churn 12%, yearly 40%).
WITH starters AS MATERIALIZED (
  SELECT c.id AS customer_id,
         c.created_at,
         CASE WHEN r.plan < 0.7 THEN 'pro_monthly' ELSE 'pro_yearly' END AS product_id,
         r.path < 0.35 AS had_trial,
         r.path >= 0.35 OR r.convert < 0.45 AS pays,
         r.life
  FROM customers c,
       LATERAL (SELECT random() AS path, random() AS plan, random() AS convert,
                       greatest(random(), 1e-9) AS life, c.id AS _) AS r
  WHERE r.path < 0.40
),
paid AS (
  SELECT s.customer_id, s.product_id, p.months, p.price_usd,
         s.created_at + CASE WHEN s.had_trial THEN interval '7 days' ELSE interval '0' END AS starts_at,
         least(24, 1 + floor(ln(s.life) / ln(1 - CASE WHEN p.months = 1 THEN 0.12 ELSE 0.40 END)))::int AS periods
  FROM starters s JOIN products p ON p.id = s.product_id
  WHERE s.pays
)
INSERT INTO transactions (customer_id, product_id, is_trial, purchased_at, expires_at, amount_usd)
SELECT customer_id, product_id, TRUE, created_at, created_at + interval '7 days', 0
FROM starters WHERE had_trial
UNION ALL
SELECT customer_id, product_id, FALSE,
       starts_at + k * months * interval '1 month',
       starts_at + (k + 1) * months * interval '1 month',
       price_usd
FROM paid, LATERAL generate_series(0, periods - 1) AS k
WHERE starts_at + k * months * interval '1 month' <= now();
