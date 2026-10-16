import React from 'react';
import { CheckCircle2, Tag, Wrench, Trash2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function StatusBadge({ status, type = 'status', className = '' }) {
  if (!status) {
    return <span className="text-xs text-slate-500">N/A</span>;
  }

  // Outcome Styles
  if (status === 'RESTOCK' || status === 'Restock (Full Inventory Return)') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-glow-restock ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        RESTOCK
      </span>
    );
  }

  if (status === 'RESALE' || status === 'Resale (Secondary Market / Discount)') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-glow-resale ${className}`}>
        <Tag className="w-3.5 h-3.5" />
        RESALE
      </span>
    );
  }

  if (status === 'REPAIR' || status === 'Repair (Refurbish & Fix)') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-glow-repair ${className}`}>
        <Wrench className="w-3.5 h-3.5" />
        REPAIR
      </span>
    );
  }

  if (status === 'RECYCLING' || status === 'Recycling (Safe Material Reclamation)') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 shadow-glow-recycle ${className}`}>
        <Trash2 className="w-3.5 h-3.5" />
        RECYCLING
      </span>
    );
  }

  // Workflow Statuses
  const statusConfig = {
    SUBMITTED: { label: 'Submitted', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: Clock },
    AWAITING_INSPECTION: { label: 'Pending AI Analysis', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock },
    INSPECTED_AI: { label: 'AI Inspected', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30', icon: ArrowRight },
    AWAITING_MANAGER_APPROVAL: { label: 'Pending Manager Review', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse-slow', icon: AlertTriangle },
    DECISION_APPROVED: { label: 'Approved', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
    OVERRIDDEN: { label: 'Overridden', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: AlertTriangle },
    IN_REPAIR: { label: 'In Repair', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: Wrench },
    RESTOCKED: { label: 'Restocked', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
    LISTED_FOR_RESALE: { label: 'Listed for Resale', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: Tag },
    RECYCLED: { label: 'Recycled', color: 'bg-red-500/15 text-red-300 border-red-500/30', icon: Trash2 },
    REJECTED: { label: 'Rejected', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', icon: AlertTriangle },
    MANUAL_INSPECTION: { label: 'Pending Manual Inspection', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: AlertTriangle },
    INFO_REQUESTED: { label: 'Info Requested', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', icon: Clock },
    COMPLETED: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  };

  const current = statusConfig[status] || {
    label: status.replace(/_/g, ' '),
    color: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: Clock
  };

  const IconComp = current.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.color} ${className}`}>
      <IconComp className="w-3.5 h-3.5" />
      {current.label}
    </span>
  );
}
