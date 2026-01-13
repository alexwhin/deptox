import { memo, type ElementType } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../utilities/cn";
import {
  DependencyCategory,
  DEPENDENCY_CATEGORY_SHORT_LABELS,
} from "../types/dependencyCategory";

export enum TextVariant {
  HEADING = "HEADING",
  TITLE = "TITLE",
  BODY = "BODY",
  BODY_MEDIUM = "BODY_MEDIUM",
  CAPTION = "CAPTION",
  SIZE = "SIZE",
}

export enum TextIntent {
  DEFAULT = "DEFAULT",
  MUTED = "MUTED",
  DANGER = "DANGER",
  SUCCESS = "SUCCESS",
}

interface TypographyProps {
  variant?: TextVariant;
  intent?: TextIntent;
  children: React.ReactNode;
  className?: string | undefined;
  truncate?: boolean;
  as?: ElementType;
  id?: string | undefined;
  title?: string | undefined;
}

const textVariants = cva("", {
  variants: {
    variant: {
      [TextVariant.HEADING]: "text-base font-semibold",
      [TextVariant.TITLE]: "text-sm font-semibold",
      [TextVariant.BODY]: "text-sm leading-normal",
      [TextVariant.BODY_MEDIUM]: "text-sm font-medium",
      [TextVariant.CAPTION]: "text-[0.8125rem]",
      [TextVariant.SIZE]: "text-sm font-semibold tabular-nums",
    },
    intent: {
      [TextIntent.DEFAULT]: "text-text-primary dark:text-text-primary-dark",
      [TextIntent.MUTED]: "text-text-muted dark:text-text-muted-dark",
      [TextIntent.DANGER]: "text-danger",
      [TextIntent.SUCCESS]: "text-success",
    },
    truncate: {
      true: "truncate",
      false: "",
    },
  },
  defaultVariants: {
    variant: TextVariant.BODY,
    intent: TextIntent.DEFAULT,
    truncate: false,
  },
});

export const Text = memo(function Text({
  variant = TextVariant.BODY,
  intent = TextIntent.DEFAULT,
  children,
  className,
  truncate = false,
  as: Component = "span",
  id,
  title,
}: TypographyProps): React.ReactElement {
  return (
    <Component
      id={id}
      title={title}
      className={cn(
        textVariants({ variant, intent, truncate }),
        className
      )}
    >
      {children}
    </Component>
  );
});

export { Text as Typography };

interface DividerProps {
  className?: string;
}

const dividerVariants = cva([
  "inline-flex",
  "items-center",
  "justify-center",
  "text-[0.7em]",
  "text-text-disabled",
  "dark:text-text-disabled-dark",
]);

export const Divider = memo(function Divider({
  className,
}: DividerProps): React.ReactElement {
  return (
    <span
      className={cn(dividerVariants(), className)}
      aria-hidden="true"
    >
      /
    </span>
  );
});

interface PillProps {
  children: React.ReactNode;
  className?: string;
}

const pillVariants = cva([
  "inline-flex",
  "items-center",
  "shrink-0",
  "px-1",
  "py-px",
  "rounded",
  "text-[0.5rem]",
  "font-normal",
  "uppercase",
  "tracking-wider",
  "bg-surface-border-light",
  "dark:bg-surface-overlay",
  "text-text-muted",
  "dark:text-text-muted-dark",
  "leading-none",
]);

export const Pill = memo(function Pill({
  children,
  className,
}: PillProps): React.ReactElement {
  return (
    <span className={cn(pillVariants(), className)}>{children}</span>
  );
});

const categoryPillVariants = cva(
  [
    "inline-flex",
    "items-center",
    "shrink-0",
    "px-1",
    "py-0.5",
    "rounded",
    "text-[0.57rem]",
    "font-semibold",
    "uppercase",
    "tracking-wider",
    "leading-none",
  ],
  {
    variants: {
      category: {
        [DependencyCategory.NODE_MODULES]:
          "bg-category-node/15 text-category-node dark:bg-category-node/20 dark:text-category-node",
        [DependencyCategory.COMPOSER]:
          "bg-category-composer/15 text-category-composer dark:bg-category-composer/20 dark:text-category-composer",
        [DependencyCategory.BUNDLER]:
          "bg-category-bundler/15 text-category-bundler dark:bg-category-bundler/20 dark:text-category-bundler",
        [DependencyCategory.PODS]:
          "bg-category-pods/15 text-category-pods dark:bg-category-pods/20 dark:text-category-pods",
        [DependencyCategory.PYTHON_VENV]:
          "bg-category-venv/15 text-category-venv dark:bg-category-venv/20 dark:text-category-venv",
        [DependencyCategory.ELIXIR_DEPS]:
          "bg-category-elixir/15 text-category-elixir dark:bg-category-elixir/20 dark:text-category-elixir",
        [DependencyCategory.DART_TOOL]:
          "bg-category-dart/15 text-category-dart dark:bg-category-dart/20 dark:text-category-dart",
        [DependencyCategory.GO_MOD]:
          "bg-category-go/15 text-category-go dark:bg-category-go/20 dark:text-category-go",
      },
    },
  }
);

interface CategoryPillProps {
  category: DependencyCategory;
  className?: string;
}

export const CategoryPill = memo(function CategoryPill({
  category,
  className,
}: CategoryPillProps): React.ReactElement {
  const label = DEPENDENCY_CATEGORY_SHORT_LABELS[category];

  return (
    <span className={cn(categoryPillVariants({ category }), className)}>
      {label}
    </span>
  );
});
