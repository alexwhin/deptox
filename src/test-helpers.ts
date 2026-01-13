import { vi } from "vitest";
import { DependencyCategory } from "./types/dependencyCategory";
import type { DirectoryEntry } from "./types/interfaces";

export const DEFAULT_TEST_DATE = "2024-06-15T12:00:00Z";

export function setupFakeTimers(isoDate: string = DEFAULT_TEST_DATE): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoDate));
}

export function teardownFakeTimers(): void {
  vi.useRealTimers();
}

export function createMockDirectoryEntry(
  overrides: Partial<DirectoryEntry> = {}
): DirectoryEntry {
  return {
    path: "/test/project/node_modules",
    sizeBytes: 1024 * 1024,
    fileCount: 100,
    lastModifiedMs: Date.now(),
    category: DependencyCategory.NODE_MODULES,
    hasOnlySymlinks: false,
    ...overrides,
  };
}
