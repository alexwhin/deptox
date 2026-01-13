export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

export const URLS = {
  GITHUB: "https://github.com/alexwhin/deptox",
  GUMROAD_PRODUCT: "https://alexwhin.gumroad.com/l/deptox",
} as const;

export const GITHUB_URL = URLS.GITHUB;

export const ANIMATION = {
  LIST_ITEM_DURATION_MS: 180,
  LIST_ITEM_FADE_DELAY_MS: 50,
} as const;

export const SCAN = {
  DEBOUNCE_MS: 500,
} as const;

export const MENU = {
  HEIGHT_ESTIMATE: 220,
  WIDTH_ESTIMATE: 200,
} as const;
