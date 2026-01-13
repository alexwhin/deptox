import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const shouldInclude = true;
    const shouldExclude = false;
    expect(cn("base", shouldInclude && "included", shouldExclude && "excluded")).toBe("base included");
  });

  it("merges tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles undefined and null values", () => {
    expect(cn("base", undefined, null, "other")).toBe("base other");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});
