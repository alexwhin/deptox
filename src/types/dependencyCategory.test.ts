import { describe, it, expect } from "vitest";
import {
  DependencyCategory,
  DEPENDENCY_CATEGORY_LABELS,
  DEPENDENCY_CATEGORY_SHORT_LABELS,
  ALL_DEPENDENCY_CATEGORIES,
} from "./dependencyCategory";

describe("DEPENDENCY_CATEGORY_SHORT_LABELS", () => {
  it("has a short label for every dependency category", () => {
    for (const category of ALL_DEPENDENCY_CATEGORIES) {
      expect(DEPENDENCY_CATEGORY_SHORT_LABELS[category]).toBeDefined();
      expect(typeof DEPENDENCY_CATEGORY_SHORT_LABELS[category]).toBe("string");
      expect(DEPENDENCY_CATEGORY_SHORT_LABELS[category].length).toBeGreaterThan(0);
    }
  });

  it("has correct short labels for each category", () => {
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.NODE_MODULES]).toBe("node");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.COMPOSER]).toBe("php");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.BUNDLER]).toBe("ruby");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.PODS]).toBe("ios");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.PYTHON_VENV]).toBe("python");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.ELIXIR_DEPS]).toBe("elixir");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.DART_TOOL]).toBe("dart");
    expect(DEPENDENCY_CATEGORY_SHORT_LABELS[DependencyCategory.GO_MOD]).toBe("go");
  });

  it("has short labels that are lowercase", () => {
    for (const category of ALL_DEPENDENCY_CATEGORIES) {
      const label = DEPENDENCY_CATEGORY_SHORT_LABELS[category];
      expect(label).toBe(label.toLowerCase());
    }
  });
});

describe("DEPENDENCY_CATEGORY_LABELS", () => {
  it("has a label for every dependency category", () => {
    for (const category of ALL_DEPENDENCY_CATEGORIES) {
      expect(DEPENDENCY_CATEGORY_LABELS[category]).toBeDefined();
      expect(typeof DEPENDENCY_CATEGORY_LABELS[category]).toBe("string");
      expect(DEPENDENCY_CATEGORY_LABELS[category].length).toBeGreaterThan(0);
    }
  });

  it("has correct labels for each category", () => {
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.NODE_MODULES]).toBe("Node (modules)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.COMPOSER]).toBe("PHP (composer)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.BUNDLER]).toBe("Ruby (bundler)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.PODS]).toBe("iOS (pods)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.PYTHON_VENV]).toBe("Python (venv)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.ELIXIR_DEPS]).toBe("Elixir (deps)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.DART_TOOL]).toBe("Dart (dart_tool)");
    expect(DEPENDENCY_CATEGORY_LABELS[DependencyCategory.GO_MOD]).toBe("Go (pkg/mod)");
  });
});

describe("ALL_DEPENDENCY_CATEGORIES", () => {
  it("contains all eight categories", () => {
    expect(ALL_DEPENDENCY_CATEGORIES).toHaveLength(8);
  });

  it("contains each category exactly once", () => {
    const uniqueCategories = new Set(ALL_DEPENDENCY_CATEGORIES);
    expect(uniqueCategories.size).toBe(8);
  });

  it("includes all expected categories", () => {
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.NODE_MODULES);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.COMPOSER);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.BUNDLER);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.PODS);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.PYTHON_VENV);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.ELIXIR_DEPS);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.DART_TOOL);
    expect(ALL_DEPENDENCY_CATEGORIES).toContain(DependencyCategory.GO_MOD);
  });
});
