// ===========================================
// Custom Hooks
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { MOBILE_BREAKPOINT, REFRESH_COOLDOWN_SECONDS, LAST_REFRESH_KEY } from '@/lib/constants';

// ===========================================
// MEDIA QUERY HOOK
// ===========================================

/**
 * Hook to detect if we're on mobile or desktop
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// ===========================================
// DEBOUNCE HOOK
// ===========================================

/**
 * Hook to debounce a value
 * Used for the ticker search input
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ===========================================
// REFRESH COOLDOWN HOOK
// ===========================================

interface RefreshCooldownState {
  canRefresh: boolean;
  cooldownRemaining: number;
  lastRefresh: Date | null;
  triggerRefresh: () => void;
}

/**
 * Hook to manage refresh cooldown
 * Prevents excessive API calls by enforcing a 30-minute cooldown
 */
export function useRefreshCooldown(): RefreshCooldownState {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(() => {
    // Initialize from localStorage
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_REFRESH_KEY);
    return stored ? new Date(stored) : null;
  });
  const [cooldownRemaining, setCooldownRemaining] = useState(() => {
    // Initialize cooldown from localStorage
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(LAST_REFRESH_KEY);
    if (!stored) return 0;
    const lastRefreshDate = new Date(stored);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - lastRefreshDate.getTime()) / 1000);
    return Math.max(0, REFRESH_COOLDOWN_SECONDS - elapsed);
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isCountdownActive = cooldownRemaining > 0;

  // Handle countdown interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start countdown if there's remaining time
    if (isCountdownActive) {
      intervalRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCountdownActive]);

  // Trigger a new refresh
  const triggerRefresh = useCallback(() => {
    const now = new Date();
    setLastRefresh(now);
    localStorage.setItem(LAST_REFRESH_KEY, now.toISOString());
    setCooldownRemaining(REFRESH_COOLDOWN_SECONDS);
  }, []);

  return {
    canRefresh: cooldownRemaining === 0,
    cooldownRemaining,
    lastRefresh,
    triggerRefresh,
  };
}

// ===========================================
// LOCAL STORAGE HOOK
// ===========================================

/**
 * Hook for syncing state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}

// ===========================================
// CLICK OUTSIDE HOOK
// ===========================================

/**
 * Hook to detect clicks outside of a ref element
 * Useful for closing dropdowns/modals
 */
export function useClickOutside<T extends HTMLElement>(
  callback: () => void
): React.RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback]);

  return ref;
}

// ===========================================
// FORMAT TIME REMAINING HOOK
// ===========================================

/**
 * Format seconds into MM:SS string
 */
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===========================================
// RE-EXPORT PORTFOLIO HISTORY HOOK
// ===========================================

export { usePortfolioHistory, clearPortfolioCache } from './use-portfolio-history';
export type { PortfolioDataPoint } from './use-portfolio-history';
