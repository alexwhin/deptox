import { useRef, useEffect, type ReactNode, type RefObject } from "react";
import { useDialogKeyboardTrap } from "../hooks/useDialogKeyboardTrap";
import { cn } from "../utilities/cn";

export enum DialogSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
}

const SIZE_CLASSES: Record<DialogSize, string> = {
  [DialogSize.SMALL]: "max-w-xs w-full",
  [DialogSize.MEDIUM]: "w-4/5",
};

interface DialogOverlayProps {
  children: ReactNode;
  onClose: () => void;
  ariaLabelledBy: string;
  ariaDescribedBy?: string | undefined;
  size?: DialogSize;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  noPadding?: boolean;
}

export function DialogOverlay({
  children,
  onClose,
  ariaLabelledBy,
  ariaDescribedBy,
  size = DialogSize.SMALL,
  initialFocusRef,
  noPadding = false,
}: DialogOverlayProps): React.ReactElement {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef]);

  useDialogKeyboardTrap({
    dialogRef,
    onEscape: onClose,
    focusableSelector: "button:not([disabled])",
  });

  return (
    <div
      className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      <div
        ref={dialogRef}
        className={cn(
          "bg-surface-base-light dark:bg-surface-raised rounded-lg shadow-xl",
          !noPadding && "p-4",
          SIZE_CLASSES[size]
        )}
      >
        {children}
      </div>
    </div>
  );
}
