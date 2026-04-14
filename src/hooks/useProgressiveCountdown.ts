/**
 * useProgressiveCountdown hook
 * Priority 3: SOLID - Extract Login.tsx complexity
 * Handles countdown timer logic for progressive delays
 */

import { useState, useEffect, useRef } from 'react';

export interface CountdownState {
  countdown: number;
  isActive: boolean;
  start: (initialSeconds: number) => void;
  stop: () => void;
}

/**
 * Manages countdown timer for progressive login delays
 * Encapsulates timer logic and cleanup
 */
export function useProgressiveCountdown(): CountdownState {
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown]);

  const start = (initialSeconds: number) => {
    setCountdown(initialSeconds);
  };

  const stop = () => {
    setCountdown(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return {
    countdown,
    isActive: countdown > 0,
    start,
    stop,
  };
}
