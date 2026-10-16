import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
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
  Sparkles
} from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReturns = async () => {
      try {
        const res = await api.getReturns();
        setReturns(res.data.results || res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReturns();
  }, []);

  const total = returns.length;
  const pending = returns.filter((r) => !r.final_recovery_outcome).length;
  const completed = returns.filter((r) => Boolean(r.final_recovery_outcome)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.first_name || user?.username}!`}
        description="Track your product return requests, inspection progress, and final recovery status."
      >
        <Link
          to="/customer/submit"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-glow-brand transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Start New Return
        </Link>
      </PageHeader>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Returns"
          value={total}
          icon={ShoppingBag}
          subtitle="All submitted return requests"
          glowColor="rgba(99, 102, 241, 0.2)"
        />
        <MetricCard
          title="In Review / Inspecting"
          value={pending}
          icon={Clock}
          subtitle="Undergoing condition assessment"
          accentColor="text-amber-400"
          glowColor="rgba(245, 158, 11, 0.2)"
        />
        <MetricCard
          title="Completed Outcomes"
          value={completed}
          icon={CheckCircle2}
          subtitle="Processed recovery decisions"
          accentColor="text-emerald-400"
          glowColor="rgba(16, 185, 129, 0.2)"
        />
      </div>

      {/* Returns List */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Your Return Requests
          </h3>
          <span className="text-xs text-slate-400">{returns.length} records</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading return history...</div>
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
                key={ret.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-900/30 px-3 rounded-2xl transition-colors"
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
                      <span className="text-xs text-slate-400">{ret.category_name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">{ret.product_name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted on {new Date(ret.created_at).toLocaleDateString()} • Reason: {ret.return_reason_display}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {ret.final_recovery_outcome ? (
                    <StatusBadge status={ret.final_recovery_outcome} />
                  ) : (
                    <StatusBadge status={ret.status} />
                  )}

                  <Link
                    to={`/customer/return/${ret.id}`}
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
