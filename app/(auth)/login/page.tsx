"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { fetchAPI } from '@/lib/api';
import { deriveWrappingKey, unwrapPrivateKey } from '@/lib/crypto';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Authenticate with server
      const response = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      // 2. Extract salt and wrapped key
      const { wrapped_private_key, pbkdf2_salt } = response.user;

      // 3. Re-derive wrapping key
      const wrappingKey = await deriveWrappingKey(password, pbkdf2_salt);

      // 4. Unwrap private key
      const privateKey = await unwrapPrivateKey(wrapped_private_key, wrappingKey);

      // 5. Restore session
      login(
        response.user, 
        { access_token: response.access_token, refresh_token: response.refresh_token },
        privateKey
      );

      showToast('Logged in successfully!', 'success');
      router.push('/');
    } catch (error: any) {
      showToast(error.message || 'Login failed. Check your credentials.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Sign in to your account</h3>
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="alice_92"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-foreground/70">
        Don't have an account?{' '}
        <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
          Sign up
        </Link>
      </p>
    </div>
  );
}
