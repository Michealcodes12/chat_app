"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, privateKey } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (user && !privateKey) {
        // User has a valid session token but no private key in memory (e.g. after page reload)
        // For security, they must log in again to unwrap their key
        router.push('/login?reason=reauth');
      } else {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, user, privateKey, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="mt-4 text-foreground/60 text-sm">Loading secure session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
