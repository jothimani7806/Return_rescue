import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import {
  Users,
  Search,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const fetchCustomers = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await api.getCustomers(params);
      const list = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setCustomers(list);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError(err.response?.data?.error || 'Unable to retrieve customer accounts from the database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleToggleStatus = async (customer) => {
    setTogglingId(customer.id);
    setActionNotice('');
    try {
      const res = await api.toggleCustomerStatus(customer.id);
      setActionNotice(res.data.message);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customer.id ? { ...c, is_active: res.data.is_active } : c))
      );
      setTimeout(() => setActionNotice(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update customer account status.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.is_active).length;
  const totalReturns = customers.reduce((sum, c) => sum + (c.returns_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Account Management"
        description="View registered customer accounts, monitor return request history, and manage access status securely."
      >
        <button
          onClick={() => fetchCustomers(true)}
          disabled={refreshing}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Accounts'}</span>
        </button>
      </PageHeader>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice('')} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCustomers(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Customers</span>
            <h4 className="text-2xl font-bold text-white mt-1">{totalCustomers}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Persistently stored in database</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Accounts</span>
            <h4 className="text-2xl font-bold text-emerald-400 mt-1">{activeCustomers}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Authorized for portal login</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customer Returns</span>
            <h4 className="text-2xl font-bold text-purple-400 mt-1">{totalReturns}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Associated return records</p>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers by username, name, or email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-slate-900/40">
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Account Status</th>
                <th className="py-3.5 px-4">Returns Submitted</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading registered customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    No customer accounts match your search query.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-white block">
                          {c.first_name || c.last_name ? `${c.first_name} ${c.last_name}`.trim() : c.username}
                        </span>
                        <span className="text-[11px] font-mono text-indigo-400">@{c.username}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {c.email || 'No email provided'}
                        </span>
                        {c.phone_number && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {c.phone_number}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/manager/returns?search=${encodeURIComponent(c.username)}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 font-semibold text-xs transition-colors"
                        title="View returns submitted by this customer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{c.returns_count} {c.returns_count === 1 ? 'return' : 'returns'}</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {c.date_joined ? new Date(c.date_joined).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {c.last_login ? new Date(c.last_login).toLocaleString() : 'Never logged in'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        disabled={togglingId === c.id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                          c.is_active
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                        }`}
                        title={c.is_active ? 'Deactivate account without deleting records' : 'Activate account'}
                      >
                        {c.is_active ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
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
