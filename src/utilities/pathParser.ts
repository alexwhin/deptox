export interface ProjectInfo {
  projectName: string;
  monorepoName: string | null;
}

const MONOREPO_INDICATORS = ["apps", "packages", "libs", "services", "modules"];
const DEPENDENCY_DIRS = ["node_modules", "vendor", "Pods", ".venv", "venv", "deps", ".dart_tool", "pkg"];

export function containsDependencyDirectory(path: string): boolean {
  return DEPENDENCY_DIRS.some((dir) => path.includes(dir));
}

export function getProjectInfo(path: string): ProjectInfo {
  const parts = path.split("/");

  const depIndex = parts.findIndex((part) => DEPENDENCY_DIRS.includes(part));

  if (depIndex <= 0) {
    return {
      projectName: parts[parts.length - 2] || "Unknown",
      monorepoName: null,
    };
  }

  const projectName = parts[depIndex - 1] || "Unknown";

  const pathsBeforeProject = parts.slice(0, depIndex - 1);
  const reversedIndex = pathsBeforeProject.reverse().findIndex((dir) => MONOREPO_INDICATORS.includes(dir));

  if (reversedIndex !== -1) {
    const originalIndex = pathsBeforeProject.length - 1 - reversedIndex;
    if (originalIndex > 0) {
      const monorepoName = parts[originalIndex - 1] ?? null;
      return {
        projectName,
        monorepoName,
      };
    }
  }

  return {
    projectName,
    monorepoName: null,
  };
}

export function getProjectName(path: string): string {
  const info = getProjectInfo(path);
  return info.projectName;
}
