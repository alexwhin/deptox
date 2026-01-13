import { describe, it, expect } from "vitest";
import {
  SortOrder,
  ALL_SORT_ORDERS,
  SORT_ORDER_LABELS,
} from "./sortOrder";

describe("SortOrder", () => {
  it("has all expected sort order values", () => {
    expect(SortOrder.SIZE_DESC).toBe("SIZE_DESC");
    expect(SortOrder.SIZE_ASC).toBe("SIZE_ASC");
    expect(SortOrder.NAME_ASC).toBe("NAME_ASC");
    expect(SortOrder.NAME_DESC).toBe("NAME_DESC");
    expect(SortOrder.DATE_DESC).toBe("DATE_DESC");
    expect(SortOrder.DATE_ASC).toBe("DATE_ASC");
  });
});

describe("ALL_SORT_ORDERS", () => {
  it("contains all six sort orders", () => {
    expect(ALL_SORT_ORDERS).toHaveLength(6);
  });

  it("contains each sort order exactly once", () => {
    const uniqueOrders = new Set(ALL_SORT_ORDERS);
    expect(uniqueOrders.size).toBe(6);
  });

  it("includes all expected sort orders", () => {
    expect(ALL_SORT_ORDERS).toContain(SortOrder.SIZE_DESC);
    expect(ALL_SORT_ORDERS).toContain(SortOrder.SIZE_ASC);
    expect(ALL_SORT_ORDERS).toContain(SortOrder.NAME_ASC);
    expect(ALL_SORT_ORDERS).toContain(SortOrder.NAME_DESC);
    expect(ALL_SORT_ORDERS).toContain(SortOrder.DATE_DESC);
    expect(ALL_SORT_ORDERS).toContain(SortOrder.DATE_ASC);
  });

  it("has SIZE_DESC as the first option (default)", () => {
    expect(ALL_SORT_ORDERS[0]).toBe(SortOrder.SIZE_DESC);
  });
});

describe("SORT_ORDER_LABELS", () => {
  it("has a label for every sort order", () => {
    for (const order of ALL_SORT_ORDERS) {
      expect(SORT_ORDER_LABELS[order]).toBeDefined();
      expect(typeof SORT_ORDER_LABELS[order]).toBe("string");
      expect(SORT_ORDER_LABELS[order].length).toBeGreaterThan(0);
    }
  });

  it("has correct labels for each sort order", () => {
    expect(SORT_ORDER_LABELS[SortOrder.SIZE_DESC]).toBe("Largest first");
    expect(SORT_ORDER_LABELS[SortOrder.SIZE_ASC]).toBe("Smallest first");
    expect(SORT_ORDER_LABELS[SortOrder.NAME_ASC]).toBe("Name (A-Z)");
    expect(SORT_ORDER_LABELS[SortOrder.NAME_DESC]).toBe("Name (Z-A)");
    expect(SORT_ORDER_LABELS[SortOrder.DATE_DESC]).toBe("Newest first");
    expect(SORT_ORDER_LABELS[SortOrder.DATE_ASC]).toBe("Oldest first");
  });
});
