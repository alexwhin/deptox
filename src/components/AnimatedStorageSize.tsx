import { useState, useEffect, useRef } from "react";
import { Text, TextVariant, TextIntent } from "./Typography";
import { formatBytes } from "../utilities/formatBytes";

interface AnimatedStorageSizeProps {
  bytes: number;
  variant?: TextVariant;
  intent?: TextIntent;
  className?: string;
  durationMs?: number;
  decimalPlaces?: number;
}

export function AnimatedStorageSize({
  bytes,
  variant = TextVariant.SIZE,
  intent = TextIntent.DEFAULT,
  className,
  durationMs = 300,
  decimalPlaces = 0,
}: AnimatedStorageSizeProps): React.ReactElement {
  const [displayValue, setDisplayValue] = useState(bytes);
  const previousValue = useRef(bytes);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    if (bytes === previousValue.current) {
      return;
    }

    const startValue = previousValue.current;
    const endValue = bytes;
    const startTimestamp = performance.now();

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        previousValue.current = endValue;
        animationFrame.current = null;
      }
    };

    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
    }

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [bytes, durationMs]);

  return (
    <Text variant={variant} intent={intent} className={className} as="span">
      {formatBytes(displayValue, decimalPlaces)}
    </Text>
  );
}
