'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side password rules check
  const hasMinLength = newPassword.length >= 10;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing token parameter');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await ApiClient.post('/auth/reset-password', {
        token,
        newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-400 font-medium">Invalid URL: Missing Reset Token</p>
        <Link href="/login" className="mt-4 inline-block text-xs font-semibold text-indigo-400">
          Back to Login
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">Password Updated!</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your password has been successfully updated.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition duration-200"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
          New Password
        </label>
        <input
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••••••"
          className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-indigo-500 transition duration-200"
        />
      </div>

      {/* Password Policy Checklist */}
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
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            NOVA
          </h1>
          <p className="mt-2 text-sm text-slate-400">Choose a new password</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
