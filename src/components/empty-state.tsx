'use client';

import { motion } from 'framer-motion';
import { FileSpreadsheet, PlusCircle, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  onAddTransaction: () => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 * i, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export function EmptyState({ onAddTransaction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Hero heading */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
          Start Building Your Portfolio
        </h2>
        <p className="text-white/50 max-w-md mx-auto">
          Add your first transaction to unlock live prices, currency conversion,
          benchmarking against the S&P 500, and full performance analytics.
        </p>
      </motion.div>

      {/* Two action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Import card */}
        <motion.button
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled
          className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-left transition-colors hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
            <FileSpreadsheet className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Import from Broker</h3>
          <p className="text-white/40 text-sm mb-4 leading-relaxed">
            Upload a CSV export from XTB, mBank, or other brokers. Automatic
            parsing of tickers, dates, and amounts.
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-white/30">
            Coming Soon
          </span>
        </motion.button>

        {/* Manual entry card */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddTransaction}
          className="group relative rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.07]"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
            <PlusCircle className="h-6 w-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Manual Entry</h3>
          <p className="text-white/40 text-sm mb-4 leading-relaxed">
            Add transactions one by one — ticker, date, quantity, price, and
            currency. Full control over every detail.
          </p>
          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 group-hover:gap-2 transition-all">
            Add Transaction <ArrowRight className="h-3 w-3" />
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
