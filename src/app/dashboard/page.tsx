"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Plus,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { PortfolioSummary } from "@/components/portfolio-summary";
import { PortfolioHistoryChart } from "@/components/portfolio-history-chart";
import { AssetList } from "@/components/asset-list";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { RefreshButton } from "@/components/refresh-button";

import { useAuth } from "@/providers/auth-provider";
import { getTransactions, addTransaction, deleteAllTransactionsForTicker } from "@/actions/transactions";
import { getPortfolioSnapshots, savePortfolioSnapshot } from "@/actions/portfolio";
import { getMultipleQuotes, getMultipleExchangeRates } from "@/lib/yahoo";
import { calculateHoldings, updateHoldingWithLiveData, calculatePortfolioSummary } from "@/lib/calculations";
import { clearPortfolioCache } from "@/hooks";
import type { Holding, Currency } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch transactions
  const {
    data: transactions = [],
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery({
    queryKey: ["transactions"],
    queryFn: getTransactions,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch portfolio snapshots for chart
  const {
    data: snapshots = [],
    isLoading: snapshotsLoading,
  } = useQuery({
    queryKey: ["portfolio-snapshots"],
    queryFn: getPortfolioSnapshots,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate holdings from transactions
  const holdings = calculateHoldings(transactions);
  const tickers = holdings.map((h) => h.ticker);
  const currencies = [...new Set(holdings.map((h) => h.original_currency).filter((c) => c !== "PLN"))];

  // Fetch live quotes
  const {
    data: quotesMap,
    isLoading: quotesLoading,
    refetch: refetchQuotes,
    isFetching: quotesRefetching,
  } = useQuery({
    queryKey: ["quotes", tickers],
    queryFn: () => getMultipleQuotes(tickers),
    enabled: tickers.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch exchange rates
  const {
    data: exchangeRatesMap,
    isLoading: ratesLoading,
    refetch: refetchRates,
    isFetching: ratesRefetching,
  } = useQuery({
    queryKey: ["exchange-rates", currencies],
    queryFn: () => getMultipleExchangeRates(currencies as Currency[]),
    enabled: currencies.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Combine holdings with live data
  const holdingsWithLiveData: Holding[] = holdings.map((holding) => {
    const quote = quotesMap?.get(holding.ticker);
    const exchangeRate = holding.original_currency === "PLN" 
      ? 1 
      : (exchangeRatesMap?.get(holding.original_currency) || 1);
    
    if (quote) {
      return updateHoldingWithLiveData(holding, quote.price, exchangeRate, quote.changePercent);
    }
    return holding;
  });

  // Calculate portfolio summary from holdings
  const portfolioSummary = calculatePortfolioSummary(holdingsWithLiveData);

  // Auto-save portfolio snapshot once per day when data is available
  useEffect(() => {
    const saveSnapshot = async () => {
      if (
        portfolioSummary.totalValuePLN > 0 &&
        !quotesLoading &&
        !ratesLoading &&
        holdingsWithLiveData.length > 0
      ) {
        try {
          await savePortfolioSnapshot(
            portfolioSummary.totalValuePLN,
            portfolioSummary.totalInvestedPLN,
            portfolioSummary.totalReturnPLN
          );
          // Refresh snapshots to show new data
          queryClient.invalidateQueries({ queryKey: ["portfolio-snapshots"] });
        } catch (error) {
          // Silent fail - snapshot saving should not disrupt user experience
          console.error("Failed to save portfolio snapshot:", error);
        }
      }
    };

    saveSnapshot();
  }, [portfolioSummary.totalValuePLN, quotesLoading, ratesLoading, holdingsWithLiveData.length, queryClient]);

  // Add transaction mutation
  const addTransactionMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-snapshots"] });
      clearPortfolioCache(); // Clear chart cache to force recalculation
      setIsAddModalOpen(false);
      toast.success("Transaction added successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add transaction");
    },
  });

  // Delete all transactions for ticker mutation
  const deleteAllMutation = useMutation({
    mutationFn: (ticker: string) => deleteAllTransactionsForTicker(ticker),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-snapshots"] });
      clearPortfolioCache(); // Clear chart cache to force recalculation
      toast.success("All transactions deleted for this asset");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete transactions");
    },
  });

  // Refresh handler
  const handleRefresh = async () => {
    await Promise.all([refetchQuotes(), refetchRates()]);
    toast.success("Data refreshed");
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isLoading = transactionsLoading || snapshotsLoading;
  const isRefreshing = quotesRefetching || ratesRefetching;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">FinTrack</h1>
                <p className="text-xs text-white/40 hidden sm:block">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <RefreshButton
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
              
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Transaction</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-white/60 hover:text-white hover:bg-white/5"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Skeleton for Portfolio Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
              
              {/* Skeleton for Chart */}
              <Skeleton className="h-80 rounded-2xl" />
              
              {/* Skeleton for Asset List */}
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
            </motion.div>
          ) : transactionsError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8 text-center"
            >
              <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Failed to load portfolio
              </h2>
              <p className="text-white/60 mb-4">
                {transactionsError instanceof Error
                  ? transactionsError.message
                  : "An error occurred"}
              </p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["transactions"] })}
                className="bg-white/10 hover:bg-white/20"
              >
                Try Again
              </Button>
            </motion.div>
          ) : holdingsWithLiveData.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-12 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Welcome to FinTrack
              </h2>
              <p className="text-white/60 mb-6 max-w-md mx-auto">
                Start building your portfolio by adding your first transaction.
                Track stocks, ETFs, and crypto with real-time data.
              </p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Your First Transaction
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Portfolio Summary */}
              <PortfolioSummary summary={portfolioSummary} />

              {/* Portfolio History Chart - with caching & gap filling */}
              <PortfolioHistoryChart 
                transactions={transactions}
                onRefreshComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ["portfolio-snapshots"] });
                  toast.success("Historical data refreshed!");
                }}
              />

              {/* Asset List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Your Assets</h2>
                  <span className="text-sm text-white/40">
                    {holdingsWithLiveData.length} position{holdingsWithLiveData.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <AssetList
                  holdings={holdingsWithLiveData}
                  isLoading={quotesLoading || ratesLoading}
                  onDelete={(ticker: string) => deleteAllMutation.mutate(ticker)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={async (data) => { addTransactionMutation.mutate(data); }}
      />
    </div>
  );
}
