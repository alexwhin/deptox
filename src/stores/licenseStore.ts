import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { LicenseInfo, LicenseStore } from "../types/license";
import { storeLogger } from "../utilities/logger";

const initialState = {
  isLicensed: false,
  licenseKey: null,
  licensedEmail: null,
  isLoading: true,
  isActivating: false,
  activationError: null,
  lastEnteredKey: null,
  isCached: false,
};

export const useLicenseStore = create<LicenseStore>()((set, get) => ({
  ...initialState,

  checkLicense: async (): Promise<void> => {
    storeLogger.log("checkLicense called");
    set({ isLoading: true });

    try {
      const licenseInfo = await invoke<LicenseInfo>("get_license_info");
      storeLogger.log(
        `License check complete: isLicensed=${licenseInfo.isLicensed}, email=${licenseInfo.licensedEmail}`
      );

      set({
        isLicensed: licenseInfo.isLicensed,
        licenseKey: licenseInfo.licenseKey,
        licensedEmail: licenseInfo.licensedEmail,
        isLoading: false,
        isCached: licenseInfo.isCached,
      });
    } catch (error) {
      storeLogger.error("Failed to check license:", error);
      set({
        isLicensed: false,
        licenseKey: null,
        licensedEmail: null,
        isLoading: false,
        isCached: false,
      });
    }
  },

  activateLicense: async (key: string): Promise<boolean> => {
    storeLogger.log("activateLicense called");
    set({ isActivating: true, activationError: null, lastEnteredKey: key });

    try {
      const licenseInfo = await invoke<LicenseInfo>("activate_license", {
        licenseKey: key,
      });
      storeLogger.log(
        `License activated: email=${licenseInfo.licensedEmail}`
      );

      set({
        isLicensed: licenseInfo.isLicensed,
        licenseKey: licenseInfo.licenseKey,
        licensedEmail: licenseInfo.licensedEmail,
        isActivating: false,
        activationError: null,
        lastEnteredKey: null,
        isCached: false,
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      storeLogger.error("Failed to activate license:", errorMessage);

      set({
        isActivating: false,
        activationError: errorMessage,
      });

      return false;
    }
  },

  revalidateLicense: async (): Promise<void> => {
    const { isLicensed } = get();

    if (!isLicensed) {
      return;
    }

    storeLogger.log("revalidateLicense called");

    try {
      const licenseInfo = await invoke<LicenseInfo>("revalidate_license");
      storeLogger.log(
        `License revalidation complete: isLicensed=${licenseInfo.isLicensed}`
      );

      set({
        isLicensed: licenseInfo.isLicensed,
        licenseKey: licenseInfo.licenseKey,
        licensedEmail: licenseInfo.licensedEmail,
        isCached: licenseInfo.isCached,
      });
    } catch (error) {
      const errorString =
        error instanceof Error ? error.message : String(error);
      const parts = errorString.split("|");
      const errorMessage = parts[0] ?? errorString;
      const fullKey = parts[1] ?? null;

      storeLogger.error("License revalidation failed:", errorMessage);

      set({
        isLicensed: false,
        activationError: errorMessage,
        lastEnteredKey: fullKey,
        isCached: false,
      });
    }
  },

  deactivateLicense: async (): Promise<void> => {
    storeLogger.log("deactivateLicense called");

    try {
      await invoke("deactivate_license");
      storeLogger.log("License deactivated");

      set({
        isLicensed: false,
        licenseKey: null,
        licensedEmail: null,
        activationError: null,
        lastEnteredKey: null,
        isCached: false,
      });
    } catch (error) {
      storeLogger.error("Failed to deactivate license:", error);
    }
  },

  clearError: (): void => {
    set({ activationError: null });
  },
}));
