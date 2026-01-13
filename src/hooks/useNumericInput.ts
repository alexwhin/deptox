import { useState, useCallback } from "react";

interface UseNumericInputOptions {
  initialValue: number;
  minValue?: number;
  onPersist: (value: number) => Promise<void> | void;
}

interface UseNumericInputResult {
  value: number;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => Promise<void>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function useNumericInput({
  initialValue,
  minValue = 0,
  onPersist,
}: UseNumericInputOptions): UseNumericInputResult {
  const [localValue, setLocalValue] = useState(initialValue);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = parseInt(event.target.value, 10);
      if (!isNaN(value) && value >= minValue) {
        setLocalValue(value);
      }
    },
    [minValue]
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
  };
}
