"use client";

import React from 'react';
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserSearch } from "@/components/UserSearch";
import { ConversationsList } from "@/components/ConversationsList";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-border bg-surface flex flex-col h-full z-20 shadow-sm relative">
          {/* Header */}
          <header className="p-4 border-b border-border flex justify-between items-center bg-surface">
            <h1 className="text-xl font-bold text-primary tracking-tight">WhisperBox</h1>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold cursor-pointer group relative shadow-sm hover:ring-2 hover:ring-primary/50 transition-all"
                title={user?.display_name}
              >
                {user?.display_name?.[0]?.toUpperCase()}
                
                {/* Logout Tooltip/Dropdown pseudo */}
                <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50">
                  <div className="bg-surface border border-border rounded-lg shadow-xl py-1 w-40 overflow-hidden">
                    <div className="px-4 py-2 border-b border-border mb-1 bg-surface-hover/50">
                      <p className="text-sm font-medium text-foreground truncate">{user?.display_name}</p>
                      <p className="text-xs text-foreground/60 truncate">@{user?.username}</p>
                    </div>
                    <button 
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <UserSearch />
          
          <div className="flex-1 overflow-hidden relative">
            <ConversationsList />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full bg-background relative z-10">
          {children}
        </main>
        
      </div>
    </ProtectedRoute>
  );
}
