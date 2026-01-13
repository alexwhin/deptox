import { describe, it, expect } from "vitest";
import {
  RescanInterval,
  RESCAN_INTERVAL_LABELS,
  RESCAN_INTERVAL_MS,
  ALL_RESCAN_INTERVALS,
} from "./rescanInterval";

describe("RescanInterval", () => {
  it("has all expected interval values", () => {
    expect(RescanInterval.ONE_HOUR).toBe("ONE_HOUR");
    expect(RescanInterval.ONE_DAY).toBe("ONE_DAY");
    expect(RescanInterval.ONE_WEEK).toBe("ONE_WEEK");
    expect(RescanInterval.ONE_MONTH).toBe("ONE_MONTH");
    expect(RescanInterval.NEVER).toBe("NEVER");
  });
});

describe("ALL_RESCAN_INTERVALS", () => {
  it("contains all five intervals", () => {
    expect(ALL_RESCAN_INTERVALS).toHaveLength(5);
  });

  it("contains each interval exactly once", () => {
    const uniqueIntervals = new Set(ALL_RESCAN_INTERVALS);
    expect(uniqueIntervals.size).toBe(5);
  });

  it("includes all expected intervals", () => {
    expect(ALL_RESCAN_INTERVALS).toContain(RescanInterval.ONE_HOUR);
    expect(ALL_RESCAN_INTERVALS).toContain(RescanInterval.ONE_DAY);
    expect(ALL_RESCAN_INTERVALS).toContain(RescanInterval.ONE_WEEK);
    expect(ALL_RESCAN_INTERVALS).toContain(RescanInterval.ONE_MONTH);
    expect(ALL_RESCAN_INTERVALS).toContain(RescanInterval.NEVER);
  });
});

describe("RESCAN_INTERVAL_LABELS", () => {
  it("has a label for every rescan interval", () => {
    for (const interval of ALL_RESCAN_INTERVALS) {
      expect(RESCAN_INTERVAL_LABELS[interval]).toBeDefined();
      expect(typeof RESCAN_INTERVAL_LABELS[interval]).toBe("string");
      expect(RESCAN_INTERVAL_LABELS[interval].length).toBeGreaterThan(0);
    }
  });

  it("has correct labels for each interval", () => {
    expect(RESCAN_INTERVAL_LABELS[RescanInterval.ONE_HOUR]).toBe("Every hour");
    expect(RESCAN_INTERVAL_LABELS[RescanInterval.ONE_DAY]).toBe("Every day");
    expect(RESCAN_INTERVAL_LABELS[RescanInterval.ONE_WEEK]).toBe("Every week");
    expect(RESCAN_INTERVAL_LABELS[RescanInterval.ONE_MONTH]).toBe("Every month");
    expect(RESCAN_INTERVAL_LABELS[RescanInterval.NEVER]).toBe("Never");
  });
});

describe("RESCAN_INTERVAL_MS", () => {
  it("has a millisecond value for every rescan interval", () => {
    for (const interval of ALL_RESCAN_INTERVALS) {
      expect(RESCAN_INTERVAL_MS[interval]).toBeDefined();
    }
  });

  it("has correct millisecond values for time-based intervals", () => {
    expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_HOUR]).toBe(60 * 60 * 1000);
    expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_DAY]).toBe(24 * 60 * 60 * 1000);
    expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_WEEK]).toBe(7 * 24 * 60 * 60 * 1000);
    expect(RESCAN_INTERVAL_MS[RescanInterval.ONE_MONTH]).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("has null for NEVER interval", () => {
    expect(RESCAN_INTERVAL_MS[RescanInterval.NEVER]).toBeNull();
  });
});
