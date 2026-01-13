export function getRelativePath(fullPath: string, basePath: string): string {
  if (basePath === "" || !fullPath.startsWith(basePath)) {
    return fullPath;
  }

  const relativePath = fullPath.slice(basePath.length);
  return relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
}

export function getParentDirectory(filePath: string): string {
  const lastSlashIndex = filePath.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return filePath;
  }
  return filePath.slice(0, lastSlashIndex);
}
