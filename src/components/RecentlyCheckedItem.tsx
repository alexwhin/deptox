import { memo } from "react";
import { getProjectName } from "../utilities/pathParser";
import { DirectoryRow, DirectoryRowVariant } from "./DirectoryRow";
import { ContextMenu } from "./ContextMenu";
import { SelectionCheckbox } from "./SelectionCheckbox";

interface RecentlyCheckedItemProps {
  path: string;
  isLast?: boolean;
  showCheckbox?: boolean;
}

const EMPTY_MENU_ITEMS: [] = [];

export const RecentlyCheckedItem = memo(function RecentlyCheckedItem({
  path,
  isLast = false,
  showCheckbox = false,
}: RecentlyCheckedItemProps): React.ReactElement {
  const projectName = getProjectName(path);

  return (
    <DirectoryRow
      variant={DirectoryRowVariant.LOADING}
      projectName={projectName}
      displayPath={path}
      sizeBytes={0}
      timeText="scanning"
      checkboxSlot={
        showCheckbox ? <SelectionCheckbox checked={false} onChange={() => {}} disabled={true} /> : undefined
      }
      menuSlot={<ContextMenu items={EMPTY_MENU_ITEMS} disabled={true} />}
      isLast={isLast}
    />
  );
});
