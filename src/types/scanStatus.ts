export const ScanStatus = {
  IDLE: "IDLE",
  SCANNING: "SCANNING",
  COMPLETED: "COMPLETED",
  ERROR: "ERROR",
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];
