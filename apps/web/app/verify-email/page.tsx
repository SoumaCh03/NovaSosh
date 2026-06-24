'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ApiClient } from '../../lib/api';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const performVerification = async () => {
      setLoading(true);
      setError(null);

      try {
        await ApiClient.post('/auth/verify-email', { token });
        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Verification failed. The token may have expired.');
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [token]);

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-400 font-medium">Invalid URL: Missing Verification Token</p>
        <Link href="/login" className="mt-4 inline-block text-xs font-semibold text-indigo-400">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      {loading && (
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm text-slate-400">Verifying your email address...</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Verification Failed</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex w-full justify-center rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-slate-700 transition"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}

      {success && (
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Email Verified!</h2>
          <p className="text-sm text-slate-400">
            Thank you. Your email address has been successfully verified, and your account is now active.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-flex w-full justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition duration-200"
            >
              Log In to Your Account
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-2xl border border-indigo-500/20 bg-slate-900/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            NOVA
          </h1>
          <p className="mt-2 text-sm text-slate-400">Email Verification</p>
        </div>

        <Suspense fallback={
          <div className="flex justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </div>
    </div>
  );
}
