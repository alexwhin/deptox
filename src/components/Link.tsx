import { memo } from "react";
import { ExternalLink, LucideIcon } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Text, TextVariant } from "./Typography";
import { Icon, IconSize } from "./Icon";
import { cn } from "../utilities/cn";

interface BaseLinkProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  loading?: boolean;
}

interface UrlLinkProps extends BaseLinkProps {
  href: string;
  onClick?: never;
}

interface ActionLinkProps extends BaseLinkProps {
  href?: never;
  onClick: () => void;
}

type LinkProps = UrlLinkProps | ActionLinkProps;

export const Link = memo(function Link({
  href,
  onClick,
  children,
  icon,
  className,
  loading = false,
}: LinkProps): React.ReactElement {
  const handleClick = (): void => {
    if (loading) {
      return;
    }
    if (href) {
      openUrl(href);
    } else if (onClick) {
      onClick();
    }
  };

  const IconComponent = icon ?? (href ? ExternalLink : null);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-1.5",
        "transition-colors",
        loading
          ? "text-text-muted/50 dark:text-text-muted-dark/50 cursor-not-allowed"
          : "text-text-muted hover:text-text-secondary dark:text-text-muted-dark dark:hover:text-text-secondary-dark cursor-pointer",
        className
      )}
    >
      {IconComponent && <Icon icon={IconComponent} size={IconSize.SMALL} ariaHidden={true} />}
      <Text variant={TextVariant.CAPTION}>{children}</Text>
    </button>
  );
});
