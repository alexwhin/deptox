export interface LicenseInfo {
  isLicensed: boolean;
  licenseKey: string | null;
  licensedEmail: string | null;
  /** Indicates if the license status is from cache due to network failure during revalidation */
  isCached: boolean;
}

export interface LicenseState {
  isLicensed: boolean;
  licenseKey: string | null;
  licensedEmail: string | null;
  isLoading: boolean;
  isActivating: boolean;
  activationError: string | null;
  lastEnteredKey: string | null;
  /** Indicates if the current license status is from cache due to network failure */
  isCached: boolean;
}

export interface LicenseActions {
  checkLicense: () => Promise<void>;
  activateLicense: (key: string) => Promise<boolean>;
  revalidateLicense: () => Promise<void>;
  deactivateLicense: () => Promise<void>;
  clearError: () => void;
}

export type LicenseStore = LicenseState & LicenseActions;
