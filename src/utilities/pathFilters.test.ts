import { describe, it, expect } from "vitest";
import { isPathInsideDirectories, filterRecentlyCheckedPaths } from "./pathFilters";

describe("isPathInsideDirectories", () => {
  it("returns true when path exactly matches a found path", () => {
    expect(isPathInsideDirectories("/project/.venv", ["/project/.venv"])).toBe(true);
  });

  it("returns true when path is a subdirectory of a found path", () => {
    expect(isPathInsideDirectories("/project/.venv/bin", ["/project/.venv"])).toBe(true);
    expect(isPathInsideDirectories("/project/.venv/lib/python3.12", ["/project/.venv"])).toBe(true);
  });

  it("returns false when path is not inside any found path", () => {
    expect(isPathInsideDirectories("/other/path", ["/project/.venv"])).toBe(false);
  });

  it("returns false when path is a parent of found path", () => {
    expect(isPathInsideDirectories("/project", ["/project/.venv"])).toBe(false);
  });

  it("returns false when path is a sibling of found path", () => {
    expect(isPathInsideDirectories("/project/src", ["/project/.venv"])).toBe(false);
  });

  it("handles multiple found paths", () => {
    const foundPaths = ["/project-a/node_modules", "/project-b/.venv"];
    expect(isPathInsideDirectories("/project-a/node_modules/lodash", foundPaths)).toBe(true);
    expect(isPathInsideDirectories("/project-b/.venv/bin", foundPaths)).toBe(true);
    expect(isPathInsideDirectories("/project-c/vendor", foundPaths)).toBe(false);
  });

  it("returns false for empty found paths array", () => {
    expect(isPathInsideDirectories("/any/path", [])).toBe(false);
  });

  it("handles paths that share common prefixes but are not nested", () => {
    expect(isPathInsideDirectories("/project-a/src", ["/project"])).toBe(false);
    expect(isPathInsideDirectories("/project/a/src", ["/project"])).toBe(true);
  });

  it("handles path that is a prefix of found path name", () => {
    expect(isPathInsideDirectories("/project-venv", ["/project-venv-backup"])).toBe(false);
  });
});

describe("filterRecentlyCheckedPaths", () => {
  it("filters out paths that are inside found directories", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: [
        "/project/.venv/bin",
        "/project/.venv/lib",
        "/other/scanning",
      ],
      foundDirectoryPaths: ["/project/.venv"],
    });

    expect(result).toEqual(["/other/scanning"]);
  });

  it("filters out paths that exactly match found directories", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: ["/project/.venv", "/other/path"],
      foundDirectoryPaths: ["/project/.venv"],
    });

    expect(result).toEqual(["/other/path"]);
  });

  it("keeps all paths when no directories are found", () => {
    const recentlyCheckedPaths = ["/path/a", "/path/b", "/path/c"];
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths,
      foundDirectoryPaths: [],
    });

    expect(result).toEqual(recentlyCheckedPaths);
  });

  it("returns empty array when all paths are filtered out", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: [
        "/project/.venv/bin",
        "/project/.venv/lib",
      ],
      foundDirectoryPaths: ["/project/.venv"],
    });

    expect(result).toEqual([]);
  });

  it("handles multiple found directories", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: [
        "/project-a/node_modules/lodash",
        "/project-b/.venv/bin",
        "/project-c/scanning",
        "/project-a/node_modules/.bin",
      ],
      foundDirectoryPaths: ["/project-a/node_modules", "/project-b/.venv"],
    });

    expect(result).toEqual(["/project-c/scanning"]);
  });

  it("preserves order of remaining paths", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: ["/z/path", "/a/path", "/m/path"],
      foundDirectoryPaths: ["/a/path"],
    });

    expect(result).toEqual(["/z/path", "/m/path"]);
  });

  it("handles empty recently checked paths", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: [],
      foundDirectoryPaths: ["/project/.venv"],
    });

    expect(result).toEqual([]);
  });

  it("real-world scenario: scanning python project", () => {
    const result = filterRecentlyCheckedPaths({
      recentlyCheckedPaths: [
        "/Users/testuser/Desktop/fake-python-project/.venv/bin",
        "/Users/testuser/.claude/file-history",
        "/Users/testuser/Work/deptox/src-tauri/target/debug",
      ],
      foundDirectoryPaths: [
        "/Users/testuser/Desktop/fake-python-project/.venv",
        "/Users/testuser/Work/deptox/src-tauri/target",
      ],
    });

    expect(result).toEqual(["/Users/testuser/.claude/file-history"]);
    expect(result).not.toContain("/Users/testuser/Desktop/fake-python-project/.venv/bin");
    expect(result).not.toContain("/Users/testuser/Work/deptox/src-tauri/target/debug");
  });
});
