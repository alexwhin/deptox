import { memo, forwardRef, useCallback, type InputHTMLAttributes, type ReactNode, type KeyboardEvent } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../utilities/cn";

export enum InputVariant {
  TEXT = "TEXT",
  NUMBER = "NUMBER",
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  variant?: InputVariant;
  inlineSuffix?: string;
  inlineButton?: ReactNode;
}

const BLOCKED_NUMBER_KEYS = [".", ",", "e", "E", "+", "-"];

const inputWrapperVariants = cva([
  "flex",
  "items-center",
  "rounded-md",
  "bg-surface-overlay-light",
  "dark:bg-surface-overlay/50",
]);

const inputVariants = cva(
  [
    "flex-1",
    "min-w-0",
    "px-3",
    "py-2",
    "bg-transparent",
    "text-text-primary",
    "dark:text-text-primary-dark",
    "focus:outline-none",
    "text-[0.8125rem]",
    "font-normal",
  ],
  {
    variants: {
      variant: {
        [InputVariant.TEXT]: "",
        [InputVariant.NUMBER]: [
          "[appearance:textfield]",
          "[&::-webkit-outer-spin-button]:appearance-none",
          "[&::-webkit-inner-spin-button]:appearance-none",
        ],
      },
    },
    defaultVariants: {
      variant: InputVariant.TEXT,
    },
  }
);

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(function Input(
    { variant = InputVariant.TEXT, inlineSuffix, inlineButton, className, onKeyDown, ...props },
    ref
  ): React.ReactElement {
    const inputType = variant === InputVariant.NUMBER ? "number" : "text";

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>): void => {
        if (variant === InputVariant.NUMBER && BLOCKED_NUMBER_KEYS.includes(event.key)) {
          event.preventDefault();
        }
        onKeyDown?.(event);
      },
      [variant, onKeyDown]
    );

    return (
      <div className={cn(inputWrapperVariants(), className)}>
        <input
          ref={ref}
          type={inputType}
          className={inputVariants({ variant })}
          onKeyDown={handleKeyDown}
          {...props}
        />
        {inlineSuffix && (
          <span className="pr-3 text-[0.8125rem] text-text-muted dark:text-text-muted-dark select-none">
            {inlineSuffix}
          </span>
        )}
        {inlineButton}
      </div>
    );
  })
);
