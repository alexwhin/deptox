import { TruncateStart } from "./TruncateStart";
import { Text, TextVariant, TextIntent } from "./Typography";
import { formatBytes } from "../utilities/formatBytes";
import { cn } from "../utilities/cn";

export interface MiniTableItem {
  path: string;
  sizeBytes: number;
}

interface MiniTableRowProps {
  item: MiniTableItem;
  isLast: boolean;
  onClick?: ((path: string) => void) | undefined;
}

function MiniTableRow({
  item,
  isLast,
  onClick,
}: MiniTableRowProps): React.ReactElement {
  const content = (
    <>
      <TruncateStart
        text={item.path}
        className="text-xs text-text-muted dark:text-text-muted-dark min-w-0 flex-1"
      />
      <Text
        variant={TextVariant.CAPTION}
        intent={TextIntent.MUTED}
        className="tabular-nums shrink-0"
      >
        {formatBytes(item.sizeBytes)}
      </Text>
    </>
  );

  const rowClasses = cn(
    "flex items-center justify-between gap-3 py-0.5",
    !isLast && "border-b border-surface-border-light dark:border-surface-border"
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(item.path)}
        className={cn(rowClasses, "w-full text-left cursor-pointer")}
      >
        {content}
      </button>
    );
  }

  return <div className={rowClasses}>{content}</div>;
}

interface MiniTablePlaceholderRowProps {
  isLast: boolean;
}

function MiniTablePlaceholderRow({
  isLast,
}: MiniTablePlaceholderRowProps): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-0.5",
        !isLast && "border-b border-surface-border-light dark:border-surface-border"
      )}
    >
      <Text
        variant={TextVariant.CAPTION}
        intent={TextIntent.MUTED}
        className="min-w-0 flex-1"
      >
        —
      </Text>
      <Text
        variant={TextVariant.CAPTION}
        intent={TextIntent.MUTED}
        className="tabular-nums shrink-0 opacity-50"
      >
        0KB
      </Text>
    </div>
  );
}

interface MiniTableProps {
  items: MiniTableItem[];
  isLoading?: boolean;
  placeholderCount?: number;
  maxItems?: number;
  emptyMessage?: string;
  onItemClick?: (path: string) => void;
}

export function MiniTable({
  items,
  isLoading = false,
  placeholderCount = 8,
  maxItems,
  emptyMessage = "No items",
  onItemClick,
}: MiniTableProps): React.ReactElement {
  const itemLimit = maxItems ?? placeholderCount;
  const displayItems = items.slice(0, itemLimit);
  if (isLoading) {
    return (
      <div className="space-y-0.5">
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <MiniTablePlaceholderRow
            key={index}
            isLast={index === placeholderCount - 1}
          />
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <Text variant={TextVariant.CAPTION} intent={TextIntent.MUTED}>
          {emptyMessage}
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {displayItems.map((item, index) => (
        <MiniTableRow
          key={item.path}
          item={item}
          isLast={index === displayItems.length - 1}
          onClick={onItemClick}
        />
      ))}
    </div>
  );
}
