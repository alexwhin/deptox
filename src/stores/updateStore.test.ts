import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { useUpdateStore, UpdateStatus } from "./updateStore";

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../utilities/logger", () => ({
  updateCheckerLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockCheck = vi.mocked(check);
const mockRelaunch = vi.mocked(relaunch);
const mockInvoke = vi.mocked(invoke);

describe("updateStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      useUpdateStore.getState().reset();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has correct default values", () => {
      const state = useUpdateStore.getState();

      expect(state.status).toBe(UpdateStatus.IDLE);
      expect(state.updateInfo).toBeNull();
      expect(state.downloadProgress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.pendingUpdate).toBeNull();
    });
  });

  describe("checkForUpdates", () => {
    it("sets status to CHECKING while checking", async () => {
      mockCheck.mockImplementation(() => new Promise(() => {}));

      act(() => {
        useUpdateStore.getState().checkForUpdates();
      });

      expect(useUpdateStore.getState().status).toBe(UpdateStatus.CHECKING);
    });

    it("sets status to UPDATE_AVAILABLE when update exists", async () => {
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: "Release notes",
        downloadAndInstall: vi.fn(),
      } as unknown as Update;

      mockCheck.mockResolvedValue(mockUpdate);
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useUpdateStore.getState().checkForUpdates();
      });

      const state = useUpdateStore.getState();
      expect(state.status).toBe(UpdateStatus.UPDATE_AVAILABLE);
      expect(state.updateInfo).toEqual({
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: "Release notes",
      });
      expect(state.pendingUpdate).toBe(mockUpdate);
    });

    it("sets status to UP_TO_DATE when no update available", async () => {
      mockCheck.mockResolvedValue(null);
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useUpdateStore.getState().checkForUpdates();
      });

      expect(useUpdateStore.getState().status).toBe(UpdateStatus.UP_TO_DATE);
    });

    it("updates tray menu when update is available", async () => {
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: null,
        downloadAndInstall: vi.fn(),
      } as unknown as Update;

      mockCheck.mockResolvedValue(mockUpdate);
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useUpdateStore.getState().checkForUpdates();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_update_available", {
        available: true,
        version: "2.0.0",
      });
    });

    it("updates tray menu when no update available", async () => {
      mockCheck.mockResolvedValue(null);
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useUpdateStore.getState().checkForUpdates();
      });

      expect(mockInvoke).toHaveBeenCalledWith("set_tray_update_available", {
        available: false,
        version: null,
      });
    });

    it("handles null body in update info", async () => {
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: undefined,
        downloadAndInstall: vi.fn(),
      } as unknown as Update;

      mockCheck.mockResolvedValue(mockUpdate);
      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useUpdateStore.getState().checkForUpdates();
      });

      expect(useUpdateStore.getState().updateInfo?.body).toBeNull();
    });
  });

  describe("downloadAndInstall", () => {
    it("sets error when no pending update", async () => {
      await act(async () => {
        await useUpdateStore.getState().downloadAndInstall();
      });

      expect(useUpdateStore.getState().error).toBe("No update available to install");
    });

    it("sets status to DOWNLOADING during download", async () => {
      const mockDownloadAndInstall = vi.fn().mockImplementation(() => new Promise(() => {}));
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: null,
        downloadAndInstall: mockDownloadAndInstall,
      } as unknown as Update;

      act(() => {
        useUpdateStore.setState({ pendingUpdate: mockUpdate });
      });

      act(() => {
        useUpdateStore.getState().downloadAndInstall();
      });

      expect(useUpdateStore.getState().status).toBe(UpdateStatus.DOWNLOADING);
      expect(useUpdateStore.getState().downloadProgress).toBe(0);
    });

    it("updates progress during download", async () => {
      const mockDownloadAndInstall = vi.fn().mockImplementation((callback) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            callback({ event: "Started", data: { contentLength: 1000 } });
            callback({ event: "Progress", data: { chunkLength: 500 } });
            callback({ event: "Progress", data: { chunkLength: 500 } });
            callback({ event: "Finished", data: {} });
            resolve(undefined);
          }, 0);
        });
      });

      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: null,
        downloadAndInstall: mockDownloadAndInstall,
      } as unknown as Update;

      act(() => {
        useUpdateStore.setState({ pendingUpdate: mockUpdate });
      });

      await act(async () => {
        await useUpdateStore.getState().downloadAndInstall();
      });

      expect(useUpdateStore.getState().downloadProgress).toBe(100);
      expect(useUpdateStore.getState().status).toBe(UpdateStatus.READY_TO_INSTALL);
    });

    it("calls relaunch after successful install", async () => {
      const mockDownloadAndInstall = vi.fn().mockResolvedValue(undefined);
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: null,
        downloadAndInstall: mockDownloadAndInstall,
      } as unknown as Update;

      mockRelaunch.mockResolvedValue(undefined);

      act(() => {
        useUpdateStore.setState({ pendingUpdate: mockUpdate });
      });

      await act(async () => {
        await useUpdateStore.getState().downloadAndInstall();
      });

      expect(mockRelaunch).toHaveBeenCalled();
    });

    it("sets error status on download failure", async () => {
      const mockDownloadAndInstall = vi.fn().mockRejectedValue(new Error("Download failed"));
      const mockUpdate = {
        version: "2.0.0",
        currentVersion: "1.0.0",
        body: null,
        downloadAndInstall: mockDownloadAndInstall,
      } as unknown as Update;

      act(() => {
        useUpdateStore.setState({ pendingUpdate: mockUpdate });
      });

      await act(async () => {
        await useUpdateStore.getState().downloadAndInstall();
      });

      const state = useUpdateStore.getState();
      expect(state.status).toBe(UpdateStatus.ERROR);
      expect(state.error).toBe("Download failed");
    });
  });

  describe("reset", () => {
    it("resets all state to initial values", () => {
      act(() => {
        useUpdateStore.setState({
          status: UpdateStatus.ERROR,
          updateInfo: { version: "2.0.0", currentVersion: "1.0.0", body: "notes" },
          downloadProgress: 50,
          error: "Some error",
          pendingUpdate: {} as Update,
        });
      });

      act(() => {
        useUpdateStore.getState().reset();
      });

      const state = useUpdateStore.getState();
      expect(state.status).toBe(UpdateStatus.IDLE);
      expect(state.updateInfo).toBeNull();
      expect(state.downloadProgress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.pendingUpdate).toBeNull();
    });
  });
});
