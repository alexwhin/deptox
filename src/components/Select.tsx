import { memo, forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "../utilities/cn";
import { Icon, IconSize } from "./Icon";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
}

const selectWrapperVariants = cva([
  "relative",
  "flex",
  "items-center",
  "rounded-md",
  "bg-surface-overlay-light",
  "dark:bg-surface-overlay/50",
]);

const selectVariants = cva([
  "w-full",
  "appearance-none",
  "px-3",
  "py-2",
  "pr-8",
  "bg-transparent",
  "text-text-primary",
  "dark:text-text-primary-dark",
  "focus:outline-none",
  "text-[0.8125rem]",
  "font-normal",
  "cursor-pointer",
]);

export const Select = memo(
  forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { options, className, ...props },
    ref
  ): React.ReactElement {
    return (
      <div className={cn(selectWrapperVariants(), className)}>
        <select ref={ref} className={selectVariants()} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="absolute right-2 pointer-events-none">
          <Icon icon={ChevronDown} size={IconSize.MEDIUM} className="text-text-muted dark:text-text-muted-dark" />
        </span>
      </div>
    );
  })
);
