import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Inbox,
  Search,
  Filter,
  ArrowRight,
  Package,
  Layers,
  Sparkles,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function ReturnQueue() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [returns, setReturns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Record deletion state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteNotification, setDeleteNotification] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getReturns(params);
      setReturns(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.deleteReturn(deleteTarget.id);
      setReturns((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteNotification(`Return record ${deleteTarget.return_id} has been permanently deleted from the queue.`);
      setDeleteTarget(null);
      setTimeout(() => setDeleteNotification(''), 5000);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete return record. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.getCategories();
        setCategories(res.data.results || res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReturns();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Return Request Queue"
        description="Live operational return pipeline across all product categories. Review AI visual inspection, approve recovery outcomes, or delete invalid records."
      >
        <button
          onClick={fetchReturns}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </PageHeader>

      {/* Delete Notification Toast/Alert */}
      {deleteNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{deleteNotification}</span>
          </div>
          <button
            onClick={() => setDeleteNotification('')}
            className="text-emerald-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Return ID, SKU, product name, or customer..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="AWAITING_INSPECTION">Pending AI Analysis</option>
            <option value="AWAITING_MANAGER_APPROVAL">Pending Manager Review</option>
            <option value="DECISION_APPROVED">Approved</option>
            <option value="OVERRIDDEN">Overridden</option>
            <option value="REJECTED">Rejected</option>
            <option value="MANUAL_INSPECTION">Pending Manual Inspection</option>
            <option value="INFO_REQUESTED">Information Requested</option>
            <option value="RESTOCKED">Restocked</option>
            <option value="LISTED_FOR_RESALE">Listed for Resale</option>
            <option value="IN_REPAIR">In Repair</option>
            <option value="RECYCLED">Recycled</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 max-w-[200px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Item & Return ID</th>
                <th className="py-3.5 px-4">Category / SKU</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">AI Visual Condition</th>
                <th className="py-3.5 px-4">Recommended</th>
                <th className="py-3.5 px-4">Final Outcome</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    Loading return queue records...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    No return requests matching your criteria.
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-900/40 transition-colors group">
                    {/* Item Thumbnail & Return ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {ret.images && ret.images.length > 0 ? (
                            <img
                              src={ret.images[0].image || ''}
                              alt="thumbnail"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-indigo-400 block">{ret.return_id}</span>
                          <span className="font-semibold text-white truncate max-w-xs block mt-0.5">
                            {ret.product_name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category & SKU */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium block">{ret.category_name}</span>
                      <span className="text-slate-500 font-mono text-[11px] block">{ret.sku || 'No SKU'}</span>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <span className="text-white font-medium block">{ret.customer_username}</span>
                      <span className="text-slate-500 text-[11px]">{new Date(ret.created_at).toLocaleDateString()}</span>
                    </td>

                    {/* AI Visual Condition */}
                    <td className="py-3.5 px-4">
                      {ret.ai_inspection ? (
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {ret.ai_inspection.overall_condition_display || ret.ai_inspection.overall_condition?.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] font-mono text-indigo-400">
                            {Math.round((ret.ai_inspection.confidence_score || 0) * 100)}% conf
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">Pending AI</span>
                      )}
                    </td>

                    {/* Recommended Outcome */}
                    <td className="py-3.5 px-4">
                      {ret.recommendation ? (
                        <StatusBadge status={ret.recommendation.recommended_action} />
                      ) : (
                        <span className="text-slate-600">Awaiting analysis</span>
                      )}
                    </td>

                    {/* Final Outcome */}
                    <td className="py-3.5 px-4">
                      {ret.final_recovery_outcome ? (
                        <StatusBadge status={ret.final_recovery_outcome} />
                      ) : (
                        <StatusBadge status={ret.status} />
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/manager/inspect/${ret.id}`}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs inline-flex items-center gap-1 shadow-glow-brand transition-all"
                        >
                          Inspect <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(ret)}
                          title="Delete Return Record"
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div
            className="relative w-full max-w-md rounded-3xl glass-panel border border-rose-500/40 bg-gradient-to-b from-[#1c1018] to-[#0d070b] p-6 sm:p-7 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Return Record?</h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to permanently delete return record{' '}
                  <span className="font-mono font-bold text-rose-300">{deleteTarget.return_id}</span>{' '}
                  for product <strong className="text-white">"{deleteTarget.product_name}"</strong>?
                </p>
                <div className="mt-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-0.5">
                  <p>Customer: <span className="text-slate-200">{deleteTarget.customer_username}</span></p>
                  <p>Status: <span className="text-indigo-300">{deleteTarget.status}</span></p>
                </div>
                <p className="mt-2 text-[11px] text-rose-400/90 font-medium">
                  This action removes the return, image evidence, AI analysis, and decision records.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-return"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Record...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
