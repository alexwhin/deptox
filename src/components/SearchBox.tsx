import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Search } from "lucide-react";
import { Input } from "./Input";
import { Icon, IconSize } from "./Icon";

const DEBOUNCE_DELAY_MS = 150;

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBox = memo(function SearchBox({
  value,
  onChange,
}: SearchBoxProps): React.ReactElement {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const newValue = event.target.value;
      setLocalValue(newValue);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (newValue === "") {
        onChange(newValue);
      } else {
        timeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, DEBOUNCE_DELAY_MS);
      }
    },
    [onChange]
  );

  const handleClear = useCallback((): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLocalValue("");
    onChange("");
  }, [onChange]);

  const showClearButton = localValue.length > 0;

  return (
    <div className="px-3 pt-3 pb-1">
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={t("search.placeholder")}
        inlineButton={
          <span className="shrink-0 mr-2 text-text-muted dark:text-text-muted-dark">
            {showClearButton ? (
              <Icon
                icon={X}
                size={IconSize.MEDIUM}
                onClick={handleClear}
                ariaLabel={t("search.clear")}
              />
            ) : (
              <Icon icon={Search} size={IconSize.MEDIUM} ariaHidden={true} />
            )}
          </span>
        }
      />
    </div>
  );
});
