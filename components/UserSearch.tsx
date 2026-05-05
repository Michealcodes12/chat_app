"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserSearchResult, searchUsers } from '@/lib/api';

export function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const data = await searchUsers(query);
      setResults(data);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const startChat = (userId: string) => {
    setQuery('');
    setResults([]);
    router.push(`/c/${userId}`);
  };

  return (
    <div className="p-4 border-b border-border bg-surface relative z-10">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-background border border-border rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <button 
          type="submit" 
          disabled={isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-primary transition-colors p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </form>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {results.map(user => (
            <button
              key={user.id}
              onClick={() => startChat(user.id)}
              className="w-full text-left p-3 hover:bg-surface-hover border-b border-border last:border-0 flex flex-col transition-colors"
            >
              <span className="font-medium text-foreground">{user.display_name}</span>
              <span className="text-xs text-foreground/60">@{user.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
