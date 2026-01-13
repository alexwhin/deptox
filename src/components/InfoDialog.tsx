import { useRef } from "react";
import { Text, TextVariant } from "./Typography";
import { Button, ButtonVariant } from "./Button";
import { DialogOverlay } from "./DialogOverlay";

export interface WarningItem {
  title: string;
  message: string;
}

interface InfoDialogProps {
  title: string;
  message?: string;
  warnings?: WarningItem[];
  closeLabel?: string;
  onClose: () => void;
}

export function InfoDialog({
  title,
  message,
  warnings,
  closeLabel = "Close",
  onClose,
}: InfoDialogProps): React.ReactElement {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <DialogOverlay
      onClose={onClose}
      ariaLabelledBy="info-dialog-title"
      ariaDescribedBy={message ? "info-dialog-message" : undefined}
      initialFocusRef={closeButtonRef}
    >
      <Text
        variant={TextVariant.TITLE}
        as="h2"
        id="info-dialog-title"
        className="mb-1"
      >
        {title}
      </Text>

      {message && (
        <Text
          variant={TextVariant.CAPTION}
          as="p"
          id="info-dialog-message"
          className="mb-6 leading-normal"
        >
          {message}
        </Text>
      )}

      {warnings && warnings.length > 0 && (
        <div className="space-y-2 mb-6">
          {warnings.map((warning, index) => (
            <Text
              key={index}
              variant={TextVariant.CAPTION}
              as="p"
              className="leading-normal"
            >
              <span className="font-semibold">{warning.title}:</span> {warning.message}
            </Text>
          ))}
        </div>
      )}

      <div className="flex">
        <Button
          ref={closeButtonRef}
          variant={ButtonVariant.PRIMARY}
          fullWidth={true}
          onClick={onClose}
          aria-label={closeLabel}
        >
          {closeLabel}
        </Button>
      </div>
    </DialogOverlay>
  );
}
