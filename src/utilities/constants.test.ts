import { describe, it, expect } from "vitest";
import { BYTES_PER_MB, BYTES_PER_GB, GITHUB_URL, URLS, ANIMATION, SCAN, MENU } from "./constants";

describe("constants", () => {
  describe("byte constants", () => {
    it("BYTES_PER_MB equals 1024 * 1024", () => {
      expect(BYTES_PER_MB).toBe(1024 * 1024);
      expect(BYTES_PER_MB).toBe(1048576);
    });

    it("BYTES_PER_GB equals 1024 * 1024 * 1024", () => {
      expect(BYTES_PER_GB).toBe(1024 * 1024 * 1024);
      expect(BYTES_PER_GB).toBe(1073741824);
    });

    it("BYTES_PER_GB equals BYTES_PER_MB * 1024", () => {
      expect(BYTES_PER_GB).toBe(BYTES_PER_MB * 1024);
    });
  });

  describe("URLS", () => {
    it("has valid GitHub URL", () => {
      expect(URLS.GITHUB).toBe("https://github.com/alexwhin/deptox");
      expect(URLS.GITHUB.startsWith("https://")).toBe(true);
    });

    it("has valid Gumroad product URL", () => {
      expect(URLS.GUMROAD_PRODUCT).toBe("https://alexwhin.gumroad.com/l/deptox");
      expect(URLS.GUMROAD_PRODUCT.startsWith("https://")).toBe(true);
    });

    it("GITHUB_URL is exported for convenience", () => {
      expect(GITHUB_URL).toBe(URLS.GITHUB);
    });
  });

  describe("ANIMATION constants", () => {
    it("has LIST_ITEM_DURATION_MS", () => {
      expect(ANIMATION.LIST_ITEM_DURATION_MS).toBe(180);
    });

    it("has LIST_ITEM_FADE_DELAY_MS", () => {
      expect(ANIMATION.LIST_ITEM_FADE_DELAY_MS).toBe(50);
    });
  });

  describe("SCAN constants", () => {
    it("has DEBOUNCE_MS", () => {
      expect(SCAN.DEBOUNCE_MS).toBe(500);
    });
  });

  describe("MENU constants", () => {
    it("has HEIGHT_ESTIMATE", () => {
      expect(MENU.HEIGHT_ESTIMATE).toBe(220);
    });

    it("has WIDTH_ESTIMATE", () => {
      expect(MENU.WIDTH_ESTIMATE).toBe(200);
    });
  });
});
