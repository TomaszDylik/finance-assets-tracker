'use client';

// ===========================================
// Asset Search Input Component
// ===========================================
// Simple input + dropdown list. No cmdk, no Popover, no third-party.
// Supports searching by ticker name OR ISIN.
// ===========================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search, X } from 'lucide-react';
import { searchAssets, type AssetSearchResult } from '@/actions/asset-search';

interface AssetSearchInputProps {
  onSelect: (result: AssetSearchResult) => void;
  onClear: () => void;
  selectedAsset: AssetSearchResult | null;
  disabled?: boolean;
}

export function AssetSearchInput({
  onSelect,
  onClear,
  selectedAsset,
  disabled = false,
}: AssetSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Click outside → close dropdown ----
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ---- Debounced search ----
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const data = await searchAssets(q);
      setResults(data);
      setIsOpen(data.length > 0);
    } catch (err) {
      console.error('[AssetSearchInput] search error:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear previous timer
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Debounce 500ms
    debounceRef.current = setTimeout(() => {
      doSearch(value);
    }, 500);
  };

  // ---- Select a result ----
  const handleSelect = (result: AssetSearchResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // ---- Clear selection ----
  const handleClear = () => {
    onClear();
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  // ---- If an asset is already selected, show chip ----
  if (selectedAsset) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-white/5 border border-white/10 px-3 py-2">
        <div className="flex-1 min-w-0">
          <span className="font-mono font-bold text-white text-sm">
            {selectedAsset.ticker}
          </span>
          <span className="text-white/50 text-sm ml-2 truncate">
            {selectedAsset.name}
          </span>
        </div>
        {selectedAsset.exchange && (
          <span className="text-[10px] bg-white/10 text-white/60 rounded px-1.5 py-0.5 uppercase shrink-0">
            {selectedAsset.exchange}
          </span>
        )}
        <button
          type="button"
          onClick={handleClear}
          className="text-white/40 hover:text-white transition-colors shrink-0"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ---- Search input + dropdown ----
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
        <Input
          type="text"
          placeholder="Search by ticker, company name or ISIN..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-white/10 bg-[#0a0a0a] shadow-xl">
          {results.map((r, idx) => (
            <li key={`${r.ticker}-${idx}`}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                {/* Ticker */}
                <span className="font-mono font-bold text-white text-sm shrink-0 w-20 truncate">
                  {r.ticker}
                </span>

                {/* Name */}
                <span className="text-white/60 text-sm flex-1 truncate">
                  {r.name}
                </span>

                {/* Exchange badge */}
                {r.exchange && (
                  <span className="text-[10px] bg-white/10 text-white/50 rounded px-1.5 py-0.5 uppercase shrink-0">
                    {r.exchange}
                  </span>
                )}

                {/* Asset type badge */}
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded px-1.5 py-0.5 shrink-0">
                  {r.assetType}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* "No results" message */}
      {isOpen && results.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[#0a0a0a] p-4 text-center text-sm text-white/40">
          No results found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
