import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { Download } from "lucide-react";
import { Text, TextVariant, TextIntent, Divider } from "./Typography";
import { Link } from "./Link";
import { InfoDialog } from "./InfoDialog";
import { useUpdateStore, UpdateStatus } from "../stores/updateStore";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { GITHUB_URL } from "../utilities/constants";
import { componentLogger } from "../utilities/logger";

interface AboutPageProps {
  onClose: () => void;
}

export function AboutPage({ onClose }: AboutPageProps): React.ReactElement {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string>("");
  const [showUpToDateDialog, setShowUpToDateDialog] = useState(false);
  const [userTriggeredCheck, setUserTriggeredCheck] = useState(false);
  const status = useUpdateStore((state) => state.status);
  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates);
  const downloadAndInstall = useUpdateStore(
    (state) => state.downloadAndInstall
  );

  useEffect(() => {
    getVersion()
      .then((appVersion) => {
        setVersion(appVersion);
      })
      .catch((error) => {
        componentLogger.error("Failed to get app version:", error);
      });
  }, []);

  useEffect(() => {
    if (status === UpdateStatus.UP_TO_DATE && userTriggeredCheck) {
      setShowUpToDateDialog(true);
      setUserTriggeredCheck(false);
    }
  }, [status, userTriggeredCheck]);

  useEscapeKey({ onEscape: onClose });

  const handleCheckForUpdates = (): void => {
    setUserTriggeredCheck(true);
    checkForUpdates();
  };

  const handleCloseUpToDateDialog = (): void => {
    setShowUpToDateDialog(false);
  };

  const renderUpdateStatus = (): React.ReactElement => {
    const isLoading =
      status === UpdateStatus.CHECKING ||
      status === UpdateStatus.DOWNLOADING ||
      status === UpdateStatus.READY_TO_INSTALL;

    if (status === UpdateStatus.UPDATE_AVAILABLE) {
      return (
        <Link onClick={downloadAndInstall} icon={Download}>
          {t("update.available", { version: updateInfo?.version })}
        </Link>
      );
    }

    return (
      <Link onClick={handleCheckForUpdates} loading={isLoading}>
        {t("update.checkForUpdates")}
      </Link>
    );
  };

  return (
    <>
      {showUpToDateDialog && (
        <InfoDialog
          title={t("update.upToDateTitle")}
          message={t("update.upToDate", { version })}
          onClose={handleCloseUpToDateDialog}
        />
      )}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center text-center max-w-xs">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <img
              src="/logo-mark.svg"
              alt={t("app.name")}
              className="w-12 h-12"
            />
          </div>
          <Text variant={TextVariant.HEADING} as="h1" className="text-xl mb-2">
            {t("app.name")}
          </Text>
          <Text
            variant={TextVariant.BODY}
            intent={TextIntent.MUTED}
            className="mb-4"
          >
            {t("app.description")}
          </Text>
          {version && (
            <Text
              variant={TextVariant.CAPTION}
              intent={TextIntent.MUTED}
              className="mb-4"
            >
              {t("app.version", { version })}
            </Text>
          )}
          <div className="flex items-center justify-center gap-2">
            {renderUpdateStatus()}
            <Divider />
            <Link href={GITHUB_URL}>{t("app.viewOnGitHub")}</Link>
          </div>
        </div>
      </div>
    </>
  );
}
