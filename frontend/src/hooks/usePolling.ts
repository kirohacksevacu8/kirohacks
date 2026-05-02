import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsePollingOptions<T> {
  /** Async function to call on each poll tick. */
  fn: () => Promise<T>;
  /** Interval between polls in milliseconds. */
  intervalMs: number;
  /** Return `true` to stop polling after receiving a result. */
  shouldStop: (result: T) => boolean;
  /** Called with each poll result. */
  onResult?: (result: T) => void;
  /** Called if the poll function throws. */
  onError?: (error: unknown) => void;
}

export interface UsePollingReturn {
  /** Whether the hook is currently polling. */
  isPolling: boolean;
  /** Start polling. No-op if already polling. */
  start: () => void;
  /** Stop polling immediately. */
  stop: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePolling<T>(options: UsePollingOptions<T>): UsePollingReturn {
  const { fn, intervalMs, shouldStop, onResult, onError } = options;

  const [isPolling, setIsPolling] = useState(false);

  // Keep a mutable ref so the interval callback always sees the latest values
  // without needing to restart the interval when callbacks change.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    setIsPolling(false);
  }, [clearTimer]);

  const tick = useCallback(async () => {
    if (!activeRef.current) return;

    try {
      const result = await optionsRef.current.fn();

      if (!activeRef.current) return; // stopped while awaiting

      optionsRef.current.onResult?.(result);

      if (optionsRef.current.shouldStop(result)) {
        stop();
        return;
      }
    } catch (err: unknown) {
      if (!activeRef.current) return;
      optionsRef.current.onError?.(err);
      stop();
      return;
    }

    // Schedule next tick
    if (activeRef.current) {
      timerRef.current = setTimeout(() => void tick(), optionsRef.current.intervalMs);
    }
  }, [stop]);

  const start = useCallback(() => {
    if (activeRef.current) return; // already polling
    activeRef.current = true;
    setIsPolling(true);
    void tick();
  }, [tick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  // Suppress unused-variable warnings for the options destructured above.
  // They exist so callers get type-checking on the options object; the actual
  // values are read from optionsRef inside the tick loop.
  void fn;
  void intervalMs;
  void shouldStop;
  void onResult;
  void onError;

  return { isPolling, start, stop };
}
