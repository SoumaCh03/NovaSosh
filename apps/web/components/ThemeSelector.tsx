'use client';

import React from 'react';
import { useTheme, Theme } from './ThemeProvider';

export default function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'LIGHT', label: 'Light', icon: '☀️' },
    { value: 'DARK', label: 'Dark', icon: '🌙' },
    { value: 'SYSTEM', label: 'System', icon: '💻' }
  ];

  return (
    <div className="rounded-xl border border-border-token bg-surface p-4 space-y-3 shadow-md max-w-sm">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-primary-text uppercase tracking-widest">Interface Theme</h4>
        <span className="text-[10px] text-muted-token font-semibold uppercase bg-surface-hover px-2 py-0.5 rounded-full">
          Active: {resolvedTheme}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'border-accent-token bg-accent-token/10 text-accent-token shadow-inner'
                  : 'border-border-token bg-background hover:border-surface-hover hover:bg-surface-hover text-secondary-text hover:text-primary-text'
              }`}
            >
              <span className="text-lg mb-1 transform active:scale-125 transition duration-150">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
