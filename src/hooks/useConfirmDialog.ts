import { useState, useCallback } from "react";

export interface DirectoryInfo {
  path: string;
  sizeBytes: number;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  directories: DirectoryInfo[];
  onConfirm: () => void;
}

interface ShowConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  directories?: DirectoryInfo[];
}

interface UseConfirmDialogResult {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  directories: DirectoryInfo[];
  showConfirmDialog: (options: ShowConfirmDialogOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const initialState: ConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  directories: [],
  onConfirm: () => {},
};

export function useConfirmDialog(): UseConfirmDialogResult {
  const [state, setState] = useState<ConfirmDialogState>(initialState);

  const showConfirmDialog = useCallback(
    (options: ShowConfirmDialogOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          directories: options.directories ?? [],
          onConfirm: () => resolve(true),
        });
      });
    },
    []
  );

  const handleConfirm = useCallback((): void => {
    state.onConfirm();
    setState(initialState);
  }, [state]);

  const handleCancel = useCallback((): void => {
    setState(initialState);
  }, []);

  return {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    directories: state.directories,
    showConfirmDialog,
    handleConfirm,
    handleCancel,
  };
}
