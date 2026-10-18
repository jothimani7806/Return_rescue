import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import MetricCard from '../../components/common/MetricCard';
import StatusBadge from '../../components/common/StatusBadge';
import BlurText from '../../components/reactbits/BlurText';
import {
  Inbox,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Wrench,
  Trash2,
  DollarSign,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  HelpCircle,
  Package,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getDashboardMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return <div className="py-24 text-center text-slate-500 text-sm">Loading operations analytics...</div>;
  }

  // Outcome colors for donut chart
  const outcomeData = [
    { name: 'Restock', value: metrics.restock_count, color: '#10b981' },
    { name: 'Resale', value: metrics.resale_count, color: '#3b82f6' },
    { name: 'Repair', value: metrics.repair_count, color: '#f97316' },
    { name: 'Recycling', value: metrics.recycling_count, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  // Category volume data
  const categoryChartData = (metrics.category_counts || []).map((c) => ({
    name: c.category__name?.split(' ')[0] || 'Cat',
    fullName: c.category__name,
    returns: c.count,
  }));

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 via-indigo-950/20 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4" /> Universal Recovery Operations
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            <BlurText text={`Hello, ${user?.first_name || user?.username || 'Manager'}`} />
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} •{' '}
            {metrics.awaiting_approval} returns awaiting condition verification & decision approval.
          </p>
        </div>

        <div className="relative z-10 flex gap-3 flex-wrap items-center">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/manager/returns?status=AWAITING_MANAGER_APPROVAL"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-glow-brand flex items-center gap-2 transition-all"
          >
            Inspect Pending ({metrics.awaiting_approval})
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/manager/datasets"
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Dataset Pipeline
          </Link>
        </div>
      </div>

      {/* 7 Animated Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          title="Total Returns"
          value={metrics.total_returns}
          icon={Inbox}
          glowColor="rgba(99, 102, 241, 0.2)"
        />
        <MetricCard
          title="Pending AI"
          value={metrics.pending_inspection}
          icon={Clock}
          accentColor="text-amber-400"
          glowColor="rgba(245, 158, 11, 0.2)"
        />
        <MetricCard
          title="Awaiting Review"
          value={metrics.awaiting_approval}
          icon={AlertTriangle}
          accentColor="text-amber-400"
          glowColor="rgba(245, 158, 11, 0.25)"
        />
        <MetricCard
          title="Restocked"
          value={metrics.restock_count}
          icon={CheckCircle2}
          accentColor="text-emerald-400"
          glowColor="rgba(16, 185, 129, 0.25)"
        />
        <MetricCard
          title="Resale Outlet"
          value={metrics.resale_count}
          icon={Tag}
          accentColor="text-blue-400"
          glowColor="rgba(59, 130, 246, 0.25)"
        />
        <MetricCard
          title="In Repair"
          value={metrics.repair_count}
          icon={Wrench}
          accentColor="text-orange-400"
          glowColor="rgba(249, 115, 22, 0.25)"
        />
        <MetricCard
          title="Recycled"
          value={metrics.recycling_count}
          icon={Trash2}
          accentColor="text-rose-400"
          glowColor="rgba(239, 68, 68, 0.25)"
        />
      </div>

      {/* Recovered Value & Repair Economics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Recovered Resale Value
            </p>
            <h4 className="text-2xl font-bold text-emerald-400 mt-1">
              ${(metrics.recovered_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Estimated salvage revenue from approved restock & resale</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-orange-500/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Estimated Refurbishment Cost
            </p>
            <h4 className="text-2xl font-bold text-orange-400 mt-1">
              ${(metrics.estimated_repair_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Budget allocated for repairable return inventory</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Return Distribution (Bar Chart) */}
        <div className="lg:col-span-8 glass-panel border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Return Volume by Product Category
              </h3>
              <p className="text-xs text-slate-500">Distribution across e-commerce catalog categories</p>
            </div>
            <span className="text-xs text-indigo-400 font-semibold">{metrics.category_counts?.length || 0} active categories</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                />
                <Bar dataKey="returns" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Outcomes Donut Chart */}
        <div className="lg:col-span-4 glass-panel border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Approved Recovery Outcomes
            </h3>
            <p className="text-xs text-slate-500 mb-2">Final manager-approved routing</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {outcomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No completed outcomes yet</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
            <span className="text-slate-400">Total Decided:</span>
            <span className="font-bold text-white text-right">
              {metrics.restock_count + metrics.resale_count + metrics.repair_count + metrics.recycling_count}
            </span>
          </div>
        </div>
      </div>

      {/* Safety Alerts & Low Confidence Predictions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Safety Alerts Panel */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              High Priority Safety Hazards ({metrics.safety_alerts?.length || 0})
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
              Action Required
            </span>
          </div>

          <div className="space-y-2.5">
            {metrics.safety_alerts?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No critical safety hazards detected.</p>
            ) : (
              metrics.safety_alerts?.map((alert, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs flex items-start gap-3"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{alert.return_id}</span>
                      <span className="text-slate-400">• {alert.product_name}</span>
                    </div>
                    <p className="text-rose-300 mt-1 leading-relaxed">{alert.alert}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Confidence Predictions */}
        <div className="glass-panel border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Low Confidence AI Predictions ({metrics.low_confidence_list?.length || 0})
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              Human Review Needed
            </span>
          </div>

          <div className="space-y-2.5">
            {metrics.low_confidence_list?.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">All predictions meet confidence thresholds.</p>
            ) : (
              metrics.low_confidence_list?.map((item, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.return_id}</span>
                      <span className="text-slate-400">• {item.product_name}</span>
                    </div>
                    <p className="text-amber-300 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-bold whitespace-nowrap">
                    {Math.round((item.confidence || 0) * 100)}% conf
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Returns Table */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Recent Return Inflow</h3>
            <p className="text-xs text-slate-500">Live operational intake queue</p>
          </div>
          <Link
            to="/manager/returns"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
          >
            Full Return Queue <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Return ID</th>
                <th className="py-3 px-3">Product Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Workflow Status</th>
                <th className="py-3 px-3">Approved Outcome</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(!metrics.recent_activity || metrics.recent_activity.length === 0) ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No recent return requests recorded in the database.
                  </td>
                </tr>
              ) : (
                metrics.recent_activity.map((r) => (
                  <tr key={r.id || r.return_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-indigo-400">{r.return_id}</td>
                    <td className="py-3 px-3 font-semibold text-white max-w-xs truncate">{r.product_name}</td>
                    <td className="py-3 px-3 text-slate-400">{r.category}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-3">
                      {r.outcome ? <StatusBadge status={r.outcome} /> : <span className="text-slate-600">Pending</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/manager/inspect/${r.id || r.return_id}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
