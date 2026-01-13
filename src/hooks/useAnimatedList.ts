import { useState, useEffect, useCallback, useRef } from "react";

interface AnimatedItem<T> {
  item: T;
  key: string;
  isExiting: boolean;
}

interface UseAnimatedListOptions<T> {
  items: T[];
  getKey: (item: T) => string;
}

interface UseAnimatedListResult<T> {
  animatedItems: AnimatedItem<T>[];
  handleExitComplete: (key: string) => void;
}

export function useAnimatedList<T>({
  items,
  getKey,
}: UseAnimatedListOptions<T>): UseAnimatedListResult<T> {
  const [animatedItems, setAnimatedItems] = useState<AnimatedItem<T>[]>(() =>
    items.map((item) => ({ item, key: getKey(item), isExiting: false }))
  );

  const previousKeysRef = useRef<Set<string>>(new Set(items.map(getKey)));
  const exitingKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentKeys = new Set(items.map(getKey));
    const previousKeys = previousKeysRef.current;

    const removedKeys = new Set(
      [...previousKeys].filter(
        (key) => !currentKeys.has(key) && !exitingKeysRef.current.has(key)
      )
    );

    for (const key of removedKeys) {
      exitingKeysRef.current.add(key);
    }

    setAnimatedItems((current) => {
      const exitingItems = current
        .filter((animated) => removedKeys.has(animated.key))
        .map((animated) => ({ ...animated, isExiting: true }));

      const newItems = items.map((item) => ({
        item,
        key: getKey(item),
        isExiting: false,
      }));

      return [...newItems, ...exitingItems];
    });

    previousKeysRef.current = currentKeys;
  }, [items, getKey]);

  const handleExitComplete = useCallback((key: string): void => {
    exitingKeysRef.current.delete(key);
    setAnimatedItems((current) =>
      current.filter((animated) => animated.key !== key)
    );
  }, []);

  return { animatedItems, handleExitComplete };
}
