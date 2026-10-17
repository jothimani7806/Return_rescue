import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import recordStorage from '../../services/recordStorage';
import PageHeader from '../../components/common/PageHeader';
import MetricCard from '../../components/common/MetricCard';
import StatusBadge from '../../components/common/StatusBadge';
import {
  PlusCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  
  // Initialize immediately from persistent storage so past records never flicker or disappear
  const [returns, setReturns] = useState(() => recordStorage.getReturnsForUser(user, false));
  const [loading, setLoading] = useState(() => recordStorage.getReturnsForUser(user, false).length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReturns = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await api.getReturns();
      const rawData = res.data.results || res.data || [];
      const merged = recordStorage.mergeServerRecords(rawData, user, false);
      setReturns(merged);
    } catch (err) {
      console.warn('Backend fetch failed or timed out; relying on persistent local storage:', err);
      // Fallback to persistent storage to ensure zero data loss
      const local = recordStorage.getReturnsForUser(user, false);
      setReturns(local);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Sync state whenever recordStorage updates (e.g. from background or other tabs)
  useEffect(() => {
    const unsubscribe = recordStorage.subscribe(() => {
      const updated = recordStorage.getReturnsForUser(user, false);
      setReturns(updated);
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    // Initial fetch from backend
    fetchReturns();
  }, [fetchReturns]);

  const total = returns.length;
  const pending = returns.filter((r) => !r.final_recovery_outcome).length;
  const completed = returns.filter((r) => Boolean(r.final_recovery_outcome)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.first_name || user?.username || 'Customer'}!`}
        description="Track your product return requests, real-time inspection progress, and final manager recovery decisions."
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReturns(true)}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            title="Refresh returns and check for status updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>

          <Link
            to="/customer/submit"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-glow-brand transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Start New Return
          </Link>
        </div>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Returns"
          value={total}
          icon={ShoppingBag}
          subtitle="All submitted return requests (past & present)"
          glowColor="rgba(99, 102, 241, 0.2)"
        />
        <MetricCard
          title="In Review / Inspecting"
          value={pending}
          icon={Clock}
          subtitle="Undergoing condition assessment & verification"
          accentColor="text-amber-400"
          glowColor="rgba(245, 158, 11, 0.2)"
        />
        <MetricCard
          title="Completed Outcomes"
          value={completed}
          icon={CheckCircle2}
          subtitle="Processed & finalized recovery decisions"
          accentColor="text-emerald-400"
          glowColor="rgba(16, 185, 129, 0.2)"
        />
      </div>

      {/* Returns List */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Your Return Requests History
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 font-mono font-medium">
            {returns.length} records saved
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Loading your return history...</span>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm">You haven't submitted any return requests yet.</p>
            <Link
              to="/customer/submit"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:underline"
            >
              Submit your first return <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 mt-2">
            {returns.map((ret) => (
              <div
                key={ret.id || ret.return_id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/40 px-3 rounded-2xl transition-colors border border-transparent hover:border-slate-800/60"
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {ret.images && ret.images.length > 0 ? (
                      <img
                        src={ret.images[0].image || ''}
                        alt="product"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">{ret.return_id}</span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">{ret.category_name || 'General Product'}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">{ret.product_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted on {new Date(ret.created_at || Date.now()).toLocaleDateString()} • Reason: {ret.return_reason_display || ret.return_reason || 'Return requested'}
                    </p>
                    {ret.decision?.override_reason && (
                      <p className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" /> Manager Note: {ret.decision.override_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {ret.final_recovery_outcome ? (
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={ret.final_recovery_outcome} />
                      <span className="text-[10px] text-emerald-400/80 font-medium">Final Decision</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={ret.status} />
                      <span className="text-[10px] text-amber-400/80 font-medium">In Progress</span>
                    </div>
                  )}

                  <Link
                    to={`/customer/return/${ret.id || ret.return_id}`}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
