import { Settings, X, ChevronLeft } from "lucide-react";
import { Icon, IconSize } from "./Icon";
import { cn } from "../utilities/cn";

type PanelHeaderIcon = "settings" | "close" | "back";

interface PanelHeaderProps {
  titleId?: string;
  icon: PanelHeaderIcon;
  onIconClick: () => void;
  iconButtonRef?: React.RefObject<HTMLButtonElement | null>;
  children?: React.ReactNode;
}

const ICON_COMPONENTS: Record<PanelHeaderIcon, typeof Settings> = {
  settings: Settings,
  close: X,
  back: ChevronLeft,
};

const ICON_LABELS: Record<PanelHeaderIcon, string> = {
  settings: "Open settings",
  close: "Close",
  back: "Go back",
};

export function PanelHeader({
  titleId,
  icon,
  onIconClick,
  iconButtonRef,
  children,
}: PanelHeaderProps): React.ReactElement {
  const IconComponent = ICON_COMPONENTS[icon];
  const iconLabel = ICON_LABELS[icon];

  const hasChildren = children !== undefined && children !== null;

  return (
    <div className="shrink-0 p-3 bg-surface-raised-light dark:bg-surface-raised/50">
      <div className={cn("flex items-center justify-between", hasChildren && "mb-2")}>
        <img
          src="/logo-mark.svg"
          alt="deptox"
          id={titleId}
          className="h-5 w-5"
        />
        <Icon
          ref={iconButtonRef}
          icon={IconComponent}
          size={IconSize.MEDIUM}
          onClick={onIconClick}
          ariaLabel={iconLabel}
          className="text-text-muted dark:text-text-muted-dark"
        />
      </div>
      {children}
    </div>
  );
}
