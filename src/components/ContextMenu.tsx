import { memo, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../utilities/cn";
import { Text, TextVariant, TextIntent } from "./Typography";
import { Icon, IconSize } from "./Icon";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { MENU } from "../utilities/constants";

interface MenuItem {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface ContextMenuProps {
  items: MenuItem[];
  disabled?: boolean;
}

interface MenuPosition {
  top: number | "auto";
  bottom: number | "auto";
  right: number | "auto";
  left: number | "auto";
}

const triggerButtonVariants = cva(
  [
    "shrink-0",
    "px-0.5",
    "py-1.5",
    "rounded-md",
  ],
  {
    variants: {
      disabled: {
        true: "text-text-disabled dark:text-text-disabled-dark cursor-default",
        false: [
          "text-text-muted",
          "hover:text-text-secondary",
          "dark:text-text-muted-dark",
          "dark:hover:text-text-secondary-dark",
          "hover:bg-surface-overlay-light",
          "dark:hover:bg-surface-overlay",
          "transition-colors",
          "duration-150",
          "cursor-pointer",
        ],
      },
    },
    defaultVariants: {
      disabled: false,
    },
  }
);

const menuItemVariants = cva(
  [
    "px-2.5",
    "py-2",
    "text-left",
    "transition-colors",
    "cursor-pointer",
    "hover:bg-surface-overlay-light",
    "dark:hover:bg-surface-overlay",
  ],
  {
    variants: {
      position: {
        first: "rounded-t-md",
        middle: "",
        last: "rounded-b-md",
        only: "rounded-md",
      },
    },
    defaultVariants: {
      position: "middle",
    },
  }
);

const MENU_ITEM_INTENT_MAP: Record<"default" | "danger", TextIntent> = {
  default: TextIntent.DEFAULT,
  danger: TextIntent.DANGER,
};

export const ContextMenu = memo(function ContextMenu({
  items,
  disabled = false,
}: ContextMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    bottom: "auto",
    right: "auto",
    left: 0
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = useCallback((): void => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceRight = window.innerWidth - rect.right;
      const shouldOpenAbove = spaceBelow < MENU.HEIGHT_ESTIMATE;
      const shouldOpenLeft = spaceRight < MENU.WIDTH_ESTIMATE;

      const position: MenuPosition = {
        top: shouldOpenAbove ? "auto" : rect.bottom + 4,
        bottom: shouldOpenAbove ? window.innerHeight - rect.top + 4 : "auto",
        right: shouldOpenLeft ? window.innerWidth - rect.right : "auto",
        left: shouldOpenLeft ? "auto" : rect.right - MENU.WIDTH_ESTIMATE,
      };

      setMenuPosition(position);
    }
  }, []);

  const handleToggle = useCallback((event: React.MouseEvent): void => {
    event.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen((previous) => !previous);
  }, [isOpen, updateMenuPosition]);

  const handleItemClick = useCallback(
    (event: React.MouseEvent, onClick: () => void): void => {
      event.stopPropagation();
      setIsOpen(false);
      onClick();
    },
    []
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleClose = useCallback((): void => {
    setIsOpen(false);
  }, []);

  useEscapeKey({ onEscape: handleClose, enabled: isOpen });

  useEffect(() => {
    if (isOpen) {
      const handleScroll = (): void => {
        setIsOpen(false);
      };

      window.addEventListener("scroll", handleScroll, true);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
      };
    }
  }, [isOpen]);

  const getItemPosition = (index: number, total: number): "first" | "middle" | "last" | "only" => {
    if (total === 1) {
      return "only";
    }
    if (index === 0) {
      return "first";
    }
    if (index === total - 1) {
      return "last";
    }
    return "middle";
  };

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Directory actions"
      style={{
        position: "fixed",
        top: menuPosition.top,
        bottom: menuPosition.bottom,
        right: menuPosition.right,
        left: menuPosition.left,
        zIndex: 9999,
      }}
      className="inline-flex flex-col overflow-hidden bg-surface-base-light dark:bg-surface-raised rounded-md shadow-lg border border-surface-border-light dark:border-surface-overlay animate-in fade-in slide-in-from-top-1 duration-150"
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={item.disabled ? undefined : (event) => handleItemClick(event, item.onClick)}
          className={cn(
            menuItemVariants({ position: getItemPosition(index, items.length) }),
            item.disabled && "cursor-default opacity-50"
          )}
        >
          <Text
            variant={TextVariant.TITLE}
            intent={MENU_ITEM_INTENT_MAP[item.variant ?? "default"]}
            className="whitespace-nowrap"
          >
            {item.label}
          </Text>
        </button>
      ))}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={disabled ? undefined : handleToggle}
        disabled={disabled}
        className={triggerButtonVariants({ disabled })}
        aria-label="Open actions menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Icon icon={MoreVertical} size={IconSize.MEDIUM} ariaHidden={true} />
      </button>
      {menuContent && createPortal(menuContent, document.body)}
    </>
  );
});
