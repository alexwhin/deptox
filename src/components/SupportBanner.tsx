import { memo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Heart, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useLicenseStore } from "../stores/licenseStore";
import { URLS } from "../utilities/constants";
import { Button, ButtonVariant, ButtonSize } from "./Button";
import { Input, InputVariant } from "./Input";
import { Icon, IconSize } from "./Icon";
import { InfoDialog } from "./InfoDialog";
import { cn } from "../utilities/cn";

const ANIMATION_DURATION_MS = 200;

export const SupportBanner = memo(function SupportBanner(): React.ReactElement | null {
  const { t } = useTranslation();
  const isLicensed = useLicenseStore((state) => state.isLicensed);
  const isActivating = useLicenseStore((state) => state.isActivating);
  const activationError = useLicenseStore((state) => state.activationError);
  const lastEnteredKey = useLicenseStore((state) => state.lastEnteredKey);
  const activateLicense = useLicenseStore((state) => state.activateLicense);
  const clearError = useLicenseStore((state) => state.clearError);

  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [animationState, setAnimationState] = useState<"entering" | "exiting" | "idle">("idle");
  const [licenseKey, setLicenseKey] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isExpanded) {
      setShouldRender(true);
      setAnimationState("entering");
    } else if (shouldRender) {
      setAnimationState("exiting");
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        setAnimationState("idle");
      }, ANIMATION_DURATION_MS);
    }
  }, [isExpanded, shouldRender]);

  useEffect(() => {
    if (lastEnteredKey && !licenseKey) {
      setLicenseKey(lastEnteredKey);
      setIsExpanded(true);
    }
  }, [lastEnteredKey, licenseKey]);

  if (isLicensed) {
    return null;
  }

  const handleActivate = async (): Promise<void> => {
    if (licenseKey.trim()) {
      const success = await activateLicense(licenseKey);
      if (success) {
        setLicenseKey("");
        setIsExpanded(false);
      }
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ): void => {
    if (event.key === "Enter") {
      handleActivate();
    }
  };

  const handleLicenseKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    setLicenseKey(event.target.value);
    if (activationError) {
      clearError();
    }
  };

  const handleBannerClick = (): void => {
    if (!isExpanded) {
      openUrl(URLS.GUMROAD_PRODUCT);
    }
  };

  const handleToggleExpanded = (event: React.MouseEvent): void => {
    event.stopPropagation();
    setIsExpanded((previous) => !previous);
    if (activationError) {
      clearError();
    }
  };

  const handleInputAreaClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
  };

  return (
    <div
      className="shrink-0 bg-primary/10 dark:bg-primary/15 px-3 py-3.5 cursor-pointer"
      onClick={handleBannerClick}
    >
      <div className="flex items-center gap-2">
        <Icon
          icon={Heart}
          size={IconSize.SMALL}
          className="text-primary shrink-0"
        />
        <span className="flex-1 inline-flex items-center gap-1 transition-colors text-text-primary hover:text-text-secondary dark:text-text-primary-dark dark:hover:text-text-secondary-dark">
          <span className="text-xs leading-none">
            {t("license.supportPrefix")} <span className="font-semibold">deptox</span> {t("license.supportSuffix")}
          </span>
          <Icon icon={ExternalLink} size={IconSize.SMALL} ariaHidden={true} />
        </span>
        <button
          type="button"
          onClick={handleToggleExpanded}
          className="inline-flex items-center gap-1 text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark cursor-pointer"
        >
          <span className="text-xs leading-none">{t("license.enterKey")}</span>
          <Icon icon={isExpanded ? ChevronUp : ChevronDown} size={IconSize.SMALL} ariaHidden={true} />
        </button>
      </div>

      {shouldRender && (
        <div
          className={cn(
            "slide-container mt-2.5",
            animationState === "entering" && "slide-container-enter",
            animationState === "exiting" && "slide-container-exit"
          )}
          onClick={handleInputAreaClick}
        >
          <div
            className={cn(
              "slide-content",
              animationState === "entering" && "slide-content-enter",
              animationState === "exiting" && "slide-content-exit"
            )}
          >
            <div className="flex gap-2">
              <Input
                variant={InputVariant.TEXT}
                value={licenseKey}
                onChange={handleLicenseKeyChange}
                onKeyDown={handleKeyDown}
                placeholder={t("license.enterKey")}
                disabled={isActivating}
                className="flex-1"
              />
              <Button
                variant={ButtonVariant.PRIMARY}
                size={ButtonSize.SMALL}
                onClick={handleActivate}
                loading={isActivating}
                disabled={!licenseKey.trim()}
              >
                {t("license.activate")}
              </Button>
            </div>
            {activationError && (
              <InfoDialog
                title={t("license.activationError")}
                message={activationError.replace(/\.$/, "")}
                onClose={clearError}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});
