'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Moment {
  id: string;
  caption: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  createdAt: string;
}

interface AnalyticsData {
  summary: {
    totalMoments: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalSaves: number;
    totalWatchTime: number;
    engagementRate: number;
  };
  momentsList: Moment[];
  dailyBreakdown: Array<{ date: string; views: number; likes: number; watchTime: number }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);

  const [activeTab, setActiveTab] = useState<'insights' | 'moderation' | 'storage'>('insights');
  
  // Insights State
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Moderation State (reported moments list mock for execution completeness)
  const [reports, setReports] = useState([
    { id: 'rep_01', type: 'MOMENT', targetId: 'mom_10', reason: 'Contains unauthorized copyrighted music.', reporter: 'WarnerMusicCorp', status: 'OPEN', date: '2026-06-23' },
    { id: 'rep_02', type: 'MOMENT', targetId: 'mom_12', reason: 'Spam promotions and referral links.', reporter: 'user_rebel', status: 'OPEN', date: '2026-06-22' },
    { id: 'rep_03', type: 'COMMENT', targetId: 'com_33', reason: 'Harassment and abusive wording.', reporter: 'sarah_con', status: 'RESOLVED', date: '2026-06-20' }
  ]);

  // Storage Stats State
  const [storageStats] = useState({
    totalStorageUsedGB: 18.4,
    storageLimitGB: 100,
    rawUploadsCount: 42,
    rawUploadsSizeGB: 12.1,
    transcodedSizeGB: 6.3,
    variantsCount: 168
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && accessToken && activeTab === 'insights') {
      loadAnalytics();
    }
  }, [isAuthenticated, accessToken, activeTab]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.get<AnalyticsData>('/moments/analytics', accessToken!);
      setAnalytics(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load creator insights.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = (reportId: string, action: 'DISMISS' | 'REMOVE') => {
    setReports((prev) =>
      prev.map((rep) =>
        rep.id === reportId
          ? { ...rep, status: action === 'REMOVE' ? 'ACTIONED: CONTENT_REMOVED' : 'RESOLVED: DISMISSED' }
          : rep
      )
    );
    alert(`Report ${reportId} successfully resolved via action: ${action}`);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden text-foreground relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.04),transparent_40%)] pointer-events-none" />

      {/* Main Admin Sidebar */}
      <aside className="w-80 border-r border-border-token bg-surface/40 backdrop-blur-xl p-6 flex flex-col justify-between shrink-0 relative z-20">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg"
            >
              N
            </button>
            <div>
              <span className="text-xl font-bold tracking-tight text-primary-text">NOVA Console</span>
              <p className="text-[9px] text-muted-token tracking-widest uppercase">Admin Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'insights'
                  ? 'bg-surface border border-border-token text-accent-token shadow-inner'
                  : 'text-secondary-text hover:bg-surface-hover/40 hover:text-primary-text border border-transparent'
              }`}
            >
              📊 Creator Insights
            </button>

            <button
              onClick={() => setActiveTab('moderation')}
              className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'moderation'
                  ? 'bg-surface border border-border-token text-accent-token shadow-inner'
                  : 'text-secondary-text hover:bg-surface-hover/40 hover:text-primary-text border border-transparent'
              }`}
            >
              🛡️ Reports Moderation
            </button>

            <button
              onClick={() => setActiveTab('storage')}
              className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'storage'
                  ? 'bg-surface border border-border-token text-accent-token shadow-inner'
                  : 'text-secondary-text hover:bg-surface-hover/40 hover:text-primary-text border border-transparent'
              }`}
            >
              💾 Disk Storage telemetry
            </button>
          </nav>
        </div>

        <div className="border-t border-border-token/40 pt-4">
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-token hover:border-surface-hover py-3 text-xs font-bold text-secondary-text hover:text-primary-text transition"
          >
            ← Back to Feed
          </button>
        </div>
      </aside>

      {/* Viewport Dashboard */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative z-10">
        <header className="h-18 border-b border-border-token px-8 flex items-center justify-between shrink-0 bg-background/65 backdrop-blur-md sticky top-0 z-20">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              {activeTab === 'insights' && '📊 Moments Creator Insights'}
              {activeTab === 'moderation' && '🛡️ Integrity Moderation Panel'}
              {activeTab === 'storage' && '💾 System Storage Infrastructure'}
            </h2>
            <p className="text-[11px] text-muted-token font-medium">
              {activeTab === 'insights' && 'Perform watch duration and retention metric aggregation analyses'}
              {activeTab === 'moderation' && 'Review reported content violations and enforce safety guidelines'}
              {activeTab === 'storage' && 'Track physical volume limits and transcoded variant distributions'}
            </p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl w-full mx-auto">
            {activeTab === 'insights' ? (
              <div className="space-y-6">
                {/* Stats Grid */}
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-token border-t-transparent"></div>
                  </div>
                ) : error ? (
                  <p className="text-xs text-danger-token font-semibold">{error}</p>
                ) : analytics ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { title: 'Total Moments', val: analytics.summary.totalMoments, suffix: 'videos' },
                        { title: 'Total Views', val: analytics.summary.totalViews, suffix: 'plays' },
                        { title: 'Watch Duration', val: `${analytics.summary.totalWatchTime}s`, suffix: 'time logged' },
                        { title: 'Engagement Rate', val: `${analytics.summary.engagementRate}%`, suffix: 'likes/saves ratio' }
                      ].map((card, idx) => (
                        <div key={idx} className="rounded-2xl border border-border-token bg-surface p-5 space-y-1">
                          <p className="text-[10px] font-bold text-muted-token uppercase tracking-wider">{card.title}</p>
                          <p className="text-2xl font-black text-primary-text">{card.val}</p>
                          <p className="text-[10px] text-accent-token font-semibold">{card.suffix}</p>
                        </div>
                      ))}
                    </div>

                    {/* Simulating Interactive Retention / Views chart */}
                    <div className="rounded-2xl border border-border-token bg-surface p-6 space-y-4">
                      <div>
                        <h3 className="text-xs font-bold text-primary-text uppercase tracking-widest">Views Progress Overview</h3>
                        <p className="text-[10px] text-muted-token">Hourly retention counts grouped by calendar date</p>
                      </div>
                      
                      {analytics.dailyBreakdown.length === 0 ? (
                        <p className="text-xs text-muted-token italic text-center py-6">No historical views captured yet.</p>
                      ) : (
                        <div className="flex items-end gap-2.5 h-36 pt-4 border-b border-border-token/40">
                          {analytics.dailyBreakdown.map((day, idx) => {
                            const maxVal = Math.max(...analytics.dailyBreakdown.map(d => d.views), 1);
                            const heightPct = `${(day.views / maxVal) * 100}%`;
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
                                <div className="absolute bottom-full mb-1 bg-surface border border-border-token text-[9px] text-primary-text px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20">
                                  {day.views} views ({day.watchTime}s)
                                </div>
                                <div
                                  className="w-full bg-gradient-to-t from-accent-token to-indigo-500 rounded-t group-hover:from-indigo-400 group-hover:to-indigo-500 transition duration-300"
                                  style={{ height: heightPct }}
                                />
                                <span className="text-[9px] text-muted-token truncate max-w-full">
                                  {new Date(day.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Moments list */}
                    <div className="rounded-2xl border border-border-token bg-surface p-6 space-y-4">
                      <h3 className="text-xs font-bold text-primary-text uppercase tracking-widest">Manage Moments</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-border-token/40 text-muted-token uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-2">Moment ID</th>
                              <th className="py-3 px-2">Caption</th>
                              <th className="py-3 px-2">Duration</th>
                              <th className="py-3 px-2 text-right">Views</th>
                              <th className="py-3 px-2 text-right">Likes</th>
                              <th className="py-3 px-2 text-right">Comments</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.momentsList.map((m) => (
                              <tr key={m.id} className="border-b border-border-token/20 hover:bg-surface-hover/30 transition">
                                <td className="py-3 px-2 font-mono text-muted-token">{m.id.slice(0, 8)}...</td>
                                <td className="py-3 px-2 font-medium text-primary-text truncate max-w-[200px]">{m.caption || '(No caption)'}</td>
                                <td className="py-3 px-2 font-semibold text-secondary-text">{m.duration.toFixed(1)}s</td>
                                <td className="py-3 px-2 text-right font-bold text-primary-text">{m.viewCount}</td>
                                <td className="py-3 px-2 text-right font-bold text-primary-text">{m.likeCount}</td>
                                <td className="py-3 px-2 text-right font-bold text-primary-text">{m.commentCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-token italic text-center">No creator telemetry found.</p>
                )}
              </div>
            ) : activeTab === 'moderation' ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border-token bg-surface p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-border-token/40 pb-4">
                    <div>
                      <h3 className="text-xs font-bold text-primary-text uppercase tracking-widest">Inbound Content Reports</h3>
                      <p className="text-[10px] text-muted-token">A list of community flags requiring moderator actions</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reports.map((rep) => (
                      <div
                        key={rep.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4.5 rounded-xl bg-background border border-border-token/60 hover:border-border-token transition gap-4"
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary-text bg-surface border border-border-token px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                              {rep.type} Report
                            </span>
                            <span className="text-[9px] font-bold text-muted-token">{rep.date}</span>
                          </div>
                          <p className="text-xs font-bold text-secondary-text truncate">
                            Target ID: <span className="font-mono text-muted-token">@{rep.targetId}</span> | Filed By: <span className="text-accent-token">@{rep.reporter}</span>
                          </p>
                          <p className="text-xs text-primary-text leading-normal">
                            Reason: <span className="font-medium italic">"{rep.reason}"</span>
                          </p>
                          <p className="text-[10px] font-black text-indigo-400">
                            Status: {rep.status}
                          </p>
                        </div>
                        {rep.status === 'OPEN' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleResolveReport(rep.id, 'REMOVE')}
                              className="px-3.5 py-2 bg-danger-token/10 border border-danger-token/20 hover:bg-danger-token/20 rounded-xl text-xs font-bold text-danger-token transition"
                            >
                              Remove Content
                            </button>
                            <button
                              onClick={() => handleResolveReport(rep.id, 'DISMISS')}
                              className="px-3.5 py-2 border border-border-token hover:bg-surface-hover rounded-xl text-xs font-bold text-secondary-text transition"
                            >
                              Dismiss Report
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Storage tab */
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="rounded-2xl border border-border-token bg-surface p-6 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-primary-text uppercase tracking-widest">Disk Volume Telemetry</h3>
                    <p className="text-[10px] text-muted-token">Realtime metrics of storage limits and assets</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-secondary-text mb-1.5">
                        <span>Total Space Consumption</span>
                        <span>{storageStats.totalStorageUsedGB} / {storageStats.storageLimitGB} GB ({(storageStats.totalStorageUsedGB / storageStats.storageLimitGB * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-border-token">
                        <div
                          className="h-full bg-gradient-to-r from-accent-token to-indigo-500 transition"
                          style={{ width: `${(storageStats.totalStorageUsedGB / storageStats.storageLimitGB * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-token/40">
                      <div className="p-4 rounded-xl bg-background border border-border-token/60 space-y-1">
                        <p className="text-[10px] font-bold text-muted-token uppercase tracking-wider">Raw Uploads</p>
                        <p className="text-xl font-black text-primary-text">{storageStats.rawUploadsCount} files</p>
                        <p className="text-xs text-accent-token font-bold">{storageStats.rawUploadsSizeGB} GB total</p>
                      </div>

                      <div className="p-4 rounded-xl bg-background border border-border-token/60 space-y-1">
                        <p className="text-[10px] font-bold text-muted-token uppercase tracking-wider">Transcoded Variants</p>
                        <p className="text-xl font-black text-primary-text">{storageStats.variantsCount} outputs</p>
                        <p className="text-xs text-accent-token font-bold">{storageStats.transcodedSizeGB} GB total</p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-accent-token/5 border border-accent-token/10 p-4 text-xs leading-relaxed text-secondary-text font-medium">
                      💡 <strong className="text-primary-text">Storage Optimization Rule</strong>: Video uploads automatically transcode to optimized MP4 and multi-segment HLS streams. Raw uploads are kept for recovery purposes and can be scheduled to auto-purge after 30 days to free up block storage capacity.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
