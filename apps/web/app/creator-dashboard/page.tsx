'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  
  const [balance, setBalance] = useState(1250.50);
  const [subscribers, setSubscribers] = useState(142);
  const [monthlyRevenue, setMonthlyRevenue] = useState(850.00);
  
  const [processingPayout, setProcessingPayout] = useState(false);

  const handlePayout = () => {
    if (balance <= 0) return alert('Insufficient funds');
    setProcessingPayout(true);
    setTimeout(() => {
      setBalance(0);
      setProcessingPayout(false);
      alert('Payout of $' + balance.toFixed(2) + ' initiated successfully.');
    }, 1500);
  };

  if (!isAuthenticated) return null;
  if (!user?.isVerified) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-surface border border-border-token rounded-3xl p-8 text-center shadow-xl">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-black mb-4">Creator Dashboard</h1>
          <p className="text-muted-token mb-8">You must be a Verified Creator to access Monetization features. Apply for verification in your Profile Settings.</p>
          <button onClick={() => router.push('/settings/profile')} className="px-6 py-3 w-full bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition shadow-lg">
            Go to Profile Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3">
            Creator Dashboard <span className="text-emerald-500 text-xl" title="Verified Creator">✓</span>
          </h1>
          <p className="text-muted-token mt-1">Manage your subscriptions, tips, and payouts.</p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-20 text-6xl">💰</div>
            <p className="text-emerald-100 font-bold mb-1">Available Balance</p>
            <h2 className="text-4xl font-black mb-4">${balance.toFixed(2)}</h2>
            <button 
              onClick={handlePayout}
              disabled={processingPayout || balance <= 0}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition disabled:opacity-50"
            >
              {processingPayout ? 'Processing...' : 'Withdraw Funds'}
            </button>
          </div>
          
          <div className="bg-surface border border-border-token rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-muted-token font-bold mb-1">Active Subscribers</p>
            <h2 className="text-4xl font-black text-primary-text">{subscribers}</h2>
            <p className="text-sm text-emerald-500 font-bold mt-2">↑ 12% this month</p>
          </div>

          <div className="bg-surface border border-border-token rounded-3xl p-6 shadow-sm flex flex-col justify-center">
            <p className="text-muted-token font-bold mb-1">Est. Monthly Revenue</p>
            <h2 className="text-4xl font-black text-primary-text">${monthlyRevenue.toFixed(2)}</h2>
            <p className="text-sm text-muted-token font-bold mt-2">Based on current subs</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-surface border border-border-token rounded-3xl overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border-token bg-background/50">
            <h3 className="font-bold text-lg">Recent Transactions</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-hover/50 text-muted-token text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">From</th>
                  <th className="px-6 py-4 font-bold text-right">Amount</th>
                  <th className="px-6 py-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-token">
                {[
                  { id: 1, date: 'Today, 2:30 PM', type: 'Tip', from: '@alice', amount: 5.00, status: 'Completed' },
                  { id: 2, date: 'Today, 10:15 AM', type: 'Subscription', from: '@bob', amount: 9.99, status: 'Completed' },
                  { id: 3, date: 'Yesterday', type: 'Tip', from: '@charlie', amount: 20.00, status: 'Completed' },
                  { id: 4, date: 'Oct 12', type: 'Payout', from: 'System', amount: -450.00, status: 'Processing' },
                ].map(tx => (
                  <tr key={tx.id} className="hover:bg-surface-hover/30 transition">
                    <td className="px-6 py-4 text-sm text-muted-token">{tx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${tx.type === 'Tip' ? 'bg-purple-500/10 text-purple-500' : tx.type === 'Payout' ? 'bg-slate-500/10 text-slate-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold">{tx.from}</td>
                    <td className={`px-6 py-4 text-sm font-black text-right ${tx.amount > 0 ? 'text-emerald-500' : 'text-primary-text'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-xs font-bold ${tx.status === 'Completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
