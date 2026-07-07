import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to throttle a callback function using requestAnimationFrame.
 * Highly recommended for mousemove, touchmove, scrolling, and canvas drawing.
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const tickingRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (!tickingRef.current) {
      tickingRef.current = true;
      requestAnimationFrame(() => {
        callbackRef.current(...args);
        tickingRef.current = false;
      });
    }
  }, []);
}
