import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ImageGallery from '../../components/common/ImageGallery';
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Package,
  Layers,
  HelpCircle,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function CustomerReturnDetail() {
  const { id } = useParams();
  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReturn = async () => {
      try {
        const res = await api.getReturn(id);
        setReturnReq(res.data);
      } catch (err) {
        setError('Unable to load return details. You may not have permission to view this record.');
      } finally {
        setLoading(false);
      }
    };
    fetchReturn();
  }, [id]);

  if (loading) {
    return <div className="py-20 text-center text-slate-500 text-sm">Loading return request...</div>;
  }

  if (error || !returnReq) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <p className="text-sm text-rose-400">{error || 'Return request not found.'}</p>
        <Link to="/customer/dashboard" className="text-xs text-indigo-400 font-bold hover:underline">
          Return to My Returns
        </Link>
      </div>
    );
  }

  const steps = [
    { title: 'Return Submitted', done: true, date: returnReq.created_at },
    { title: 'AI Visual Inspection', done: Boolean(returnReq.ai_inspection), date: returnReq.ai_inspection?.inspected_at },
    { title: 'Review & Recovery Decision', done: Boolean(returnReq.final_recovery_outcome), date: returnReq.decision?.decided_at },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/customer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to My Returns
        </Link>
        <PageHeader
          title={`Return Request: ${returnReq.return_id}`}
          description={`Product: ${returnReq.product_name} • Category: ${returnReq.category_name}`}
        >
          {returnReq.final_recovery_outcome ? (
            <StatusBadge status={returnReq.final_recovery_outcome} />
          ) : (
            <StatusBadge status={returnReq.status} />
          )}
        </PageHeader>
      </div>

      {/* Progress Timeline */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Return Processing Timeline
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((st, i) => (
            <div
              key={i}
              className={`p-4 rounded-2xl border ${
                st.done
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900/30 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {st.done ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                {st.title}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {st.done && st.date ? new Date(st.date).toLocaleDateString() : 'Pending'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Recovery Outcome & Manager Decision Card */}
      {(returnReq.final_recovery_outcome || returnReq.decision) && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 border border-indigo-500/30 shadow-glow-brand space-y-3">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Manager Review & Final Return Decision</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={returnReq.final_recovery_outcome || returnReq.status} />
            <span className="text-xs text-slate-300">
              {returnReq.status === 'REJECTED'
                ? 'Your return request was evaluated and rejected.'
                : returnReq.status === 'MANUAL_INSPECTION'
                ? 'Your return has been flagged for in-person physical inspection at our intake facility.'
                : returnReq.status === 'INFO_REQUESTED'
                ? 'Additional information or clearer photos are needed to complete inspection.'
                : `Your return has been approved and assigned to ${returnReq.final_recovery_outcome || 'recovery processing'}.`}
            </span>
          </div>
          {(returnReq.decision?.override_reason || returnReq.decision?.approval_reason) && (
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold block mb-0.5">Manager Explanation:</span>
              <p className="text-slate-200 italic">
                "{returnReq.decision.override_reason || returnReq.decision.approval_reason}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Split Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Images */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Uploaded Inspection Photos ({returnReq.images?.length || 0})
          </h4>
          <ImageGallery images={returnReq.images} productName={returnReq.product_name} />
        </div>

        {/* Right Column: Submitted Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 text-xs">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Submission Details
            </h4>

            <div className="grid grid-cols-2 gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-slate-500 block mb-1">Return Reason:</span>
                <span className="font-semibold text-white">{returnReq.return_reason_display}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Packaging Condition:</span>
                <span className="font-semibold text-white">{returnReq.packaging_condition?.replace(/_/g, ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Functional Status:</span>
                <span className={returnReq.is_functional ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                  {returnReq.is_functional ? 'Functional' : 'Non-Functional / Faulty'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Submission Date:</span>
                <span className="text-slate-300">{new Date(returnReq.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Your Issue Description:</span>
              <p className="text-slate-300 italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                "{returnReq.customer_description}"
              </p>
            </div>

            {returnReq.missing_accessories && returnReq.missing_accessories.length > 0 && (
              <div>
                <span className="text-slate-500 block mb-1">Missing Accessories Reported:</span>
                <span className="text-amber-400">{returnReq.missing_accessories.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
