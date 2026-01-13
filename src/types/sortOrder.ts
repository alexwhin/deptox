export const SortOrder = {
  SIZE_DESC: "SIZE_DESC",
  SIZE_ASC: "SIZE_ASC",
  NAME_ASC: "NAME_ASC",
  NAME_DESC: "NAME_DESC",
  DATE_DESC: "DATE_DESC",
  DATE_ASC: "DATE_ASC",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export const ALL_SORT_ORDERS: SortOrder[] = [
  SortOrder.SIZE_DESC,
  SortOrder.SIZE_ASC,
  SortOrder.NAME_ASC,
  SortOrder.NAME_DESC,
  SortOrder.DATE_DESC,
  SortOrder.DATE_ASC,
];

export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  [SortOrder.SIZE_DESC]: "Largest first",
  [SortOrder.SIZE_ASC]: "Smallest first",
  [SortOrder.NAME_ASC]: "Name (A-Z)",
  [SortOrder.NAME_DESC]: "Name (Z-A)",
  [SortOrder.DATE_DESC]: "Newest first",
  [SortOrder.DATE_ASC]: "Oldest first",
};
