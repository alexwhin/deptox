import { describe, it, expect } from "vitest";
import { getRelativePath, getParentDirectory } from "./pathUtils";

describe("pathUtils", () => {
  describe("getRelativePath", () => {
    it("should return relative path when fullPath starts with basePath", () => {
      const result = getRelativePath(
        "/Users/testuser/projects/node_modules/lodash/index.js",
        "/Users/testuser/projects/node_modules"
      );
      expect(result).toBe("lodash/index.js");
    });

    it("should handle basePath with trailing slash", () => {
      const result = getRelativePath(
        "/Users/testuser/projects/node_modules/lodash/index.js",
        "/Users/testuser/projects/node_modules/"
      );
      expect(result).toBe("lodash/index.js");
    });

    it("should return full path when it does not start with basePath", () => {
      const result = getRelativePath(
        "/other/path/file.js",
        "/Users/testuser/projects"
      );
      expect(result).toBe("/other/path/file.js");
    });

    it("should handle empty basePath", () => {
      const result = getRelativePath("/Users/testuser/file.js", "");
      expect(result).toBe("/Users/testuser/file.js");
    });

    it("should handle equal paths", () => {
      const result = getRelativePath(
        "/Users/testuser/projects",
        "/Users/testuser/projects"
      );
      expect(result).toBe("");
    });

    it("should strip leading slash from relative path", () => {
      const result = getRelativePath(
        "/base/path/file.js",
        "/base/path"
      );
      expect(result).toBe("file.js");
    });
  });

  describe("getParentDirectory", () => {
    it("should return parent directory for a file path", () => {
      const result = getParentDirectory("/Users/testuser/projects/file.js");
      expect(result).toBe("/Users/testuser/projects");
    });

    it("should return parent for nested directory", () => {
      const result = getParentDirectory("/Users/testuser/projects/src/components");
      expect(result).toBe("/Users/testuser/projects/src");
    });

    it("should return empty string for root path", () => {
      const result = getParentDirectory("/file.js");
      expect(result).toBe("");
    });

    it("should return the path itself when no slash exists", () => {
      const result = getParentDirectory("file.js");
      expect(result).toBe("file.js");
    });

    it("should handle path with only directory", () => {
      const result = getParentDirectory("/Users");
      expect(result).toBe("");
    });

    it("should handle deeply nested paths", () => {
      const result = getParentDirectory("/a/b/c/d/e/f.txt");
      expect(result).toBe("/a/b/c/d/e");
    });
  });
});
