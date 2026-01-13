export const DependencyCategory = {
  NODE_MODULES: "NODE_MODULES",
  COMPOSER: "COMPOSER",
  BUNDLER: "BUNDLER",
  PODS: "PODS",
  PYTHON_VENV: "PYTHON_VENV",
  ELIXIR_DEPS: "ELIXIR_DEPS",
  DART_TOOL: "DART_TOOL",
  GO_MOD: "GO_MOD",
} as const;

export type DependencyCategory = (typeof DependencyCategory)[keyof typeof DependencyCategory];

export const DEPENDENCY_CATEGORY_LABELS: Record<DependencyCategory, string> = {
  [DependencyCategory.NODE_MODULES]: "Node (modules)",
  [DependencyCategory.COMPOSER]: "PHP (composer)",
  [DependencyCategory.BUNDLER]: "Ruby (bundler)",
  [DependencyCategory.PODS]: "iOS (pods)",
  [DependencyCategory.PYTHON_VENV]: "Python (venv)",
  [DependencyCategory.ELIXIR_DEPS]: "Elixir (deps)",
  [DependencyCategory.DART_TOOL]: "Dart (dart_tool)",
  [DependencyCategory.GO_MOD]: "Go (pkg/mod)",
};

export const DEPENDENCY_CATEGORY_SHORT_LABELS: Record<DependencyCategory, string> = {
  [DependencyCategory.NODE_MODULES]: "node",
  [DependencyCategory.COMPOSER]: "php",
  [DependencyCategory.BUNDLER]: "ruby",
  [DependencyCategory.PODS]: "ios",
  [DependencyCategory.PYTHON_VENV]: "python",
  [DependencyCategory.ELIXIR_DEPS]: "elixir",
  [DependencyCategory.DART_TOOL]: "dart",
  [DependencyCategory.GO_MOD]: "go",
};

export const ALL_DEPENDENCY_CATEGORIES: DependencyCategory[] = [
  DependencyCategory.NODE_MODULES,
  DependencyCategory.COMPOSER,
  DependencyCategory.BUNDLER,
  DependencyCategory.PODS,
  DependencyCategory.PYTHON_VENV,
  DependencyCategory.ELIXIR_DEPS,
  DependencyCategory.DART_TOOL,
  DependencyCategory.GO_MOD,
];
