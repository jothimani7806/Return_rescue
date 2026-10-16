import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import {
  Boxes,
  Search,
  Package,
  ArrowRight,
  Clock,
  MapPin,
  User,
  RefreshCw,
  TrendingDown,
  Layers
} from 'lucide-react';

export default function InventoryPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getInventory();
      setTransactions(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.sku?.toLowerCase().includes(q) ||
      t.location?.toLowerCase().includes(q) ||
      t.transaction_type?.toLowerCase().includes(q) ||
      t.notes?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Allocation & Recovery Ledger"
        description="Real-time tracking of returned merchandise routed to prime stock, secondary resale, repair facilities, or recycling centers."
      >
        <button
          onClick={fetchInventory}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Ledger
        </button>
      </PageHeader>

      {/* Search Input */}
      <div className="glass-panel border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, warehouse bay, or transaction type..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">{filtered.length} transactions recorded</span>
      </div>

      {/* Ledger Table */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Transaction Type</th>
                <th className="py-3.5 px-4">SKU / Item</th>
                <th className="py-3.5 px-4">Target Location</th>
                <th className="py-3.5 px-4">Allocated Qty</th>
                <th className="py-3.5 px-4">Handled By</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    Loading inventory ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    No inventory transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 inline-block">
                        {tx.transaction_type_display || tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{tx.sku}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {tx.location}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">{tx.quantity} unit(s)</td>
                    <td className="py-3.5 px-4 text-slate-400">{tx.performed_by_name || 'System Auto'}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{tx.notes || '—'}</td>
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
