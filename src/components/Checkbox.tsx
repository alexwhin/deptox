import { memo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import { cn } from "../utilities/cn";
import { Text, TextVariant } from "./Typography";
import { Icon, IconSize } from "./Icon";

const checkboxButtonVariants = cva(
  [
    "w-full",
    "flex",
    "items-center",
    "gap-2.5",
    "px-3",
    "py-2",
    "rounded-md",
    "transition-colors",
    "text-left",
  ],
  {
    variants: {
      checked: {
        true: "",
        false:
          "bg-surface-overlay-light dark:bg-surface-overlay/50 hover:bg-surface-border-light dark:hover:bg-surface-overlay",
      },
      color: {
        default: "",
        node: "",
        composer: "",
        bundler: "",
        pods: "",
        venv: "",
        elixir: "",
        dart: "",
        go: "",
        danger: "",
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed",
        false: "cursor-pointer",
      },
    },
    compoundVariants: [
      {
        checked: true,
        color: "default",
        className:
          "bg-primary/15 hover:bg-primary/25 dark:bg-primary/20 dark:hover:bg-primary/30",
      },
      {
        checked: true,
        color: "node",
        className:
          "bg-category-node/15 hover:bg-category-node/25 dark:bg-category-node/20 dark:hover:bg-category-node/30",
      },
      {
        checked: true,
        color: "composer",
        className:
          "bg-category-composer/15 hover:bg-category-composer/25 dark:bg-category-composer/20 dark:hover:bg-category-composer/30",
      },
      {
        checked: true,
        color: "bundler",
        className:
          "bg-category-bundler/15 hover:bg-category-bundler/25 dark:bg-category-bundler/20 dark:hover:bg-category-bundler/30",
      },
      {
        checked: true,
        color: "pods",
        className:
          "bg-category-pods/15 hover:bg-category-pods/25 dark:bg-category-pods/20 dark:hover:bg-category-pods/30",
      },
      {
        checked: true,
        color: "venv",
        className:
          "bg-category-venv/15 hover:bg-category-venv/25 dark:bg-category-venv/20 dark:hover:bg-category-venv/30",
      },
      {
        checked: true,
        color: "elixir",
        className:
          "bg-category-elixir/15 hover:bg-category-elixir/25 dark:bg-category-elixir/20 dark:hover:bg-category-elixir/30",
      },
      {
        checked: true,
        color: "dart",
        className:
          "bg-category-dart/15 hover:bg-category-dart/25 dark:bg-category-dart/20 dark:hover:bg-category-dart/30",
      },
      {
        checked: true,
        color: "go",
        className:
          "bg-category-go/15 hover:bg-category-go/25 dark:bg-category-go/20 dark:hover:bg-category-go/30",
      },
      {
        checked: true,
        color: "danger",
        className:
          "bg-danger/15 hover:bg-danger/25 dark:bg-danger/20 dark:hover:bg-danger/30",
      },
    ],
    defaultVariants: {
      checked: false,
      disabled: false,
    },
  }
);

const checkboxIndicatorVariants = cva(
  [
    "shrink-0",
    "w-4",
    "h-4",
    "rounded",
    "flex",
    "items-center",
    "justify-center",
  ],
  {
    variants: {
      checked: {
        true: "border-2",
        false:
          "border border-surface-border-light dark:border-surface-muted bg-surface-base-light dark:bg-surface-raised",
      },
      color: {
        default: "",
        node: "",
        composer: "",
        bundler: "",
        pods: "",
        venv: "",
        elixir: "",
        dart: "",
        go: "",
        danger: "",
      },
    },
    compoundVariants: [
      {
        checked: true,
        color: "default",
        className: "bg-primary border-primary",
      },
      {
        checked: true,
        color: "node",
        className: "bg-category-node border-category-node",
      },
      {
        checked: true,
        color: "composer",
        className: "bg-category-composer border-category-composer",
      },
      {
        checked: true,
        color: "bundler",
        className: "bg-category-bundler border-category-bundler",
      },
      {
        checked: true,
        color: "pods",
        className: "bg-category-pods border-category-pods",
      },
      {
        checked: true,
        color: "venv",
        className: "bg-category-venv border-category-venv",
      },
      {
        checked: true,
        color: "elixir",
        className: "bg-category-elixir border-category-elixir",
      },
      {
        checked: true,
        color: "dart",
        className: "bg-category-dart border-category-dart",
      },
      {
        checked: true,
        color: "go",
        className: "bg-category-go border-category-go",
      },
      {
        checked: true,
        color: "danger",
        className: "bg-danger border-danger",
      },
    ],
    defaultVariants: {
      checked: false,
    },
  }
);

type CheckboxColor = NonNullable<
  VariantProps<typeof checkboxButtonVariants>["color"]
>;

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  color?: CheckboxColor;
  disabled?: boolean;
  className?: string;
}

export const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  label,
  color = "node",
  disabled = false,
  className,
}: CheckboxProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        checkboxButtonVariants({ checked, color, disabled }),
        className
      )}
    >
      <div
        className={checkboxIndicatorVariants({ checked, color })}
        aria-hidden="true"
      >
        {checked && (
          <Icon
            icon={Check}
            size={IconSize.XSMALL}
            className="text-white"
            strokeWidth={3}
          />
        )}
      </div>
      <Text variant={TextVariant.CAPTION}>{label}</Text>
    </button>
  );
});

export { type CheckboxColor };
