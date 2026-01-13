export const RescanInterval = {
  ONE_HOUR: "ONE_HOUR",
  ONE_DAY: "ONE_DAY",
  ONE_WEEK: "ONE_WEEK",
  ONE_MONTH: "ONE_MONTH",
  NEVER: "NEVER",
} as const;

export type RescanInterval = (typeof RescanInterval)[keyof typeof RescanInterval];

export const RESCAN_INTERVAL_LABELS: Record<RescanInterval, string> = {
  [RescanInterval.ONE_HOUR]: "Every hour",
  [RescanInterval.ONE_DAY]: "Every day",
  [RescanInterval.ONE_WEEK]: "Every week",
  [RescanInterval.ONE_MONTH]: "Every month",
  [RescanInterval.NEVER]: "Never",
};

export const RESCAN_INTERVAL_MS: Record<RescanInterval, number | null> = {
  [RescanInterval.ONE_HOUR]: 60 * 60 * 1000,
  [RescanInterval.ONE_DAY]: 24 * 60 * 60 * 1000,
  [RescanInterval.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
  [RescanInterval.ONE_MONTH]: 30 * 24 * 60 * 60 * 1000,
  [RescanInterval.NEVER]: null,
};

export const ALL_RESCAN_INTERVALS: RescanInterval[] = [
  RescanInterval.ONE_HOUR,
  RescanInterval.ONE_DAY,
  RescanInterval.ONE_WEEK,
  RescanInterval.ONE_MONTH,
  RescanInterval.NEVER,
];
