'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRefresh?: () => void;
}

export function SearchBar({ onSearch, onRefresh }: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  return (
    <div className="flex items-center gap-3 w-full bg-white px-4 py-3 border-b border-gray-100">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search emails..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors"
        />
      </div>
      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-transparent">
        <Filter className="w-4 h-4" />
      </button>
      <button
        onClick={onRefresh}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-transparent"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}
