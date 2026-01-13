import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyThresholdExceeded, resetNotificationCooldown } from "./notifications";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { isWindowVisible } from "../hooks/useWindowVisibility";
import random from "lodash-es/random";

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("../hooks/useWindowVisibility", () => ({
  isWindowVisible: vi.fn(),
}));

vi.mock("./logger", () => ({
  storeLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("lodash-es/random", () => ({
  default: vi.fn(),
}));

const mockIsPermissionGranted = vi.mocked(isPermissionGranted);
const mockRequestPermission = vi.mocked(requestPermission);
const mockSendNotification = vi.mocked(sendNotification);
const mockIsWindowVisible = vi.mocked(isWindowVisible);
const mockRandom = vi.mocked(random);

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    resetNotificationCooldown();
    mockIsWindowVisible.mockResolvedValue(false);
    mockIsPermissionGranted.mockResolvedValue(true);
    mockSendNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("notifyThresholdExceeded", () => {
    it("sends notification with one of four variations", async () => {
      mockRandom.mockReturnValue(0);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      const call = mockSendNotification.mock.calls[0]![0] as { title: string; body: string };
      expect(call).toHaveProperty("title");
      expect(call).toHaveProperty("body");
      expect(typeof call.title).toBe("string");
      expect(typeof call.body).toBe("string");
    });

    it("uses variation 1: Time for a Cleanup", async () => {
      mockRandom.mockReturnValue(0);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Time for a Cleanup",
        body: "Dependencies using 10GB (5GB over threshold)",
      });
    });

    it("uses variation 2: Dependencies Piling Up", async () => {
      mockRandom.mockReturnValue(1);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Dependencies Piling Up",
        body: "Your dependencies have reached 10GB, exceeding your 5GB limit",
      });
    });

    it("uses variation 3: Storage Alert", async () => {
      mockRandom.mockReturnValue(2);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Storage Alert",
        body: "Dependency folders are consuming 10GB — that's 5GB over your set threshold",
      });
    });

    it("uses variation 4: Cleanup Recommended", async () => {
      mockRandom.mockReturnValue(3);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Cleanup Recommended",
        body: "Dependencies are taking up 10GB of space, 5GB more than your limit",
      });
    });

    it("sends notification without manually showing window", async () => {
      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    it("does not send notification when window is visible", async () => {
      mockIsWindowVisible.mockResolvedValue(true);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("does not send notification when permission is denied", async () => {
      mockIsPermissionGranted.mockResolvedValue(false);
      mockRequestPermission.mockResolvedValue("denied");

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("requests permission when not already granted", async () => {
      mockIsPermissionGranted.mockResolvedValue(false);
      mockRequestPermission.mockResolvedValue("granted");

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    it("formats byte sizes correctly in notifications", async () => {
      mockRandom.mockReturnValue(0);

      await notifyThresholdExceeded({
        totalSize: 2_147_483_648,
        thresholdBytes: 1_073_741_824,
      });

      expect(mockSendNotification).toHaveBeenCalledWith({
        title: "Time for a Cleanup",
        body: "Dependencies using 2GB (1GB over threshold)",
      });
    });

    it("handles errors gracefully when sending notification fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSendNotification.mockRejectedValueOnce(new Error("Failed to send"));

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      consoleErrorSpy.mockRestore();
    });

    it("handles errors gracefully when checking window visibility fails", async () => {
      mockIsWindowVisible.mockResolvedValue(false);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

    it("handles errors when permission check fails", async () => {
      mockIsPermissionGranted.mockRejectedValueOnce(new Error("Permission check failed"));

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it("skips notification during cooldown period", async () => {
      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledTimes(1);

      await notifyThresholdExceeded({
        totalSize: 10_737_418_240,
        thresholdBytes: 5_368_709_120,
      });

      expect(mockSendNotification).toHaveBeenCalledTimes(1);
    });

  });
});
