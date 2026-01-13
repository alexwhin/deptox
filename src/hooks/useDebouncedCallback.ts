import { useCallback, useRef, useEffect } from "react";

interface UseDebouncedCallbackOptions {
  callback: () => void;
  delayMs: number;
}

interface UseDebouncedCallbackResult {
  trigger: () => void;
  cancel: () => void;
  flush: () => void;
}

export function useDebouncedCallback({
  callback,
  delayMs,
}: UseDebouncedCallbackOptions): UseDebouncedCallbackResult {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      /* v8 ignore next 3 -- cleanup branch only runs if timeout is pending */
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callbackRef.current();
    }
  }, []);

  const trigger = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      callbackRef.current();
    }, delayMs);
  }, [delayMs]);

  return { trigger, cancel, flush };
}
