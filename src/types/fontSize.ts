export const FontSize = {
  DEFAULT: "DEFAULT",
  LARGE: "LARGE",
  EXTRA_LARGE: "EXTRA_LARGE",
} as const;

export type FontSize = (typeof FontSize)[keyof typeof FontSize];

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  [FontSize.DEFAULT]: "Default",
  [FontSize.LARGE]: "Large",
  [FontSize.EXTRA_LARGE]: "Extra Large",
};

export const ALL_FONT_SIZES: FontSize[] = [
  FontSize.DEFAULT,
  FontSize.LARGE,
  FontSize.EXTRA_LARGE,
];
