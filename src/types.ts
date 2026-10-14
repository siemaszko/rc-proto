import normal from "@/data/normal.json";

export type Preset = "7d" | "28d" | "90d";
export type View = "today" | "proposed";
export type StateKey = "normal" | "low_volume" | "new_project";

export type Flow = { label: string; flow: string };
export type OnboardingTask = {
  id: string;
  title: string;
  description: string;
  primary: Flow;
  secondary: Flow | null;
  info: string | null;
  done: boolean;
};
export type Onboarding = { title: string; subtitle: string; tasks: OnboardingTask[] };

export type Overview = typeof normal & {
  sample?: boolean;
  onboarding?: Onboarding;
};
export type CardData = Overview["cards"][number];
export type Transaction = Overview["recent_transactions"][number];

export type ChartTarget = { metric: string; definition?: string; cardId?: string };
