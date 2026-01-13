import { describe, it, expect } from "vitest";
import { toggleSetItem, addToSet, removeFromSet } from "./setUtils";

describe("setUtils", () => {
  describe("toggleSetItem", () => {
    it("should add item if not present", () => {
      const set = new Set<string>(["a", "b"]);
      const result = toggleSetItem(set, "c");

      expect(result.has("c")).toBe(true);
      expect(result.size).toBe(3);
    });

    it("should remove item if present", () => {
      const set = new Set<string>(["a", "b", "c"]);
      const result = toggleSetItem(set, "b");

      expect(result.has("b")).toBe(false);
      expect(result.size).toBe(2);
    });

    it("should not mutate original set", () => {
      const set = new Set<string>(["a", "b"]);
      toggleSetItem(set, "c");

      expect(set.has("c")).toBe(false);
      expect(set.size).toBe(2);
    });

    it("should work with empty set", () => {
      const set = new Set<string>();
      const result = toggleSetItem(set, "a");

      expect(result.has("a")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should work with numbers", () => {
      const set = new Set<number>([1, 2, 3]);
      const result = toggleSetItem(set, 2);

      expect(result.has(2)).toBe(false);
      expect(result.size).toBe(2);
    });
  });

  describe("addToSet", () => {
    it("should add item to set", () => {
      const set = new Set<string>(["a", "b"]);
      const result = addToSet(set, "c");

      expect(result.has("c")).toBe(true);
      expect(result.size).toBe(3);
    });

    it("should not duplicate existing item", () => {
      const set = new Set<string>(["a", "b"]);
      const result = addToSet(set, "a");

      expect(result.size).toBe(2);
    });

    it("should not mutate original set", () => {
      const set = new Set<string>(["a"]);
      addToSet(set, "b");

      expect(set.has("b")).toBe(false);
      expect(set.size).toBe(1);
    });

    it("should work with empty set", () => {
      const set = new Set<number>();
      const result = addToSet(set, 42);

      expect(result.has(42)).toBe(true);
      expect(result.size).toBe(1);
    });
  });

  describe("removeFromSet", () => {
    it("should remove item from set", () => {
      const set = new Set<string>(["a", "b", "c"]);
      const result = removeFromSet(set, "b");

      expect(result.has("b")).toBe(false);
      expect(result.size).toBe(2);
    });

    it("should handle removing non-existent item", () => {
      const set = new Set<string>(["a", "b"]);
      const result = removeFromSet(set, "z");

      expect(result.size).toBe(2);
      expect(result.has("a")).toBe(true);
      expect(result.has("b")).toBe(true);
    });

    it("should not mutate original set", () => {
      const set = new Set<string>(["a", "b"]);
      removeFromSet(set, "a");

      expect(set.has("a")).toBe(true);
      expect(set.size).toBe(2);
    });

    it("should work with empty set", () => {
      const set = new Set<string>();
      const result = removeFromSet(set, "a");

      expect(result.size).toBe(0);
    });
  });
});
