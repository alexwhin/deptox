export function isPathInsideDirectories(path: string, foundPaths: string[]): boolean {
  return foundPaths.some(
    (foundPath) => path === foundPath || path.startsWith(foundPath + "/")
  );
}

export function filterRecentlyCheckedPaths(options: {
  recentlyCheckedPaths: string[];
  foundDirectoryPaths: string[];
}): string[] {
  const { recentlyCheckedPaths, foundDirectoryPaths } = options;

  return recentlyCheckedPaths.filter(
    (path) => !isPathInsideDirectories(path, foundDirectoryPaths)
  );
}
