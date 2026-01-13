import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDependencyStore } from "../stores/dependencyStore";
import { formatBytes } from "../utilities/formatBytes";
import { ScanStatus } from "../types/scanStatus";
import { Text, TextVariant, TextIntent, Divider } from "./Typography";
import { PanelHeader } from "./PanelHeader";
import { AnimatedStorageSize } from "./AnimatedStorageSize";
import { cn } from "../utilities/cn";
import clamp from "lodash-es/clamp";
import { componentLogger } from "../utilities/logger";

interface HeaderProps {
  onSettingsClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
  hideProgress?: boolean;
}

export function Header({
  onSettingsClick,
  showBackButton = false,
  onBackClick,
  hideProgress = false,
}: HeaderProps): React.ReactElement {
  const { t } = useTranslation();
  const totalSize = useDependencyStore((state) => state.totalSize);
  const thresholdBytes = useDependencyStore((state) => state.thresholdBytes);
  const scanStatus = useDependencyStore((state) => state.scanStatus);
  const directoryCount = useDependencyStore(
    (state) => state.directories.length
  );
  const scannedCount = useDependencyStore((state) => state.scannedCount);

  const isScanning = scanStatus === ScanStatus.SCANNING;
  const [enableTransition, setEnableTransition] = useState(false);
  const [wasScanning, setWasScanning] = useState(false);

  useEffect(() => {
    componentLogger.log(`Header: totalSize changed to ${totalSize}, progressPercent: ${clamp((totalSize / thresholdBytes) * 100, 0, 100).toFixed(1)}%`);
  }, [totalSize, thresholdBytes]);

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setEnableTransition(true);
    });
    return () => {
      cancelAnimationFrame(timer);
    };
  }, []);

  useEffect(() => {
    if (isScanning && !wasScanning) {
      setEnableTransition(false);
      requestAnimationFrame(() => {
        setEnableTransition(true);
      });
    }
    setWasScanning(isScanning);
  }, [isScanning, wasScanning]);

  const thresholdExceeded = !isScanning && totalSize > thresholdBytes;
  const progressPercent = clamp((totalSize / thresholdBytes) * 100, 0, 100);

  const headerIcon = showBackButton ? "back" : "settings";
  const headerIconClick = showBackButton ? onBackClick ?? onSettingsClick : onSettingsClick;

  if (hideProgress) {
    return <PanelHeader icon={headerIcon} onIconClick={headerIconClick} />;
  }

  return (
    <PanelHeader icon={headerIcon} onIconClick={headerIconClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <AnimatedStorageSize
            bytes={totalSize}
            intent={thresholdExceeded ? TextIntent.DANGER : TextIntent.DEFAULT}
            decimalPlaces={2}
          />
          <Divider />
          <AnimatedStorageSize
            bytes={thresholdBytes}
            intent={TextIntent.MUTED}
            decimalPlaces={0}
          />
        </div>
        <Text variant={TextVariant.CAPTION} intent={TextIntent.MUTED} truncate={true} className="max-w-[50%] text-right">
          {isScanning ? (
            scannedCount === 0 ? t("status.preparingScan") : t("status.scannedDirectories", { count: scannedCount })
          ) : (
            `${directoryCount} ${directoryCount === 1 ? t("status.folder") : t("status.folders")}`
          )}
        </Text>
      </div>
      <div
        className="w-full h-2 bg-surface-border-light dark:bg-surface-overlay rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Storage usage: ${formatBytes(totalSize)} of ${formatBytes(thresholdBytes)} threshold`}
      >
        {isScanning ? (
          <div
            className={cn(
              "h-full w-full animate-indeterminate",
              thresholdExceeded ? "bg-danger" : "bg-primary"
            )}
          />
        ) : (
          <div
            className={cn(
              "h-full",
              enableTransition && "transition-all duration-300",
              thresholdExceeded ? "bg-danger" : "bg-primary"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>
    </PanelHeader>
  );
}
