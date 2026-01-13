import { describe, it, expect } from "vitest";
import { sortDirectories } from "./sortDirectories";
import { DependencyCategory } from "../types/dependencyCategory";
import { SortOrder } from "../types/sortOrder";
import type { DirectoryEntry } from "../types/interfaces";

describe("sortDirectories", () => {
  const createEntry = (
    path: string,
    sizeBytes: number,
    lastModifiedMs: number = Date.now()
  ): DirectoryEntry => ({
    path,
    sizeBytes,
    fileCount: 10,
    lastModifiedMs,
    category: DependencyCategory.NODE_MODULES,
    hasOnlySymlinks: false,
  });

  const entries: DirectoryEntry[] = [
    createEntry("/project-a/node_modules", 100),
    createEntry("/project-b/node_modules", 500),
    createEntry("/project-c/node_modules", 0),
    createEntry("/project-d/node_modules", 250),
  ];

  describe("size sorting", () => {
    it("sorts by size descending (largest first)", () => {
      const sorted = sortDirectories({ directories: entries, sortOrder: SortOrder.SIZE_DESC });
      expect(sorted[0]!.sizeBytes).toBe(500);
      expect(sorted[1]!.sizeBytes).toBe(250);
      expect(sorted[2]!.sizeBytes).toBe(100);
      expect(sorted[3]!.sizeBytes).toBe(0);
    });

    it("sorts by size ascending (smallest first)", () => {
      const sorted = sortDirectories({ directories: entries, sortOrder: SortOrder.SIZE_ASC });
      expect(sorted[0]!.sizeBytes).toBe(0);
      expect(sorted[1]!.sizeBytes).toBe(100);
      expect(sorted[2]!.sizeBytes).toBe(250);
      expect(sorted[3]!.sizeBytes).toBe(500);
    });
  });

  describe("name sorting", () => {
    it("sorts by name ascending (A-Z)", () => {
      const sorted = sortDirectories({ directories: entries, sortOrder: SortOrder.NAME_ASC });
      expect(sorted[0]!.path).toBe("/project-a/node_modules");
      expect(sorted[1]!.path).toBe("/project-b/node_modules");
      expect(sorted[2]!.path).toBe("/project-c/node_modules");
      expect(sorted[3]!.path).toBe("/project-d/node_modules");
    });

    it("sorts by name descending (Z-A)", () => {
      const sorted = sortDirectories({ directories: entries, sortOrder: SortOrder.NAME_DESC });
      expect(sorted[0]!.path).toBe("/project-d/node_modules");
      expect(sorted[1]!.path).toBe("/project-c/node_modules");
      expect(sorted[2]!.path).toBe("/project-b/node_modules");
      expect(sorted[3]!.path).toBe("/project-a/node_modules");
    });

    it("sorts by project name case-insensitively", () => {
      const mixedCaseEntries: DirectoryEntry[] = [
        createEntry("/Zebra/node_modules", 100),
        createEntry("/apple/node_modules", 200),
        createEntry("/Banana/node_modules", 300),
      ];

      const sorted = sortDirectories({ directories: mixedCaseEntries, sortOrder: SortOrder.NAME_ASC });
      expect(sorted[0]!.path).toBe("/apple/node_modules");
      expect(sorted[1]!.path).toBe("/Banana/node_modules");
      expect(sorted[2]!.path).toBe("/Zebra/node_modules");
    });
  });

  describe("date sorting", () => {
    it("sorts by date descending (newest first)", () => {
      const now = Date.now();
      const dateEntries: DirectoryEntry[] = [
        createEntry("/project-old/node_modules", 100, now - 3000),
        createEntry("/project-new/node_modules", 200, now),
        createEntry("/project-mid/node_modules", 300, now - 1000),
      ];

      const sorted = sortDirectories({ directories: dateEntries, sortOrder: SortOrder.DATE_DESC });
      expect(sorted[0]!.path).toBe("/project-new/node_modules");
      expect(sorted[1]!.path).toBe("/project-mid/node_modules");
      expect(sorted[2]!.path).toBe("/project-old/node_modules");
    });

    it("sorts by date ascending (oldest first)", () => {
      const now = Date.now();
      const dateEntries: DirectoryEntry[] = [
        createEntry("/project-old/node_modules", 100, now - 3000),
        createEntry("/project-new/node_modules", 200, now),
        createEntry("/project-mid/node_modules", 300, now - 1000),
      ];

      const sorted = sortDirectories({ directories: dateEntries, sortOrder: SortOrder.DATE_ASC });
      expect(sorted[0]!.path).toBe("/project-old/node_modules");
      expect(sorted[1]!.path).toBe("/project-mid/node_modules");
      expect(sorted[2]!.path).toBe("/project-new/node_modules");
    });
  });

  describe("edge cases", () => {
    it("does not mutate the original array", () => {
      const original = [...entries];
      sortDirectories({ directories: entries, sortOrder: SortOrder.SIZE_DESC });
      expect(entries).toEqual(original);
    });

    it("handles empty array", () => {
      const sorted = sortDirectories({ directories: [], sortOrder: SortOrder.SIZE_DESC });
      expect(sorted).toEqual([]);
    });

    it("handles single item array", () => {
      const singleEntry = [createEntry("/project-a/node_modules", 100)];
      const sorted = sortDirectories({ directories: singleEntry, sortOrder: SortOrder.SIZE_DESC });
      expect(sorted).toHaveLength(1);
      expect(sorted[0]!.sizeBytes).toBe(100);
    });

    it("returns original array for unknown sort order", () => {
      const sorted = sortDirectories({ directories: entries, sortOrder: "UNKNOWN" as SortOrder });
      expect(sorted).toEqual(entries);
    });
  });
});

describe("sortDirectories with different categories", () => {
  const createEntryWithCategory = (
    path: string,
    sizeBytes: number,
    category: DependencyCategory,
    lastModifiedMs: number = Date.now()
  ): DirectoryEntry => ({
    path,
    sizeBytes,
    fileCount: 10,
    lastModifiedMs,
    category,
    hasOnlySymlinks: false,
  });

  it("sorts mixed category entries by size", () => {
    const mixedEntries: DirectoryEntry[] = [
      createEntryWithCategory("/project-a/node_modules", 100, DependencyCategory.NODE_MODULES),
      createEntryWithCategory("/project-b/vendor", 500, DependencyCategory.COMPOSER),
      createEntryWithCategory("/project-c/.venv", 250, DependencyCategory.PYTHON_VENV),
    ];

    const sorted = sortDirectories({ directories: mixedEntries, sortOrder: SortOrder.SIZE_DESC });
    expect(sorted[0]!.category).toBe(DependencyCategory.COMPOSER);
    expect(sorted[1]!.category).toBe(DependencyCategory.PYTHON_VENV);
    expect(sorted[2]!.category).toBe(DependencyCategory.NODE_MODULES);
  });

  it("preserves category when sorting by name", () => {
    const mixedEntries: DirectoryEntry[] = [
      createEntryWithCategory("/z-project/node_modules", 100, DependencyCategory.NODE_MODULES),
      createEntryWithCategory("/a-project/vendor", 500, DependencyCategory.BUNDLER),
    ];

    const sorted = sortDirectories({ directories: mixedEntries, sortOrder: SortOrder.NAME_ASC });
    expect(sorted[0]!.path).toBe("/a-project/vendor");
    expect(sorted[0]!.category).toBe(DependencyCategory.BUNDLER);
    expect(sorted[1]!.path).toBe("/z-project/node_modules");
    expect(sorted[1]!.category).toBe(DependencyCategory.NODE_MODULES);
  });

  it("sorts mixed categories by date", () => {
    const now = Date.now();
    const mixedEntries: DirectoryEntry[] = [
      createEntryWithCategory("/project-a/node_modules", 100, DependencyCategory.NODE_MODULES, now - 2000),
      createEntryWithCategory("/project-b/vendor", 200, DependencyCategory.COMPOSER, now),
      createEntryWithCategory("/project-c/Pods", 300, DependencyCategory.PODS, now - 1000),
    ];

    const sorted = sortDirectories({ directories: mixedEntries, sortOrder: SortOrder.DATE_DESC });
    expect(sorted[0]!.category).toBe(DependencyCategory.COMPOSER);
    expect(sorted[1]!.category).toBe(DependencyCategory.PODS);
    expect(sorted[2]!.category).toBe(DependencyCategory.NODE_MODULES);
  });
});
