import type { DependencyCategory } from "./dependencyCategory";
import type { FontSize } from "./fontSize";
import type { RescanInterval } from "./rescanInterval";

export interface DirectoryEntry {
  path: string;
  sizeBytes: number;
  fileCount: number;
  lastModifiedMs: number;
  category: DependencyCategory;
  hasOnlySymlinks: boolean;
}

export interface ScanResult {
  entries: DirectoryEntry[];
  totalSize: number;
  scanTimeMs: number;
  skippedCount: number;
}

export interface ScanStats {
  totalSize: number;
  directoryCount: number;
  currentPath: string | null;
}

export interface AppSettings {
  thresholdBytes: number;
  rootDirectory: string;
  enabledCategories: DependencyCategory[];
  minSizeBytes: number;
  permanentDelete: boolean;
  excludePaths: string;
  rescanInterval: RescanInterval;
  confirmBeforeDelete: boolean;
  notifyOnThresholdExceeded: boolean;
  fontSize: FontSize;
}

export interface DeleteResult {
  success: boolean;
  path: string;
  sizeFreed: number;
}

export interface RescanResult {
  exists: boolean;
  entry: DirectoryEntry | null;
}

export interface FileEntry {
  path: string;
  sizeBytes: number;
}

export interface LargestFilesResult {
  files: FileEntry[];
  directoryPath: string;
}
