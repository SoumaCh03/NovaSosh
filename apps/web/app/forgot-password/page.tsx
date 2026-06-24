'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ApiClient } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await ApiClient.post<{ message: string }>('/auth/forgot-password', { email });
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent animate-pulse">
            NOVA
          </h1>
          <p className="mt-2 text-sm text-slate-400">Reset your password</p>
        </div>

        {message ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-sm text-slate-300 font-medium">{message}</p>
            <p className="mt-2 text-xs text-slate-500">
              Check the API server console logs for the generated reset token!
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition duration-200"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg hover:from-indigo-400 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 transition duration-200"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <p className="text-center text-xs text-slate-500">
              <Link href="/login" className="font-semibold text-slate-400 hover:text-slate-300">
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
