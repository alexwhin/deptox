import { create } from "zustand";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { updateCheckerLogger } from "../utilities/logger";

export enum UpdateStatus {
  IDLE = "IDLE",
  CHECKING = "CHECKING",
  UPDATE_AVAILABLE = "UPDATE_AVAILABLE",
  DOWNLOADING = "DOWNLOADING",
  READY_TO_INSTALL = "READY_TO_INSTALL",
  ERROR = "ERROR",
  UP_TO_DATE = "UP_TO_DATE",
}

interface UpdateInfo {
  version: string;
  currentVersion: string;
  body: string | null;
}

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  error: string | null;
  pendingUpdate: Update | null;
}

interface UpdateActions {
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  reset: () => void;
}

type UpdateStore = UpdateState & UpdateActions;

export const useUpdateStore = create<UpdateStore>((set, get) => ({
  status: UpdateStatus.IDLE,
  updateInfo: null,
  downloadProgress: 0,
  error: null,
  pendingUpdate: null,

  checkForUpdates: async (): Promise<void> => {
    set({ status: UpdateStatus.CHECKING, error: null });

    try {
      const update = await check();

      if (update) {
        updateCheckerLogger.log(`Update available: ${update.version}`);
        set({
          updateInfo: {
            version: update.version,
            currentVersion: update.currentVersion,
            body: update.body ?? null,
          },
          pendingUpdate: update,
          status: UpdateStatus.UPDATE_AVAILABLE,
        });

        invoke("set_tray_update_available", {
          available: true,
          version: update.version,
        }).catch((trayError) => {
          updateCheckerLogger.error("Failed to update tray menu:", trayError);
        });
      } else {
        set({ status: UpdateStatus.UP_TO_DATE });

        invoke("set_tray_update_available", {
          available: false,
          version: null,
        }).catch((trayError) => {
          updateCheckerLogger.error("Failed to update tray menu:", trayError);
        });
      }
    } catch (updateError) {
      const errorMessage =
        updateError instanceof Error ? updateError.message : String(updateError);

      if (import.meta.env.DEV) {
        set({ status: UpdateStatus.UP_TO_DATE });
        return;
      }

      updateCheckerLogger.error("Failed to check for updates:", errorMessage);
      set({ error: errorMessage, status: UpdateStatus.ERROR });
    }
  },

  downloadAndInstall: async (): Promise<void> => {
    const { pendingUpdate } = get();

    if (!pendingUpdate) {
      set({ error: "No update available to install" });
      return;
    }

    set({ status: UpdateStatus.DOWNLOADING, downloadProgress: 0 });

    let totalBytes = 0;
    let downloadedBytes = 0;

    try {
      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            totalBytes = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              const progress = Math.round((downloadedBytes / totalBytes) * 100);
              set({ downloadProgress: progress });
            }
            break;
          case "Finished":
            set({ downloadProgress: 100 });
            break;
        }
      });

      set({ status: UpdateStatus.READY_TO_INSTALL });
      await relaunch();
    } catch (downloadError) {
      const errorMessage =
        downloadError instanceof Error ? downloadError.message : String(downloadError);
      updateCheckerLogger.error("Failed to download/install update:", errorMessage);
      set({ error: errorMessage, status: UpdateStatus.ERROR });
    }
  },

  reset: (): void => {
    set({
      status: UpdateStatus.IDLE,
      updateInfo: null,
      downloadProgress: 0,
      error: null,
      pendingUpdate: null,
    });
  },
}));
