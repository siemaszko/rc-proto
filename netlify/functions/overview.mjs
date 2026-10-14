import { getDatabase } from "@netlify/database";

// Same shape as RevenueCat's GET /v2/projects/{id}/metrics/overview, so the
// frontend can switch to the real API later without changes.
const METRICS = [
  { id: "active_trials", name: "Active Trials", description: "In total", unit: "#" },
  { id: "active_subscriptions", name: "Active Subscriptions", description: "In total", unit: "#" },
  { id: "mrr", name: "MRR", description: "Monthly Recurring Revenue", unit: "$" },
  { id: "revenue", name: "Revenue", description: "Last 28 days", unit: "$" },
  { id: "new_customers", name: "New Customers", description: "Last 28 days", unit: "#" },
  { id: "active_users", name: "Active Users", description: "Last 28 days", unit: "#" },
];

export default async () => {
  const db = getDatabase();

  const [values] = await db.sql`
    WITH active AS (
      SELECT t.*, p.months FROM transactions t JOIN products p ON p.id = t.product_id
      WHERE t.purchased_at <= now() AND t.expires_at > now()
    )
    SELECT
      (SELECT count(*) FROM active WHERE is_trial)::int                                         AS active_trials,
      (SELECT count(*) FROM active WHERE NOT is_trial)::int                                     AS active_subscriptions,
      (SELECT coalesce(sum(amount_usd / months), 0) FROM active WHERE NOT is_trial)::float8     AS mrr,
      (SELECT coalesce(sum(amount_usd), 0) FROM transactions
         WHERE purchased_at > now() - interval '28 days')::float8                               AS revenue,
      (SELECT count(*) FROM customers WHERE created_at > now() - interval '28 days')::int      AS new_customers,
      (SELECT count(*) FROM customers WHERE last_seen_at > now() - interval '28 days')::int    AS active_users`;

  // MRR at the end of each of the last 12 months, plus revenue booked in that month.
  const series = await db.sql`
    SELECT to_char(m.month, 'YYYY-MM') AS month,
           (SELECT coalesce(sum(t.amount_usd / p.months), 0)
              FROM transactions t JOIN products p ON p.id = t.product_id
              WHERE NOT t.is_trial AND t.purchased_at <= m.at AND t.expires_at > m.at)::float8 AS mrr,
           (SELECT coalesce(sum(t.amount_usd), 0) FROM transactions t
              WHERE t.purchased_at >= m.month AND t.purchased_at < m.month + interval '1 month')::float8 AS revenue
    FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') AS month,
         LATERAL (SELECT month, least(now(), month + interval '1 month') AS at) AS m
    ORDER BY m.month`;

  return Response.json({
    object: "overview_metrics",
    currency: "USD",
    source: "fake-data",
    metrics: METRICS.map((m) => ({ object: "overview_metric", ...m, value: values[m.id] })),
    series,
  });
};

export const config = { path: "/api/overview" };
