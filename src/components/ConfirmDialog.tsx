import { useRef } from "react";
import { Text, TextVariant, TextIntent } from "./Typography";
import { Button, ButtonVariant } from "./Button";
import { MiniTable } from "./MiniTable";
import { DialogOverlay } from "./DialogOverlay";
import { cn } from "../utilities/cn";
import type { DirectoryInfo } from "../hooks/useConfirmDialog";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  directories?: DirectoryInfo[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  directories = [],
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogOverlay
      onClose={onCancel}
      ariaLabelledBy="confirm-dialog-title"
      ariaDescribedBy="confirm-dialog-message"
      initialFocusRef={cancelButtonRef}
    >
      <Text
        variant={TextVariant.TITLE}
        as="h2"
        id="confirm-dialog-title"
        className="mb-1"
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.CAPTION}
        intent={TextIntent.MUTED}
        as="p"
        id="confirm-dialog-message"
        className={cn("leading-snug", directories.length > 0 ? "mb-2" : "mb-4")}
      >
        {message}
      </Text>

      {directories.length > 0 && (
        <div className="mb-4">
          <MiniTable
            items={directories.map((directory) => ({
              path: directory.path,
              sizeBytes: directory.sizeBytes,
            }))}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          ref={cancelButtonRef}
          variant={ButtonVariant.SECONDARY}
          fullWidth={true}
          onClick={onCancel}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={ButtonVariant.DANGER}
          fullWidth={true}
          onClick={onConfirm}
          aria-label={confirmLabel}
        >
          {confirmLabel}
        </Button>
      </div>
    </DialogOverlay>
  );
}
