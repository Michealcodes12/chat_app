"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  public_key: string;
  wrapped_private_key: string;
  pbkdf2_salt: string;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  privateKey: CryptoKey | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (profile: UserProfile, tokens: { access_token: string; refresh_token: string }, unwrappedKey: CryptoKey) => void;
  logout: () => void;
  setPrivateKey: (key: CryptoKey) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const profile = await fetchAPI('/auth/me');
          setUser(profile);
        } catch (error) {
          console.error("Auth check failed", error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (
    profile: UserProfile, 
    tokens: { access_token: string; refresh_token: string }, 
    unwrappedKey: CryptoKey
  ) => {
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
    setUser(profile);
    setPrivateKey(unwrappedKey);
  };

  const logout = async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token');
      if (refresh_token) {
        await fetchAPI('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token })
        });
      }
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      setPrivateKey(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      privateKey,
      isAuthenticated: !!user && !!privateKey,
      isLoading,
      login,
      logout,
      setPrivateKey
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
