import { describe, it, expect } from "vitest";
import { formatBytes } from "./formatBytes";

describe("formatBytes", () => {
  it("returns 0B for zero bytes", () => {
    expect(formatBytes(0)).toBe("0B");
  });

  it("formats bytes correctly", () => {
    expect(formatBytes(500)).toBe("500B");
  });

  it("formats kilobytes correctly", () => {
    expect(formatBytes(1024)).toBe("1KB");
    expect(formatBytes(1536)).toBe("2KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatBytes(1024 * 1024)).toBe("1MB");
    expect(formatBytes(1024 * 1024 * 100)).toBe("100MB");
  });

  it("formats gigabytes correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1GB");
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe("3GB");
  });

  it("formats terabytes correctly", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1TB");
  });

  it("handles negative bytes by returning 0B", () => {
    expect(formatBytes(-100)).toBe("0B");
    expect(formatBytes(-1)).toBe("0B");
    expect(formatBytes(-1000000)).toBe("0B");
  });

  it("handles negative bytes with decimal places", () => {
    expect(formatBytes(-100, 2)).toBe("0.00B");
  });

  it("handles very large values", () => {
    const petabyte = 1024 * 1024 * 1024 * 1024 * 1024;
    expect(formatBytes(petabyte)).toBe("1024TB");
  });

  it("handles fractional bytes by ceiling", () => {
    expect(formatBytes(1.5)).toBe("2B");
  });

  it("formats with 2 decimal places when specified", () => {
    expect(formatBytes(0, 2)).toBe("0.00B");
    expect(formatBytes(1024, 2)).toBe("1.00KB");
    expect(formatBytes(1536, 2)).toBe("1.50KB");
    expect(formatBytes(1024 * 1024 * 1024 * 2.5, 2)).toBe("2.50GB");
  });
});
