'use client';

// ===========================================
// Refresh Button with Cooldown
// ===========================================

import { motion } from 'framer-motion';
import { RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRefreshCooldown, formatTimeRemaining } from '@/hooks';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function RefreshButton({ onRefresh, isRefreshing }: RefreshButtonProps) {
  const { canRefresh, cooldownRemaining, triggerRefresh } = useRefreshCooldown();

  const handleClick = async () => {
    if (!canRefresh || isRefreshing) return;
    triggerRefresh();
    await onRefresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={!canRefresh || isRefreshing}
      className={`
        relative overflow-hidden transition-all duration-300
        ${canRefresh 
          ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50' 
          : 'border-white/10 text-white/40'
        }
      `}
    >
      {/* Cooldown Progress Bar */}
      {!canRefresh && (
        <motion.div
          className="absolute inset-0 bg-white/5"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: cooldownRemaining, ease: 'linear' }}
        />
      )}

      <div className="relative flex items-center gap-2">
        {isRefreshing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Refreshing...</span>
          </>
        ) : canRefresh ? (
          <>
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Prices</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTimeRemaining(cooldownRemaining)}</span>
          </>
        )}
      </div>
    </Button>
  );
}
