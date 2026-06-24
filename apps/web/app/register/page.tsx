'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Client-side password rules check
  const hasMinLength = password.length >= 10;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await ApiClient.post<{ userId: string; status: string }>('/auth/register', {
        email,
        username,
        password,
      });
      setRegisteredUserId(res.userId);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (registeredUserId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-100">Check Server Logs!</h2>
            <p className="mt-2 text-sm text-slate-400">
              Since we are in Phase 1, we log email verification links directly to the terminal where you started `npm run dev`.
            </p>
            <div className="mt-6 rounded-lg bg-slate-950/80 p-4 text-left border border-slate-800">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Instructions:</p>
              <ol className="list-decimal pl-4 text-xs text-slate-400 space-y-1">
                <li>Check your server/API terminal output logs.</li>
                <li>Find the logged `Verification email` containing the token.</li>
                <li>Click the verification link or navigate to `/verify-email?token=YOUR_TOKEN`.</li>
              </ol>
            </div>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition duration-200"
              >
                Go to Login Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            NOVA
          </h1>
          <p className="mt-2 text-sm text-slate-400">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="janedoe"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition duration-200"
              />
            </div>
          </div>

          {/* Password Policy Guidelines Checklist */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/30 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 mb-1">Password Requirements:</p>
            <ul className="text-xs space-y-1">
              <li className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="text-sm">{hasMinLength ? '✓' : '•'}</span> At least 10 characters
              </li>
              <li className={`flex items-center gap-2 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="text-sm">{hasUpper ? '✓' : '•'}</span> Uppercase letter (A-Z)
              </li>
              <li className={`flex items-center gap-2 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="text-sm">{hasLower ? '✓' : '•'}</span> Lowercase letter (a-z)
              </li>
              <li className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="text-sm">{hasNumber ? '✓' : '•'}</span> At least one number (0-9)
              </li>
              <li className={`flex items-center gap-2 ${hasSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                <span className="text-sm">{hasSymbol ? '✓' : '•'}</span> Special symbol (e.g., !, @, #, $)
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !(hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol)}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-400 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 transition duration-200"
          >
            {loading ? 'Registering...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
