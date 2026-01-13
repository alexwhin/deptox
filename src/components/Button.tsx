import { memo, forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../utilities/cn";

export enum ButtonVariant {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
  GHOST = "GHOST",
  DANGER = "DANGER",
}

export enum ButtonSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-md",
    "font-semibold",
    "transition-colors",
    "duration-200",
  ],
  {
    variants: {
      variant: {
        [ButtonVariant.PRIMARY]: "bg-primary hover:bg-primary/90 text-white",
        [ButtonVariant.SECONDARY]:
          "bg-surface-overlay-light dark:bg-surface-overlay/50 hover:bg-surface-border-light dark:hover:bg-surface-overlay text-text-primary dark:text-text-primary-dark",
        [ButtonVariant.GHOST]:
          "bg-transparent hover:bg-surface-overlay-light dark:hover:bg-surface-overlay text-text-secondary dark:text-text-secondary-dark",
        [ButtonVariant.DANGER]: "bg-danger hover:bg-danger/90 text-white",
      },
      size: {
        [ButtonSize.SMALL]: "px-3 py-1.5 text-xs",
        [ButtonSize.MEDIUM]: "px-4 py-2.5 text-sm",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "cursor-pointer",
      },
    },
    defaultVariants: {
      variant: ButtonVariant.PRIMARY,
      size: ButtonSize.MEDIUM,
      fullWidth: false,
      disabled: false,
    },
  }
);

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
      variant = ButtonVariant.PRIMARY,
      size = ButtonSize.MEDIUM,
      fullWidth = false,
      loading = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ): React.ReactElement {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          buttonVariants({ variant, size, fullWidth, disabled: isDisabled }),
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  })
);
