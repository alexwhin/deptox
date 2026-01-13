import clamp from "lodash-es/clamp";

export function formatBytes(bytes: number, decimalPlaces: number = 0): string {
  if (bytes <= 0) {
    return decimalPlaces > 0 ? `0.${"0".repeat(decimalPlaces)}B` : "0B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const bytesPerUnit = 1024;
  const exponent = clamp(
    Math.floor(Math.log(bytes) / Math.log(bytesPerUnit)),
    0,
    units.length - 1
  );
  const value = bytes / Math.pow(bytesPerUnit, exponent);

  if (decimalPlaces > 0) {
    return `${value.toFixed(decimalPlaces)}${units[exponent]}`;
  }

  return `${Math.ceil(value)}${units[exponent]}`;
}
