import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import "./App.css";
import { Header } from "./components/Header";
import { SupportBanner } from "./components/SupportBanner";
import { DirectoryList } from "./components/DirectoryList";
import { Footer } from "./components/Footer";
import { SettingsPage } from "./components/SettingsPage";
import { AboutPage } from "./components/AboutPage";
import { Layout } from "./components/Layout";
import { useFontSize } from "./hooks/useFontSize";
import { useScanEvents } from "./hooks/useScanEvents";
import { useDependencyStore } from "./stores/dependencyStore";
import { useUpdateStore } from "./stores/updateStore";
import { useLicenseStore } from "./stores/licenseStore";
import { appLogger } from "./utilities/logger";
import { AppRoute } from "./types/appRoute";

function App(): React.ReactElement {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(AppRoute.SCAN);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hideSupportBanner, setHideSupportBanner] = useState(false);
  const loadSettings = useDependencyStore((state) => state.loadSettings);
  const startScan = useDependencyStore((state) => state.startScan);
  const updateTrayIcon = useDependencyStore((state) => state.updateTrayIcon);
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates);
  const downloadAndInstall = useUpdateStore(
    (state) => state.downloadAndInstall
  );
  const checkLicense = useLicenseStore((state) => state.checkLicense);
  const revalidateLicense = useLicenseStore((state) => state.revalidateLicense);

  useFontSize();
  useScanEvents();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const handleDevShortcuts = async (event: KeyboardEvent): Promise<void> => {
      if (!event.metaKey || !event.shiftKey) {
        return;
      }

      if (event.key === "0") {
        event.preventDefault();
        event.stopPropagation();
        appLogger.log("Dev reset triggered - clearing all local data");
        localStorage.removeItem("deptox-settings");
        useDependencyStore.persist.clearStorage();
        await invoke("reset_settings");
        try {
          await invoke("set_tray_icon", { totalSize: 0, threshold: 1 });
        } catch (error) {
          appLogger.error("Failed to clear tray icon:", error);
        }
        window.location.reload();
      }

      if (event.key === "9") {
        event.preventDefault();
        event.stopPropagation();
        setHideSupportBanner((previous) => {
          const newValue = !previous;
          appLogger.log(`Dev toggle - support banner ${newValue ? "hidden" : "visible"}`);
          return newValue;
        });
      }
    };

    document.addEventListener("keydown", handleDevShortcuts, true);
    return () => {
      document.removeEventListener("keydown", handleDevShortcuts, true);
    };
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const setupListener = async (): Promise<void> => {
      const unlisten = await listen("tauri://focus", async () => {
        try {
          const isVisible = await appWindow.isVisible();

          if (!isVisible) {
            await appWindow.emit("dialog-opening", {});

            await appWindow.unminimize();
            await appWindow.show();
            await appWindow.setFocus();
            setCurrentRoute(AppRoute.SCAN);

            setTimeout(async () => {
              await appWindow.emit("dialog-closed", {});
            }, 1000);
          }
        } catch (error) {
          appLogger.error("Failed to handle focus event:", error);
        }
      });

      // Guard against unmount during async setup
      if (!isMounted) {
        unlisten();
        return;
      }

      cleanup = unlisten;
    };

    setupListener();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const setupTrayListeners = async (): Promise<void> => {
      const unlistenScan = await listen("tray-scan-requested", () => {
        setCurrentRoute(AppRoute.SCAN);
        startScan();
      });

      const unlistenSettings = await listen("tray-settings-requested", () => {
        setCurrentRoute(AppRoute.SETTINGS);
      });

      const unlistenAbout = await listen("tray-about-requested", () => {
        setCurrentRoute(AppRoute.ABOUT);
      });

      const unlistenUpdate = await listen("tray-update-requested", () => {
        setCurrentRoute(AppRoute.ABOUT);
        downloadAndInstall();
      });

      const unlistenAll = (): void => {
        unlistenScan();
        unlistenSettings();
        unlistenAbout();
        unlistenUpdate();
      };

      // Guard against unmount during async setup
      if (!isMounted) {
        unlistenAll();
        return;
      }

      cleanup = unlistenAll;
    };

    setupTrayListeners();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [startScan, downloadAndInstall]);

  useEffect(() => {
    const REVALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

    const intervalId = setInterval(() => {
      appLogger.log("Running periodic license revalidation");
      revalidateLicense();
    }, REVALIDATION_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [revalidateLicense]);

  useEffect(() => {
    let cancelled = false;

    const init = async (): Promise<void> => {
      await loadSettings();
      await checkLicense();
      if (cancelled) {
        return;
      }

      try {
        const permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          await requestPermission();
        }
      } catch (error) {
        appLogger.error("Failed to request notification permission:", error);
      }

      setIsInitialized(true);

      if (useDependencyStore.getState().shouldRescan()) {
        await startScan();
      } else {
        await updateTrayIcon();
      }

      checkForUpdates();
    };
    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToSettings = useCallback((): void => {
    setCurrentRoute(AppRoute.SETTINGS);
  }, []);

  const navigateToScan = useCallback((): void => {
    setCurrentRoute(AppRoute.SCAN);
  }, []);

  const renderPageContent = (): React.ReactElement => {
    switch (currentRoute) {
      case AppRoute.SETTINGS:
        return <SettingsPage onClose={navigateToScan} />;
      case AppRoute.ABOUT:
        return <AboutPage onClose={navigateToScan} />;
      case AppRoute.SCAN:
      default:
        return (
          <>
            <DirectoryList />
            <Footer />
            {!hideSupportBanner && <SupportBanner />}
          </>
        );
    }
  };

  if (!isInitialized) {
    return <Layout>{null}</Layout>;
  }

  return (
    <Layout>
      <Header
        onSettingsClick={navigateToSettings}
        showBackButton={currentRoute !== AppRoute.SCAN}
        onBackClick={navigateToScan}
        hideProgress={currentRoute !== AppRoute.SCAN}
      />
      {renderPageContent()}
    </Layout>
  );
}

export default App;
