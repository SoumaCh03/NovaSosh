'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide text-indigo-400 animate-pulse">Loading NOVA...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
