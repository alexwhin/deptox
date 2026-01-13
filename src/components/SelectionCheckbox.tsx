import { memo, useCallback } from "react";
import { Check } from "lucide-react";
import { cva } from "class-variance-authority";
import { Icon, IconSize } from "./Icon";
import { cn } from "../utilities/cn";

export enum SelectionCheckboxSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
}

interface SelectionCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: SelectionCheckboxSize;
  className?: string;
}

const selectionCheckboxVariants = cva(
  [
    "shrink-0",
    "flex",
    "items-center",
    "justify-center",
    "rounded",
    "transition-colors",
    "duration-150",
  ],
  {
    variants: {
      size: {
        [SelectionCheckboxSize.SMALL]: "w-3.5 h-3.5",
        [SelectionCheckboxSize.MEDIUM]: "w-4 h-4",
      },
      checked: {
        true: "bg-primary border-2 border-primary",
        false:
          "border border-surface-border-light dark:border-surface-muted bg-surface-base-light dark:bg-surface-raised",
      },
      disabled: {
        true: "opacity-40 cursor-not-allowed",
        false: "cursor-pointer",
      },
    },
    defaultVariants: {
      size: SelectionCheckboxSize.MEDIUM,
      checked: false,
      disabled: false,
    },
  }
);

export const SelectionCheckbox = memo(function SelectionCheckbox({
  checked,
  onChange,
  disabled = false,
  size = SelectionCheckboxSize.MEDIUM,
  className,
}: SelectionCheckboxProps): React.ReactElement {
  const handleClick = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation();
      if (!disabled) {
        onChange(!checked);
      }
    },
    [disabled, checked, onChange]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        selectionCheckboxVariants({ size, checked, disabled }),
        className
      )}
    >
      {checked && (
        <Icon
          icon={Check}
          size={IconSize.XSMALL}
          className="text-white"
          strokeWidth={3}
        />
      )}
    </button>
  );
});
