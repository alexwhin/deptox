import orderBy from "lodash-es/orderBy";
import type { DirectoryEntry } from "../types/interfaces";
import { SortOrder } from "../types/sortOrder";
import { getProjectName } from "./pathParser";

export function sortDirectories(options: {
  directories: DirectoryEntry[];
  sortOrder: SortOrder;
}): DirectoryEntry[] {
  const { directories, sortOrder } = options;

  switch (sortOrder) {
    case SortOrder.SIZE_DESC:
      return orderBy(directories, ["sizeBytes"], ["desc"]);
    case SortOrder.SIZE_ASC:
      return orderBy(directories, ["sizeBytes"], ["asc"]);
    case SortOrder.NAME_ASC:
      return orderBy(directories, [(entry) => getProjectName(entry.path).toLowerCase()], ["asc"]);
    case SortOrder.NAME_DESC:
      return orderBy(directories, [(entry) => getProjectName(entry.path).toLowerCase()], ["desc"]);
    case SortOrder.DATE_DESC:
      return orderBy(directories, ["lastModifiedMs"], ["desc"]);
    case SortOrder.DATE_ASC:
      return orderBy(directories, ["lastModifiedMs"], ["asc"]);
    default:
      return directories;
  }
}
