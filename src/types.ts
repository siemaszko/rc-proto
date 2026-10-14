import normal from "@/data/normal.json";

export type Preset = "7d" | "28d" | "90d";
export type View = "today" | "proposed";
export type StateKey = "normal" | "low_volume" | "new_project";

export type Overview = typeof normal & {
  sample?: boolean;
  setup?: { done: number; steps: { label: string; done: boolean }[] };
};
export type CardData = Overview["cards"][number];
export type Transaction = Overview["recent_transactions"][number];

export type ChartTarget = { metric: string; definition?: string; cardId?: string };
