import { useState, useEffect, useCallback, useRef } from 'react';
import { MOBILE_BREAKPOINT, REFRESH_COOLDOWN_SECONDS, LAST_REFRESH_KEY } from '@/lib/constants';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

interface RefreshCooldownState {
  canRefresh: boolean;
  cooldownRemaining: number;
  lastRefresh: Date | null;
  triggerRefresh: () => void;
}

export function useRefreshCooldown(): RefreshCooldownState {
  const [lastRefresh, setLastRefresh] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(LAST_REFRESH_KEY);
    return stored ? new Date(stored) : null;
  });

  const [cooldownRemaining, setCooldownRemaining] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(LAST_REFRESH_KEY);
    if (!stored) return 0;
    const elapsed = Math.floor((Date.now() - new Date(stored).getTime()) / 1000);
    return Math.max(0, REFRESH_COOLDOWN_SECONDS - elapsed);
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActive = cooldownRemaining > 0;

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isActive) {
      intervalRef.current = setInterval(() => {
        setCooldownRemaining((prev) => {
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
  }, [isActive]);

  const triggerRefresh = useCallback(() => {
    const now = new Date();
    setLastRefresh(now);
    localStorage.setItem(LAST_REFRESH_KEY, now.toISOString());
    setCooldownRemaining(REFRESH_COOLDOWN_SECONDS);
  }, []);

  return { canRefresh: cooldownRemaining === 0, cooldownRemaining, lastRefresh, triggerRefresh };
}

export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export { usePortfolioHistory, clearPortfolioCache } from './use-portfolio-history';
export type { PortfolioDataPoint } from './use-portfolio-history';
export { useBenchmarkData, clearBenchmarkCache } from './use-benchmark-data';
export type { BenchmarkDataPoint } from './use-benchmark-data';
