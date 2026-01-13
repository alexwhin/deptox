import type { TFunction } from "i18next";

const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

interface RelativeTimeUnit {
  unit: Intl.RelativeTimeFormatUnit;
  milliseconds: number;
}

const TIME_UNITS: RelativeTimeUnit[] = [
  { unit: "year", milliseconds: 365 * MILLISECONDS_PER_DAY },
  { unit: "month", milliseconds: 30 * MILLISECONDS_PER_DAY },
  { unit: "week", milliseconds: 7 * MILLISECONDS_PER_DAY },
  { unit: "day", milliseconds: MILLISECONDS_PER_DAY },
  { unit: "hour", milliseconds: MILLISECONDS_PER_HOUR },
  { unit: "minute", milliseconds: MILLISECONDS_PER_MINUTE },
];

export function formatRelativeTime(
  timestampMilliseconds: number,
  translate: TFunction,
  locale: string
): string {
  if (timestampMilliseconds === 0) {
    return translate("time.unknown");
  }

  const currentTime = Date.now();
  const differenceInMilliseconds = currentTime - timestampMilliseconds;

  if (differenceInMilliseconds < MILLISECONDS_PER_MINUTE) {
    return translate("time.justNow");
  }

  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "long",
  });

  for (const { unit, milliseconds } of TIME_UNITS) {
    if (differenceInMilliseconds >= milliseconds) {
      const value = Math.floor(differenceInMilliseconds / milliseconds);
      return formatter.format(-value, unit);
    }
  }

  /* v8 ignore next */
  return translate("time.justNow");
}

export function formatLastModifiedDate(
  timestampMilliseconds: number,
  translate: TFunction,
  locale: string
): string {
  if (timestampMilliseconds === 0) {
    return translate("time.unknown");
  }

  const date = new Date(timestampMilliseconds);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return translate("time.lastModified", { date: formattedDate });
}
