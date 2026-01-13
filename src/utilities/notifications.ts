import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { formatBytes } from "./formatBytes";
import { storeLogger } from "./logger";
import { isWindowVisible } from "../hooks/useWindowVisibility";
import random from "lodash-es/random";

interface NotifyThresholdExceededOptions {
  totalSize: number;
  thresholdBytes: number;
}

let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN_MS = 2000;

export function resetNotificationCooldown(): void {
  lastNotificationTime = 0;
}

interface NotificationVariation {
  title: string;
  body: string;
}

interface GetRandomNotificationVariationOptions {
  totalSize: number;
  thresholdBytes: number;
  excess: number;
}

async function ensureNotificationPermission(): Promise<boolean> {
  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  } catch (error) {
    storeLogger.error("Failed to check notification permission:", error);
    return false;
  }
}

function getRandomNotificationVariation({
  totalSize,
  thresholdBytes,
  excess,
}: GetRandomNotificationVariationOptions): NotificationVariation {
  const totalFormatted = formatBytes(totalSize);
  const excessFormatted = formatBytes(excess);
  const thresholdFormatted = formatBytes(thresholdBytes);

  const variations: NotificationVariation[] = [
    {
      title: "Time for a Cleanup",
      body: `Dependencies using ${totalFormatted} (${excessFormatted} over threshold)`,
    },
    {
      title: "Dependencies Piling Up",
      body: `Your dependencies have reached ${totalFormatted}, exceeding your ${thresholdFormatted} limit`,
    },
    {
      title: "Storage Alert",
      body: `Dependency folders are consuming ${totalFormatted} — that's ${excessFormatted} over your set threshold`,
    },
    {
      title: "Cleanup Recommended",
      body: `Dependencies are taking up ${totalFormatted} of space, ${excessFormatted} more than your limit`,
    },
  ];

  const randomIndex = random(0, variations.length - 1);
  return variations[randomIndex]!;
}

export async function notifyThresholdExceeded({
  totalSize,
  thresholdBytes,
}: NotifyThresholdExceededOptions): Promise<void> {
  const now = Date.now();
  const timeSinceLastNotification = now - lastNotificationTime;

  if (timeSinceLastNotification < NOTIFICATION_COOLDOWN_MS) {
    storeLogger.debug(
      `Skipping notification - cooldown active (${timeSinceLastNotification}ms since last)`
    );
    return;
  }

  lastNotificationTime = now;

  const windowVisible = await isWindowVisible();

  if (windowVisible) {
    storeLogger.debug("Window is visible, skipping notification");
    return;
  }

  const hasPermission = await ensureNotificationPermission();

  if (!hasPermission) {
    storeLogger.debug(
      "Notification permission not granted, skipping notification"
    );
    return;
  }

  try {
    const excess = totalSize - thresholdBytes;
    const variation = getRandomNotificationVariation({
      totalSize,
      thresholdBytes,
      excess,
    });

    await sendNotification({
      title: variation.title,
      body: variation.body,
    });

    storeLogger.debug("Notification sent successfully");
  } catch (error) {
    storeLogger.error("Failed to send threshold exceeded notification:", error);
  }
}
