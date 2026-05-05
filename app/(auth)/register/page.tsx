"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { fetchAPI } from '@/lib/api';
import { 
  generateRSAKeyPair, 
  generateSalt, 
  deriveWrappingKey, 
  wrapPrivateKey, 
  exportPublicKey 
} from '@/lib/crypto';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3 || password.length < 8) {
      showToast('Username must be at least 3 chars and password at least 8 chars', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Generate RSA-OAEP keypair
      const keyPair = await generateRSAKeyPair();
      
      // 2. Generate Salt
      const salt = generateSalt();
      
      // 3. Derive wrapping key from password
      const wrappingKey = await deriveWrappingKey(password, salt);
      
      // 4. Wrap private key
      const wrappedPrivateKey = await wrapPrivateKey(keyPair.privateKey, wrappingKey);
      
      // 5. Export public key
      const publicKey = await exportPublicKey(keyPair.publicKey);

      // 6. Send to server
      const payload = {
        username,
        display_name: displayName,
        password,
        public_key: publicKey,
        wrapped_private_key: wrappedPrivateKey,
        pbkdf2_salt: salt
      };

      const response = await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // 7. Login to context
      login(
        response.user, 
        { access_token: response.access_token, refresh_token: response.refresh_token },
        keyPair.privateKey
      );

      showToast('Account created successfully!', 'success');
      router.push('/');
    } catch (error: any) {
      showToast(error.message || 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold mb-6">Create an account</h3>
      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          label="Username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="alice_92"
        />
        <Input
          label="Display Name"
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Alice"
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
          Sign up
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-foreground/70">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
