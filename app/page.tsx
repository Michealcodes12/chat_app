"use client";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <header className="bg-surface border-b border-border py-4 px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">WhisperBox</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">
              {user?.display_name} (@{user?.username})
            </span>
            <button 
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              Log out
            </button>
          </div>
        </header>
        <main className="max-w-4xl mx-auto py-8 px-6">
          <div className="bg-surface rounded-xl border border-border p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold mb-2">Welcome to WhisperBox</h2>
            <p className="text-foreground/70 mb-6">
              Your messages are end-to-end encrypted. No one else can read them.
            </p>
            <p className="text-sm text-foreground/50">
              Dashboard coming in Phase 3...
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
