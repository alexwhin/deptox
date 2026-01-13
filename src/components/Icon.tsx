import { memo, forwardRef, type ComponentType } from "react";
import { cn } from "../utilities/cn";

export enum IconSize {
  XSMALL = "XSMALL",
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
  XLARGE = "XLARGE",
}

const SIZE_CLASSES: Record<IconSize, string> = {
  [IconSize.XSMALL]: "w-2.5 h-2.5",
  [IconSize.SMALL]: "w-3.5 h-3.5",
  [IconSize.MEDIUM]: "w-4 h-4",
  [IconSize.LARGE]: "w-5 h-5",
  [IconSize.XLARGE]: "w-8 h-8",
};

interface IconProps {
  icon: ComponentType<{ className?: string | undefined; strokeWidth?: number | undefined }>;
  size?: IconSize;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
  ariaLabel?: string | undefined;
  title?: string | undefined;
  strokeWidth?: number | undefined;
  ariaHidden?: boolean | undefined;
}

export const Icon = memo(
  forwardRef<HTMLButtonElement, IconProps>(function Icon(
    {
      icon: IconComponent,
      size = IconSize.MEDIUM,
      className,
      onClick,
      ariaLabel,
      title,
      strokeWidth,
      ariaHidden,
    },
    ref
  ): React.ReactElement {
    const sizeClass = SIZE_CLASSES[size];

    if (onClick) {
      return (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          className="inline-flex items-center justify-center p-1 cursor-pointer group rounded"
          aria-label={ariaLabel}
          title={title}
        >
          <IconComponent
            className={cn(sizeClass, "group-hover:opacity-50", className)}
            strokeWidth={strokeWidth}
            aria-hidden={ariaHidden}
          />
        </button>
      );
    }

    return (
      <IconComponent
        className={cn(sizeClass, className)}
        strokeWidth={strokeWidth}
        aria-hidden={ariaHidden}
      />
    );
  })
);
