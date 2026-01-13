import { useState, useCallback } from "react";

interface UseTextInputOptions {
  initialValue: string;
  onPersist: (value: string) => Promise<void> | void;
}

interface UseTextInputResult {
  value: string;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  setValue: (value: string) => void;
}

export function useTextInput({
  initialValue,
  onPersist,
}: UseTextInputOptions): UseTextInputResult {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setLocalValue(event.target.value);
    },
    []
  );

  const handleBlur = useCallback(async (): Promise<void> => {
    await onPersist(localValue);
  }, [localValue, onPersist]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      }
    },
    []
  );

  return {
    value: localValue,
    handleChange,
    handleBlur,
    handleKeyDown,
    setValue: setLocalValue,
  };
}
