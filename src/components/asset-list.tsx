'use client';

// ===========================================
// Asset List Component
// ===========================================
// Switches between Table (Desktop) and Card (Mobile) views

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AssetCard } from './asset-card';
import { AssetTable } from './asset-table';
import { useIsMobile } from '@/hooks';
import type { Holding, AssetType } from '@/types';
import { ASSET_TYPES } from '@/lib/constants';

interface AssetListProps {
  holdings: Holding[];
  isLoading: boolean;
  onDelete?: (ticker: string) => void;
  onEdit?: (holding: Holding, transactionId: string) => void;
  onDeleteTransaction?: (holding: Holding, transactionId: string) => void;
}

export function AssetList({ holdings, isLoading, onDelete, onEdit, onDeleteTransaction }: AssetListProps) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'auto' | 'grid' | 'table'>('auto');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [sortColumn, setSortColumn] = useState<string>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Determine actual view mode
  const actualViewMode = viewMode === 'auto' ? (isMobile ? 'grid' : 'table') : viewMode;

  // Filter holdings
  const filteredHoldings = holdings.filter((holding) => {
    const matchesSearch =
      searchQuery === '' ||
      holding.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      holding.asset_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === 'ALL' || holding.asset_type === filterType;

    return matchesSearch && matchesType;
  });

  // Sort holdings
  const sortedHoldings = [...filteredHoldings].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'ticker':
        comparison = a.ticker.localeCompare(b.ticker);
        break;
      case 'value':
        comparison = (a.current_value_pln ?? a.total_invested_pln) - (b.current_value_pln ?? b.total_invested_pln);
        break;
      case 'return':
        comparison = (a.total_return_percent ?? 0) - (b.total_return_percent ?? 0);
        break;
      case 'day_change':
        comparison = (a.day_change_percent ?? 0) - (b.day_change_percent ?? 0);
        break;
      case 'avg_price':
        comparison = a.avg_buy_price - b.avg_buy_price;
        break;
      default:
        comparison = 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1 bg-white/5" />
          <Skeleton className="h-10 w-32 bg-white/5" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full bg-white/5" />
        ))}
      </div>
    );
  }

  // Empty state
  if (holdings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <SlidersHorizontal className="h-8 w-8 text-white/20" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No assets yet</h3>
        <p className="text-white/50 max-w-sm">
          Start building your portfolio by adding your first transaction.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Filter by Type */}
        <Select
          value={filterType}
          onValueChange={(val) => setFilterType(val as AssetType | 'ALL')}
        >
          <SelectTrigger className="w-full sm:w-[150px] bg-white/5 border-white/10 text-white">
            <Filter className="h-4 w-4 mr-2 text-white/40" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0a0a0a] border-white/10">
            <SelectItem value="ALL" className="text-white">All Types</SelectItem>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} className="text-white">
                {type.icon} {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Toggle (Desktop only) */}
        {!isMobile && (
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none ${actualViewMode === 'grid' ? 'bg-white/10' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none ${actualViewMode === 'table' ? 'bg-white/10' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-white/40">
        Showing {sortedHoldings.length} of {holdings.length} assets
      </div>

      {/* Asset Display */}
      {actualViewMode === 'table' ? (
        <AssetTable
          holdings={sortedHoldings}
          onDelete={onDelete}
          onEdit={onEdit}
          onDeleteTransaction={onDeleteTransaction}
          onSort={handleSort}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedHoldings.map((holding, index) => (
            <AssetCard
              key={holding.ticker}
              holding={holding}
              onDelete={onDelete}
              onEdit={onEdit}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
