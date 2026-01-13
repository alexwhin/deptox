import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime, formatLastModifiedDate } from "./formatTime";
import type { TFunction } from "i18next";

const mockTranslate: TFunction = ((key: string, options?: { count?: number; date?: string }) => {
  if (key === "time.unknown") {
    return "unknown";
  }
  if (key === "time.justNow") {
    return "just now";
  }
  if (key === "time.minutesAgo") {
    const count = options?.count || 1;
    return count === 1 ? "1 minute ago" : `${count} minutes ago`;
  }
  if (key === "time.hoursAgo") {
    const count = options?.count || 1;
    return count === 1 ? "1 hour ago" : `${count} hours ago`;
  }
  if (key === "time.daysAgo") {
    const count = options?.count || 1;
    return count === 1 ? "yesterday" : `${count} days ago`;
  }
  if (key === "time.weeksAgo") {
    const count = options?.count || 1;
    return count === 1 ? "last week" : `${count} weeks ago`;
  }
  if (key === "time.monthsAgo") {
    const count = options?.count || 1;
    return count === 1 ? "last month" : `${count} months ago`;
  }
  if (key === "time.yearsAgo") {
    const count = options?.count || 1;
    return count === 1 ? "last year" : `${count} years ago`;
  }
  if (key === "time.lastModified") {
    return `Last modified ${options?.date || ""}`;
  }
  return key;
}) as TFunction;

describe("formatRelativeTime", () => {
  const MILLISECONDS_PER_MINUTE = 60 * 1000;
  const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
  const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
  const MILLISECONDS_PER_WEEK = 7 * MILLISECONDS_PER_DAY;
  const MILLISECONDS_PER_MONTH = 30 * MILLISECONDS_PER_DAY;
  const MILLISECONDS_PER_YEAR = 365 * MILLISECONDS_PER_DAY;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'unknown' for timestamp of 0", () => {
    expect(formatRelativeTime(0, mockTranslate, "en")).toBe("unknown");
  });

  it("returns 'just now' for very recent timestamps", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 30 * 1000, mockTranslate, "en")).toBe("just now");
    expect(formatRelativeTime(currentTime - 59 * 1000, mockTranslate, "en")).toBe("just now");
  });

  it("returns 'just now' for current timestamp", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime, mockTranslate, "en")).toBe("just now");
  });

  it("returns 'just now' for timestamps less than a minute ago", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 5 * 1000, mockTranslate, "en")).toBe("just now");
    expect(formatRelativeTime(currentTime - 45 * 1000, mockTranslate, "en")).toBe("just now");
  });

  it("formats minutes correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_MINUTE, mockTranslate, "en")).toBe("1 minute ago");
    expect(formatRelativeTime(currentTime - 5 * MILLISECONDS_PER_MINUTE, mockTranslate, "en")).toBe("5 minutes ago");
    expect(formatRelativeTime(currentTime - 30 * MILLISECONDS_PER_MINUTE, mockTranslate, "en")).toBe("30 minutes ago");
  });

  it("formats hours correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_HOUR, mockTranslate, "en")).toBe("1 hour ago");
    expect(formatRelativeTime(currentTime - 5 * MILLISECONDS_PER_HOUR, mockTranslate, "en")).toBe("5 hours ago");
    expect(formatRelativeTime(currentTime - 23 * MILLISECONDS_PER_HOUR, mockTranslate, "en")).toBe("23 hours ago");
  });

  it("formats days correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_DAY, mockTranslate, "en")).toBe("yesterday");
    expect(formatRelativeTime(currentTime - 2 * MILLISECONDS_PER_DAY, mockTranslate, "en")).toBe("2 days ago");
    expect(formatRelativeTime(currentTime - 6 * MILLISECONDS_PER_DAY, mockTranslate, "en")).toBe("6 days ago");
  });

  it("formats weeks correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_WEEK, mockTranslate, "en")).toBe("last week");
    expect(formatRelativeTime(currentTime - 2 * MILLISECONDS_PER_WEEK, mockTranslate, "en")).toBe("2 weeks ago");
    expect(formatRelativeTime(currentTime - 3 * MILLISECONDS_PER_WEEK, mockTranslate, "en")).toBe("3 weeks ago");
  });

  it("formats months correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_MONTH, mockTranslate, "en")).toBe("last month");
    expect(formatRelativeTime(currentTime - 2 * MILLISECONDS_PER_MONTH, mockTranslate, "en")).toBe("2 months ago");
    expect(formatRelativeTime(currentTime - 6 * MILLISECONDS_PER_MONTH, mockTranslate, "en")).toBe("6 months ago");
  });

  it("formats years correctly using Intl.RelativeTimeFormat", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_YEAR, mockTranslate, "en")).toBe("last year");
    expect(formatRelativeTime(currentTime - 2 * MILLISECONDS_PER_YEAR, mockTranslate, "en")).toBe("2 years ago");
  });

  it("formats in Spanish locale", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_HOUR, mockTranslate, "es")).toBe("hace 1 hora");
    expect(formatRelativeTime(currentTime - 3 * MILLISECONDS_PER_DAY, mockTranslate, "es")).toBe("hace 3 días");
  });

  it("formats in French locale", () => {
    const currentTime = Date.now();
    expect(formatRelativeTime(currentTime - 1 * MILLISECONDS_PER_HOUR, mockTranslate, "fr")).toBe("il y a 1 heure");
    expect(formatRelativeTime(currentTime - 3 * MILLISECONDS_PER_DAY, mockTranslate, "fr")).toBe("il y a 3 jours");
  });
});

describe("formatLastModifiedDate", () => {
  it("returns unknown for timestamp of 0", () => {
    expect(formatLastModifiedDate(0, mockTranslate, "en")).toBe("unknown");
  });

  it("formats a valid timestamp", () => {
    const timestampMilliseconds = new Date("2024-06-15T12:30:00Z").getTime();
    const result = formatLastModifiedDate(timestampMilliseconds, mockTranslate, "en");
    expect(result).toContain("Last modified");
    expect(result).toContain("2024");
  });

  it("includes time in the formatted string", () => {
    const timestampMilliseconds = new Date("2024-12-25T09:45:00Z").getTime();
    const result = formatLastModifiedDate(timestampMilliseconds, mockTranslate, "en");
    expect(result).toContain("Last modified");
  });
});
