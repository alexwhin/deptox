import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { useLicenseStore } from "./licenseStore";
import type { LicenseInfo } from "../types/license";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("../utilities/logger", () => ({
  storeLogger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockInvoke = vi.mocked(invoke);

function resetStore(): void {
  useLicenseStore.setState({
    isLicensed: false,
    licenseKey: null,
    licensedEmail: null,
    isLoading: true,
    isActivating: false,
    activationError: null,
    lastEnteredKey: null,
    isCached: false,
  });
}

describe("licenseStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    act(() => {
      resetStore();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("has correct default values", () => {
      const state = useLicenseStore.getState();

      expect(state.isLicensed).toBe(false);
      expect(state.licenseKey).toBeNull();
      expect(state.licensedEmail).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isActivating).toBe(false);
      expect(state.activationError).toBeNull();
      expect(state.lastEnteredKey).toBeNull();
    });
  });

  describe("checkLicense", () => {
    it("sets isLoading to true while checking", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      act(() => {
        useLicenseStore.getState().checkLicense();
      });

      expect(useLicenseStore.getState().isLoading).toBe(true);
    });

    it("updates state when license is valid", async () => {
      const licenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: "XXXX-XXXX-XXXX",
        licensedEmail: "user@example.com",
        isCached: false,
      };

      mockInvoke.mockResolvedValue(licenseInfo);

      await act(async () => {
        await useLicenseStore.getState().checkLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(true);
      expect(state.licenseKey).toBe("XXXX-XXXX-XXXX");
      expect(state.licensedEmail).toBe("user@example.com");
      expect(state.isLoading).toBe(false);
    });

    it("updates state when no license exists", async () => {
      const licenseInfo: LicenseInfo = {
        isLicensed: false,
        licenseKey: null,
        licensedEmail: null,
        isCached: false,
      };

      mockInvoke.mockResolvedValue(licenseInfo);

      await act(async () => {
        await useLicenseStore.getState().checkLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.licenseKey).toBeNull();
      expect(state.licensedEmail).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("handles errors gracefully", async () => {
      mockInvoke.mockRejectedValue(new Error("Failed to check license"));

      await act(async () => {
        await useLicenseStore.getState().checkLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("activateLicense", () => {
    it("sets isActivating to true while activating", async () => {
      mockInvoke.mockImplementation(() => new Promise(() => {}));

      act(() => {
        useLicenseStore.getState().activateLicense("TEST-KEY");
      });

      const state = useLicenseStore.getState();
      expect(state.isActivating).toBe(true);
      expect(state.lastEnteredKey).toBe("TEST-KEY");
    });

    it("returns true and updates state on successful activation", async () => {
      const licenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: "XXXX-XXXX-XXXX",
        licensedEmail: "user@example.com",
        isCached: false,
      };

      mockInvoke.mockResolvedValue(licenseInfo);

      let result: boolean | undefined;
      await act(async () => {
        result = await useLicenseStore.getState().activateLicense("TEST-KEY");
      });

      expect(result).toBe(true);
      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(true);
      expect(state.licenseKey).toBe("XXXX-XXXX-XXXX");
      expect(state.licensedEmail).toBe("user@example.com");
      expect(state.isActivating).toBe(false);
      expect(state.activationError).toBeNull();
      expect(state.lastEnteredKey).toBeNull();
    });

    it("returns false and sets error on failed activation", async () => {
      mockInvoke.mockRejectedValue(new Error("Invalid license key"));

      let result: boolean | undefined;
      await act(async () => {
        result = await useLicenseStore.getState().activateLicense("INVALID-KEY");
      });

      expect(result).toBe(false);
      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.isActivating).toBe(false);
      expect(state.activationError).toBe("Invalid license key");
    });

    it("clears activation error on new activation attempt", async () => {
      act(() => {
        useLicenseStore.setState({ activationError: "Previous error" });
      });

      mockInvoke.mockImplementation(() => new Promise(() => {}));

      act(() => {
        useLicenseStore.getState().activateLicense("NEW-KEY");
      });

      expect(useLicenseStore.getState().activationError).toBeNull();
    });
  });

  describe("revalidateLicense", () => {
    it("does nothing if not licensed", async () => {
      act(() => {
        useLicenseStore.setState({ isLicensed: false });
      });

      await act(async () => {
        await useLicenseStore.getState().revalidateLicense();
      });

      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("revalidates when licensed", async () => {
      const licenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: "XXXX-XXXX-XXXX",
        licensedEmail: "user@example.com",
        isCached: false,
      };

      act(() => {
        useLicenseStore.setState({ isLicensed: true });
      });

      mockInvoke.mockResolvedValue(licenseInfo);

      await act(async () => {
        await useLicenseStore.getState().revalidateLicense();
      });

      expect(mockInvoke).toHaveBeenCalledWith("revalidate_license");
      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(true);
    });

    it("sets isCached when license status is from cache", async () => {
      const cachedLicenseInfo: LicenseInfo = {
        isLicensed: true,
        licenseKey: "XXXX-XXXX-XXXX",
        licensedEmail: "user@example.com",
        isCached: true,
      };

      act(() => {
        useLicenseStore.setState({ isLicensed: true });
      });

      mockInvoke.mockResolvedValue(cachedLicenseInfo);

      await act(async () => {
        await useLicenseStore.getState().revalidateLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(true);
      expect(state.isCached).toBe(true);
    });

    it("handles revalidation failure with error format", async () => {
      act(() => {
        useLicenseStore.setState({ isLicensed: true });
      });

      mockInvoke.mockRejectedValue(new Error("License expired|FULL-LICENSE-KEY"));

      await act(async () => {
        await useLicenseStore.getState().revalidateLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.activationError).toBe("License expired");
      expect(state.lastEnteredKey).toBe("FULL-LICENSE-KEY");
    });

    it("handles revalidation failure without key in error", async () => {
      act(() => {
        useLicenseStore.setState({ isLicensed: true });
      });

      mockInvoke.mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useLicenseStore.getState().revalidateLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.activationError).toBe("Network error");
      expect(state.lastEnteredKey).toBeNull();
    });
  });

  describe("deactivateLicense", () => {
    it("clears license state on successful deactivation", async () => {
      act(() => {
        useLicenseStore.setState({
          isLicensed: true,
          licenseKey: "XXXX-XXXX-XXXX",
          licensedEmail: "user@example.com",
        });
      });

      mockInvoke.mockResolvedValue(undefined);

      await act(async () => {
        await useLicenseStore.getState().deactivateLicense();
      });

      const state = useLicenseStore.getState();
      expect(state.isLicensed).toBe(false);
      expect(state.licenseKey).toBeNull();
      expect(state.licensedEmail).toBeNull();
      expect(state.activationError).toBeNull();
      expect(state.lastEnteredKey).toBeNull();
    });

    it("handles deactivation errors gracefully", async () => {
      act(() => {
        useLicenseStore.setState({ isLicensed: true });
      });

      mockInvoke.mockRejectedValue(new Error("Deactivation failed"));

      await act(async () => {
        await useLicenseStore.getState().deactivateLicense();
      });

      expect(useLicenseStore.getState().isLicensed).toBe(true);
    });
  });

  describe("clearError", () => {
    it("clears the activation error", () => {
      act(() => {
        useLicenseStore.setState({ activationError: "Some error" });
      });

      act(() => {
        useLicenseStore.getState().clearError();
      });

      expect(useLicenseStore.getState().activationError).toBeNull();
    });
  });
});
