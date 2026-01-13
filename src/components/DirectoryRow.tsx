import { memo, type ReactNode } from "react";
import { Info } from "lucide-react";
import { TruncateStart } from "./TruncateStart";
import { Icon, IconSize } from "./Icon";
import { Text, TextVariant, TextIntent, Divider, Pill, CategoryPill } from "./Typography";
import { AnimatedStorageSize } from "./AnimatedStorageSize";
import { cn } from "../utilities/cn";
import type { DependencyCategory } from "../types/dependencyCategory";

export enum DirectoryRowVariant {
  DEFAULT = "DEFAULT",
  LOADING = "LOADING",
}

interface DirectoryRowProps {
  variant?: DirectoryRowVariant;
  projectName: string;
  monorepoName?: string | null | undefined;
  displayPath: string;
  category?: DependencyCategory | undefined;
  sizeBytes: number;
  timeText: string;
  timeTooltip?: string | undefined;
  menuSlot?: ReactNode | undefined;
  checkboxSlot?: ReactNode | undefined;
  isLast?: boolean;
  hasWarnings?: boolean;
  onInfoClick?: (() => void) | undefined;
  onPathClick?: (() => void) | undefined;
}

export const DirectoryRow = memo(function DirectoryRow({
  variant = DirectoryRowVariant.DEFAULT,
  projectName,
  monorepoName,
  displayPath,
  category,
  sizeBytes,
  timeText,
  timeTooltip,
  menuSlot,
  checkboxSlot,
  isLast = false,
  hasWarnings = false,
  onInfoClick,
  onPathClick,
}: DirectoryRowProps): React.ReactElement {
  const isLoading = variant === DirectoryRowVariant.LOADING;
  const textIntent = isLoading ? TextIntent.MUTED : TextIntent.DEFAULT;
  const mutedTextIntent = TextIntent.MUTED;

  const rowClasses = cn(
    "flex items-center gap-3 px-3 py-2.5 min-h-14",
    !isLast && "border-b border-surface-border-light dark:border-surface-border",
    isLoading && "opacity-50"
  );

  return (
    <div className={rowClasses}>
      {checkboxSlot && (
        <div className="flex items-center justify-center shrink-0">
          {checkboxSlot}
        </div>
      )}

      <div className="flex-1 min-w-0 overflow-hidden space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            {monorepoName && (
              <>
                <Text variant={TextVariant.TITLE} intent={mutedTextIntent} truncate={true}>
                  {monorepoName}
                </Text>
                <Divider />
              </>
            )}
            <Text variant={TextVariant.TITLE} intent={textIntent} truncate={true}>
              {projectName}
            </Text>
          </div>
          <div className="flex items-center gap-1.5">
            {hasWarnings && !isLoading && (
              <Icon
                icon={Info}
                size={IconSize.SMALL}
                onClick={onInfoClick}
                ariaLabel="Directory warnings"
                title="View directory warnings"
                className="text-primary"
              />
            )}
            <AnimatedStorageSize
              bytes={sizeBytes}
              intent={textIntent}
              decimalPlaces={sizeBytes > 0 ? 2 : 0}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 max-w-[65%]">
            {category ? (
              <CategoryPill category={category} className={cn(isLoading && "opacity-50")} />
            ) : (
              <Pill className="opacity-50">UNKNOWN</Pill>
            )}
            <TruncateStart
              text={displayPath}
              className={cn(
                "text-xs",
                isLoading
                  ? "text-text-disabled dark:text-text-disabled-dark"
                  : "text-text-muted dark:text-text-muted-dark"
              )}
              onClick={isLoading ? undefined : onPathClick}
            />
          </div>
          <Text
            variant={TextVariant.CAPTION}
            intent={mutedTextIntent}
            className="shrink-0"
            title={timeTooltip}
          >
            {timeText}
          </Text>
        </div>
      </div>

      {menuSlot}
    </div>
  );
});
