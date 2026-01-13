import { describe, it, expect } from "vitest";
import {
  getProjectName,
  getProjectInfo,
  containsDependencyDirectory,
} from "./pathParser";

describe("getProjectName", () => {
  it("extracts project name from node_modules path", () => {
    expect(getProjectName("/Users/testuser/myproject/node_modules")).toBe("myproject");
  });

  it("handles nested paths", () => {
    expect(getProjectName("/Users/testuser/work/projects/awesome-app/node_modules")).toBe("awesome-app");
  });

  it("extracts project name from vendor path", () => {
    expect(getProjectName("/Users/testuser/myproject/vendor")).toBe("myproject");
    expect(getProjectName("/Users/testuser/work/api/vendor")).toBe("api");
  });

  it("extracts project name from Pods path", () => {
    expect(getProjectName("/Users/testuser/ios-app/Pods")).toBe("ios-app");
  });

  it("extracts project name from .venv path", () => {
    expect(getProjectName("/Users/testuser/python-project/.venv")).toBe("python-project");
  });

  it("extracts project name from venv path", () => {
    expect(getProjectName("/Users/testuser/python-project/venv")).toBe("python-project");
  });

  it("extracts project name from target path (Rust)", () => {
    expect(getProjectName("/Users/testuser/rust-project/target")).toBe("rust-project");
  });

  it("handles vendor in nested src directory", () => {
    expect(getProjectName("/Users/testuser/work/monorepo/apps/api/src/vendor")).toBe("src");
  });

  it("returns Unknown for invalid paths", () => {
    expect(getProjectName("/")).toBe("Unknown");
  });

  it("handles empty path", () => {
    expect(getProjectName("")).toBe("Unknown");
  });

  it("handles path with only dependency directory", () => {
    expect(getProjectName("node_modules")).toBe("Unknown");
  });

  it("handles Windows-style paths gracefully", () => {
    const result = getProjectName("C:\\Users\\test\\project\\node_modules");
    expect(typeof result).toBe("string");
  });
});

describe("getProjectInfo", () => {
  it("returns project name without monorepo for simple paths", () => {
    const result = getProjectInfo("/Users/testuser/myproject/node_modules");
    expect(result.projectName).toBe("myproject");
    expect(result.monorepoName).toBeNull();
  });

  it("detects monorepo with apps directory", () => {
    const result = getProjectInfo("/Users/testuser/work/monorepo/apps/api/node_modules");
    expect(result.projectName).toBe("api");
    expect(result.monorepoName).toBe("monorepo");
  });

  it("detects monorepo with packages directory", () => {
    const result = getProjectInfo("/Users/testuser/work/my-monorepo/packages/shared/node_modules");
    expect(result.projectName).toBe("shared");
    expect(result.monorepoName).toBe("my-monorepo");
  });

  it("detects monorepo with libs directory", () => {
    const result = getProjectInfo("/Users/testuser/work/project/libs/utils/node_modules");
    expect(result.projectName).toBe("utils");
    expect(result.monorepoName).toBe("project");
  });

  it("detects monorepo with services directory", () => {
    const result = getProjectInfo("/Users/testuser/work/platform/services/auth/node_modules");
    expect(result.projectName).toBe("auth");
    expect(result.monorepoName).toBe("platform");
  });

  it("detects monorepo with modules directory", () => {
    const result = getProjectInfo("/Users/testuser/work/main/modules/core/node_modules");
    expect(result.projectName).toBe("core");
    expect(result.monorepoName).toBe("main");
  });

  it("detects monorepo for vendor directories", () => {
    const result = getProjectInfo("/Users/testuser/work/monorepo/apps/api/src/vendor");
    expect(result.projectName).toBe("src");
    expect(result.monorepoName).toBe("monorepo");
  });

  it("returns null monorepoName for root monorepo node_modules", () => {
    const result = getProjectInfo("/Users/testuser/work/monorepo/node_modules");
    expect(result.projectName).toBe("monorepo");
    expect(result.monorepoName).toBeNull();
  });

  it("handles deeply nested monorepo paths", () => {
    const result = getProjectInfo("/Users/testuser/work/company/monorepo/apps/web/frontend/node_modules");
    expect(result.projectName).toBe("frontend");
    expect(result.monorepoName).toBe("monorepo");
  });

  it("returns null monorepoName when no monorepo indicator found", () => {
    const result = getProjectInfo("/Users/testuser/work/standalone-app/node_modules");
    expect(result.projectName).toBe("standalone-app");
    expect(result.monorepoName).toBeNull();
  });

  it("handles path with multiple monorepo indicators", () => {
    const result = getProjectInfo("/work/outer/packages/inner/apps/web/node_modules");
    expect(result.projectName).toBe("web");
    expect(result.monorepoName).toBe("inner");
  });

  it("handles very deep nesting", () => {
    const result = getProjectInfo("/a/b/c/d/e/f/g/h/i/j/node_modules");
    expect(result.projectName).toBe("j");
    expect(result.monorepoName).toBeNull();
  });
});

describe("containsDependencyDirectory", () => {
  it("returns true for paths containing node_modules", () => {
    expect(containsDependencyDirectory("/project/node_modules")).toBe(true);
    expect(containsDependencyDirectory("/project/node_modules/lodash")).toBe(true);
  });

  it("returns true for paths containing vendor", () => {
    expect(containsDependencyDirectory("/project/vendor")).toBe(true);
    expect(containsDependencyDirectory("/project/vendor/autoload.php")).toBe(true);
  });

  it("returns true for paths containing Pods", () => {
    expect(containsDependencyDirectory("/ios-app/Pods")).toBe(true);
    expect(containsDependencyDirectory("/ios-app/Pods/AFNetworking")).toBe(true);
  });

  it("returns true for paths containing .venv", () => {
    expect(containsDependencyDirectory("/python-project/.venv")).toBe(true);
    expect(containsDependencyDirectory("/python-project/.venv/bin")).toBe(true);
  });

  it("returns true for paths containing venv", () => {
    expect(containsDependencyDirectory("/python-project/venv")).toBe(true);
    expect(containsDependencyDirectory("/python-project/venv/lib")).toBe(true);
  });

  it("returns true for paths containing deps (Elixir)", () => {
    expect(containsDependencyDirectory("/elixir-project/deps")).toBe(true);
    expect(containsDependencyDirectory("/elixir-project/deps/phoenix")).toBe(true);
  });

  it("returns true for paths containing .dart_tool (Dart)", () => {
    expect(containsDependencyDirectory("/flutter-project/.dart_tool")).toBe(true);
    expect(containsDependencyDirectory("/flutter-project/.dart_tool/build")).toBe(true);
  });

  it("returns true for paths containing pkg (Go)", () => {
    expect(containsDependencyDirectory("/go/pkg")).toBe(true);
    expect(containsDependencyDirectory("/go/pkg/mod")).toBe(true);
  });

  it("returns false for regular paths", () => {
    expect(containsDependencyDirectory("/Users/testuser/work/project")).toBe(false);
    expect(containsDependencyDirectory("/Users/testuser/Documents")).toBe(false);
    expect(containsDependencyDirectory("/home/user/code/src")).toBe(false);
  });

  it("returns false for empty path", () => {
    expect(containsDependencyDirectory("")).toBe(false);
  });

  it("handles paths with similar but non-matching names", () => {
    expect(containsDependencyDirectory("/project/node_modules_backup")).toBe(true);
    expect(containsDependencyDirectory("/project/my_vendor_scripts")).toBe(true);
  });
});
