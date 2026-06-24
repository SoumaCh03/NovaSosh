'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';


export default function ModerationDashboard() {
  const router = useRouter();
  const { accessToken, isAuthenticated, user } = useAuthStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return router.push('/login');
    // Simulated auth check. In real app, check user.role === 'ADMIN'
    
    const fetchReports = async () => {
      try {
        const res = await ApiClient.get<{ data: any[] }>('/moderation/reports', accessToken!);
        setReports(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [isAuthenticated, accessToken, router]);

  const handleResolve = async (id: string, action: string) => {
    try {
      await ApiClient.patch(`/moderation/reports/${id}/resolve`, { resolutionReason: action }, accessToken!);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'ACTIONED', resolutionReason: action } : r));
    } catch (e) {
      alert('Failed to resolve report');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-2">
            <span className="text-danger-token">🛡️</span> Admin Console
          </h1>
          <p className="text-muted-token mt-1">Review user reports and manage trust & safety.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-2xl h-24 border border-border-token animate-pulse"></div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-border-token">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black mb-2">Queue is empty</h2>
            <p className="text-muted-token">No pending reports to review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className={`p-6 rounded-2xl border transition ${report.status === 'ACTIONED' ? 'bg-surface border-border-token opacity-60' : 'bg-surface border-danger-token/50 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-danger-token uppercase tracking-wider">{report.targetType} REPORT</span>
                      <span className="text-[10px] text-muted-token bg-background px-2 py-0.5 rounded-full border border-border-token">ID: {report.id.split('-')[0]}</span>
                    </div>
                    <p className="text-sm font-bold text-primary-text mt-2">Reporter: @{report.reporter?.profile?.username || 'Unknown'}</p>
                    <p className="text-sm text-secondary-text mt-1 font-mono bg-background p-2 rounded-lg border border-border-token">{report.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.status === 'ACTIONED' ? 'bg-success-token/10 text-success-token' : 'bg-amber-500/10 text-amber-500'}`}>
                    {report.status}
                  </span>
                </div>

                {report.status !== 'ACTIONED' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-border-token/50">
                    <button 
                      onClick={() => handleResolve(report.id, 'Content Removed')}
                      className="px-4 py-2 bg-danger-token/10 hover:bg-danger-token/20 text-danger-token border border-danger-token/20 rounded-xl text-xs font-bold transition"
                    >
                      Remove Content
                    </button>
                    <button 
                      onClick={() => handleResolve(report.id, 'User Suspended')}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold transition"
                    >
                      Suspend User
                    </button>
                    <button 
                      onClick={() => handleResolve(report.id, 'Dismissed')}
                      className="px-4 py-2 bg-background hover:bg-surface-hover border border-border-token text-muted-token hover:text-primary-text rounded-xl text-xs font-bold transition ml-auto"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {report.status === 'ACTIONED' && (
                  <div className="mt-2 text-xs font-bold text-success-token">
                    Action Taken: {report.resolutionReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
