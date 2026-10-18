import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import recordStorage from '../../services/recordStorage';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import ImageGallery from '../../components/common/ImageGallery';
import {
  ChevronLeft,
  Sparkles,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Tag,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
  Package,
  Layers,
  HelpCircle,
  DollarSign,
  FileText,
  XCircle,
  MessageSquare,
  Clock,
  UserCheck,
  History,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

export default function ReturnInspection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [returnReq, setReturnReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reinspecting, setReinspecting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Decision Form State: 'APPROVE' | 'OVERRIDE' | 'REJECT' | 'REQUEST_INFO' | 'FLAG_MANUAL'
  const [decisionMode, setDecisionMode] = useState('APPROVE');
  const [overrideAction, setOverrideAction] = useState('RESALE');
  const [decisionReason, setDecisionReason] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Record Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState(false);

  const handleDeleteRecord = async () => {
    setDeletingRecord(true);
    setError('');
    try {
      await api.deleteReturn(id);
      navigate('/manager/returns');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete return record.');
      setShowDeleteModal(false);
    } finally {
      setDeletingRecord(false);
    }
  };

  // Inspection Checklist verification
  const [checklistAnswers, setChecklistAnswers] = useState({
    item_functional: true,
    safety_checked: true,
    packaging_verified: true,
  });

  const fetchRecord = async () => {
    let recordData = null;

    try {
      const res = await api.getReturn(id);
      if (res && res.data) {
        recordData = res.data;
        recordStorage.saveRecord(recordData);
      }
    } catch (err) {
      console.warn('Inspection fetchRecord server error:', err);
    }

    // Fallback to local persistent storage if server does not have the record (e.g. ID 17 or client-cached)
    if (!recordData) {
      const searchId = String(id).trim().toLowerCase();
      const allLocal = recordStorage.getAllRecords(null, true);
      recordData = allLocal.find((r) => {
        const matchNumeric = r.id && String(r.id).toLowerCase() === searchId;
        const matchPublic = r.return_id && String(r.return_id).toLowerCase() === searchId;
        return matchNumeric || matchPublic;
      }) || null;
    }

    if (recordData) {
      setReturnReq(recordData);
      setError('');

      if (recordData.decision) {
        if (recordData.decision.is_override) {
          setDecisionMode('OVERRIDE');
          setOverrideAction(recordData.decision.final_action);
          setDecisionReason(recordData.decision.override_reason || '');
        } else if (recordData.decision.final_action === 'REJECTED') {
          setDecisionMode('REJECT');
          setDecisionReason(recordData.decision.override_reason || '');
        } else if (recordData.decision.final_action === 'MANUAL_INSPECTION') {
          setDecisionMode('FLAG_MANUAL');
          setDecisionReason(recordData.decision.override_reason || '');
        } else if (recordData.decision.final_action === 'INFO_REQUESTED') {
          setDecisionMode('REQUEST_INFO');
          setDecisionReason(recordData.decision.override_reason || '');
        } else {
          setDecisionMode('APPROVE');
        }
        setManagerNotes(recordData.decision.manager_notes || '');
      } else if (recordData.recommendation) {
        setDecisionMode('APPROVE');
      }
    } else {
      setError(`Return request #${id} was not found in the database. It may have been deleted or the identifier is invalid.`);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const handleReInspect = async () => {
    setReinspecting(true);
    setError('');
    try {
      const res = await api.triggerAiInspection(id);
      setReturnReq(res.data);
      setSuccessMsg('AI visual analysis and recovery rules re-evaluated successfully.');
    } catch {
      setError('Failed to re-run AI inspection.');
    } finally {
      setReinspecting(false);
    }
  };

  const validateAndPrompt = () => {
    setError('');
    if (decisionMode === 'OVERRIDE' && !decisionReason.trim()) {
      setError('Please provide an override justification when overriding the AI recommendation.');
      return;
    }
    if (decisionMode === 'REJECT' && !decisionReason.trim()) {
      setError('Please provide a reason for rejecting the return.');
      return;
    }
    if (decisionMode === 'REQUEST_INFO' && !decisionReason.trim()) {
      setError('Please specify the additional details or images required from the customer.');
      return;
    }
    if (decisionMode === 'FLAG_MANUAL' && !decisionReason.trim()) {
      setError('Please provide a note explaining why this return requires manual inspection.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleExecuteDecision = async () => {
    setSubmitting(true);
    setError('');

    let finalActionValue = null;
    let isOverrideFlag = false;

    if (decisionMode === 'APPROVE') {
      finalActionValue = returnReq.recommendation?.recommended_action || 'RESTOCK';
      isOverrideFlag = false;
    } else if (decisionMode === 'OVERRIDE') {
      finalActionValue = overrideAction;
      isOverrideFlag = true;
    } else if (decisionMode === 'REJECT') {
      finalActionValue = 'REJECTED';
      isOverrideFlag = true;
    } else if (decisionMode === 'REQUEST_INFO') {
      finalActionValue = 'INFO_REQUESTED';
      isOverrideFlag = false;
    } else if (decisionMode === 'FLAG_MANUAL') {
      finalActionValue = 'MANUAL_INSPECTION';
      isOverrideFlag = false;
    }

    try {
      const res = await api.approveDecision(id, {
        action_type: decisionMode,
        final_action: finalActionValue,
        is_override: isOverrideFlag,
        override_reason: decisionReason,
        approval_reason: decisionReason,
        manager_notes: managerNotes,
        checklist_verification: checklistAnswers,
      });

      setReturnReq(res.data);
      setShowConfirmModal(false);
      setSuccessMsg(`Decision successfully executed: Recorded as ${finalActionValue}.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit recovery decision.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Loading inspection record #{id}...</p>
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl">
          <AlertOctagon className="w-7 h-7 text-rose-400" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white">Inspection Record Unavailable</h2>
          <p className="text-xs text-rose-300 leading-relaxed max-w-md mx-auto">{error || 'Return inspection record not found.'}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            onClick={() => {
              setLoading(true);
              setError('');
              fetchRecord();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-glow-brand"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Inspection Fetch</span>
          </button>
          <Link
            to="/manager/returns"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors inline-block"
          >
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const ai = returnReq.ai_inspection;
  const rec = returnReq.recommendation;
  const decision = returnReq.decision;
  const decided = returnReq.final_recovery_outcome;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <Link
          to="/manager/returns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Return Queue
        </Link>
        <PageHeader
          title={`AI Return Inspection Workspace: ${returnReq.return_id}`}
          description={`Customer: ${returnReq.customer_username} (${returnReq.customer_email || 'No email'}) • Submitted: ${new Date(
            returnReq.created_at
          ).toLocaleString()}`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleReInspect}
              disabled={reinspecting}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${reinspecting ? 'animate-spin' : ''}`} />
              {reinspecting ? 'Analyzing...' : 'Re-run AI Analysis'}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              id="btn-delete-inspection-record"
              title="Permanently Delete this Return Record"
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Record</span>
            </button>
            {decided ? <StatusBadge status={decided} /> : <StatusBadge status={returnReq.status} />}
          </div>
        </PageHeader>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-STEP WORKFLOW CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Step 1: Product Evidence & Defect Inspection (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4" /> Step 1: Review Product Evidence
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {returnReq.images?.length || 0} Photos Uploaded
              </span>
            </div>

            {/* Customer Images Gallery with Zoom */}
            <ImageGallery images={returnReq.images} productName={returnReq.product_name} />

            {/* Product & Return Details Table */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Product Name</span>
                  <span className="font-bold text-white text-sm">{returnReq.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-semibold text-indigo-400">{returnReq.category_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">SKU Code</span>
                  <span className="font-mono text-slate-300">{returnReq.sku || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Packaging State</span>
                  <span className="font-semibold text-slate-200">{returnReq.packaging_condition?.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Claim</span>
                  <span className="font-semibold text-slate-200">{returnReq.return_reason_display}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Reported Function</span>
                  <span className={returnReq.is_functional ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {returnReq.is_functional ? 'Reported Functional' : 'Faulty / Non-Functional'}
                  </span>
                </div>
              </div>

              {/* Customer Description */}
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Customer Description:</span>
                <p className="text-slate-300 italic bg-slate-900/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                  "{returnReq.customer_description || 'No description provided.'}"
                </p>
              </div>

              {/* Missing Accessories */}
              {returnReq.missing_accessories && returnReq.missing_accessories.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <span className="font-bold block text-[11px] uppercase">Missing Components:</span>
                  <p className="mt-0.5">{returnReq.missing_accessories.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Step 2, Step 3, Step 4 (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 2: REVIEW AI CLASSIFICATION & RECOMMENDATION */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Step 2: Review AI Classification
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono">
                {ai?.model_name || 'Vision Pipeline'}
              </span>
            </div>

            {/* AI Classification Gauge & Status */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Model Predicted Condition
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {ai?.overall_condition_display || ai?.overall_condition?.replace(/_/g, ' ') || 'Pending AI Assessment'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Category Support:{' '}
                  <span className={ai?.is_category_supported ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {ai?.is_category_supported ? 'Verified Model Dataset Available' : 'Unsupported / General Fallback'}
                  </span>
                </p>
              </div>

              {/* Confidence Score */}
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-400 font-mono">
                  {Math.round((ai?.confidence_score || 0) * 100)}%
                </span>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                  Inference Confidence
                </span>
              </div>
            </div>

            {/* Model Uncertainty / Human Inspection Required Warning */}
            {ai?.requires_human_inspection && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider">Model Uncertainty Warning:</span>
                  <p className="mt-0.5 leading-relaxed">
                    {ai?.uncertainty_reason || 'Low inference confidence, image quality issues, or unsupported product catalog category.'}
                  </p>
                </div>
              </div>
            )}

            {/* Detected Defect Signatures */}
            {ai?.detected_defects && ai.detected_defects.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Detected Defect Signatures
                </span>
                <div className="space-y-1.5">
                  {ai.detected_defects.map((def, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span className="font-semibold text-white">{def.defect}</span>
                        {def.view && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {def.view} view
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-indigo-400 font-bold">{Math.round(def.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Recovery Channel & Economic Rationale */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">AI Recommended Channel:</span>
                  {rec && <StatusBadge status={rec.recommended_action} />}
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Rule Score: {Math.round((rec?.confidence || 0.85) * 100)}%
                </span>
              </div>

              {rec?.rationale && (
                <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {rec.rationale}
                </div>
              )}

              {/* Economic Estimates */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Est. Repair Cost</span>
                  <span className="text-base font-bold text-orange-400 font-mono mt-0.5 block">
                    ${Number(rec?.estimated_repair_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Est. Resale Value</span>
                  <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                    ${Number(rec?.estimated_resale_value || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Mandatory Advisory Notice */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-white">Manager Discretion Advisory:</strong> The AI recommendation supports your decision and is not automatically the final approval. You retain the authority to approve, override, reject, or request physical inspection.
              </p>
            </div>
          </div>

          {/* STEP 3: MAKE A DECISION (5 Actions) */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" /> Step 3: Make a Decision
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Choose One of 5 Operations</span>
            </div>

            {/* 5 Distinct Action Mode Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecisionMode('APPROVE')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  decisionMode === 'APPROVE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-glow-restock'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="text-left">
                  <span>Approve Recommendation</span>
                  <span className="block text-[10px] text-slate-500 font-normal">Confirm AI channel</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecisionMode('OVERRIDE')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  decisionMode === 'OVERRIDE'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-glow-brand'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <Tag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <div className="text-left">
                  <span>Override Recommendation</span>
                  <span className="block text-[10px] text-slate-500 font-normal">Select alternate route</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecisionMode('REJECT')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  decisionMode === 'REJECT'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-glow-recycle'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <div className="text-left">
                  <span>Reject Return</span>
                  <span className="block text-[10px] text-slate-500 font-normal">Decline request</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecisionMode('REQUEST_INFO')}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all ${
                  decisionMode === 'REQUEST_INFO'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="text-left">
                  <span>Request More Info</span>
                  <span className="block text-[10px] text-slate-500 font-normal">Ask for clear photos</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDecisionMode('FLAG_MANUAL');
                  if (!decisionReason) {
                    setDecisionReason(
                      ai?.uncertainty_reason || 'Uncertain model classification requires manual specialist verification.'
                    );
                  }
                }}
                className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all sm:col-span-2 lg:col-span-2 ${
                  decisionMode === 'FLAG_MANUAL'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div className="text-left">
                  <span>Flag for Manual Inspection</span>
                  <span className="block text-[10px] text-slate-500 font-normal">
                    Route to physical bay (unsupported category / uncertain photos)
                  </span>
                </div>
              </button>
            </div>

            {/* DYNAMIC FORM BASED ON SELECTED ACTION */}
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
              {decisionMode === 'APPROVE' && (
                <div className="text-xs space-y-2">
                  <p className="text-slate-300">
                    You are approving the AI model's recommendation of{' '}
                    <strong className="text-emerald-400 uppercase">
                      {returnReq.recommendation?.recommended_action || 'RESTOCK'}
                    </strong>
                    .
                  </p>
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                      Approval Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="e.g. Verified packaging seals and condition match recommendation."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {decisionMode === 'OVERRIDE' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1.5">
                      Select Target Recovery Channel
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'RESTOCK', label: 'RESTOCK', icon: CheckCircle2, color: 'text-emerald-400' },
                        { key: 'RESALE', label: 'RESALE', icon: Tag, color: 'text-blue-400' },
                        { key: 'REPAIR', label: 'REPAIR', icon: Wrench, color: 'text-orange-400' },
                        { key: 'RECYCLING', label: 'RECYCLING', icon: Trash2, color: 'text-red-400' },
                      ].map((act) => {
                        const Icon = act.icon;
                        const isSelected = overrideAction === act.key;
                        return (
                          <button
                            key={act.key}
                            type="button"
                            onClick={() => setOverrideAction(act.key)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-glow-brand'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${act.color}`} />
                            {act.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-amber-400 text-[10px] uppercase font-bold mb-1">
                      Override Justification (Required) *
                    </label>
                    <input
                      type="text"
                      required
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      placeholder="Explain why you are overriding the AI recommendation (e.g. Minor scratch acceptable for VIP resale)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-amber-500/50 text-white text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {decisionMode === 'REJECT' && (
                <div className="space-y-2 text-xs">
                  <label className="block text-rose-400 text-[10px] uppercase font-bold">
                    Rejection Reason (Required) *
                  </label>
                  <input
                    type="text"
                    required
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="State reason for return rejection (e.g. Return window expired, non-returnable hygiene item)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-rose-500/50 text-white text-xs focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}

              {decisionMode === 'REQUEST_INFO' && (
                <div className="space-y-2 text-xs">
                  <label className="block text-cyan-400 text-[10px] uppercase font-bold">
                    Requested Information Note (Required) *
                  </label>
                  <input
                    type="text"
                    required
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Specify what additional photos or proof the customer must provide..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/50 text-white text-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {decisionMode === 'FLAG_MANUAL' && (
                <div className="space-y-2 text-xs">
                  <label className="block text-amber-400 text-[10px] uppercase font-bold">
                    Manual Inspection Routing Reason (Required) *
                  </label>
                  <input
                    type="text"
                    required
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Reason for routing to manual bay (e.g. Unsupported luxury jewelry category requires physical appraiser)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-amber-500/50 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Internal Manager Notes */}
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Technician / Inspection Notes (Internal Database Audit)
                </label>
                <textarea
                  rows={2}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Additional technician observations or internal instructions..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Execution Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={validateAndPrompt}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-restock flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {decisionMode === 'APPROVE' && `Confirm & Approve Recommendation`}
                  {decisionMode === 'OVERRIDE' && `Confirm & Override as ${overrideAction}`}
                  {decisionMode === 'REJECT' && `Confirm & Reject Return Request`}
                  {decisionMode === 'REQUEST_INFO' && `Send Request for Information`}
                  {decisionMode === 'FLAG_MANUAL' && `Route to Manual Inspection Bay`}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 4: SAVE & AUDIT TRAIL */}
          <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4" /> Step 4: Decision Record & Audit History
              </span>
              <span className="text-[10px] font-mono text-slate-400">Database Synchronized</span>
            </div>

            {decision ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Manager</span>
                    <span className="font-bold text-white text-sm">{decision.manager_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Decision Timestamp</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(decision.decided_at).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Original AI Recommendation</span>
                    <span className="font-semibold text-slate-300">
                      {decision.original_recommendation || rec?.recommended_action || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Final Approved Action</span>
                    <span className="font-bold text-emerald-400">{decision.final_action}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Override Status</span>
                    <span className={decision.is_override ? 'text-purple-400 font-bold' : 'text-slate-400 font-medium'}>
                      {decision.is_override ? 'Yes (Overridden by Manager)' : 'No (Approved Recommendation)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Status Progression</span>
                    <span className="font-mono text-indigo-400">
                      {decision.previous_status || 'AWAITING_MANAGER_APPROVAL'} → {decision.new_status || returnReq.status}
                    </span>
                  </div>
                </div>

                {(decision.override_reason || decision.approval_reason) && (
                  <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                    <span className="text-slate-400 block font-semibold mb-0.5">Recorded Reason / Justification:</span>
                    <p className="text-slate-200 italic">
                      "{decision.override_reason || decision.approval_reason}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No decision recorded yet. Complete Step 3 above to execute and persist manager decision in the audit trail.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Confirm Return Decision
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to execute <strong className="text-white uppercase">{decisionMode}</strong> for return{' '}
              <span className="font-mono font-bold text-indigo-400">{returnReq.return_id}</span>?
            </p>
            <p className="text-[11px] text-slate-400">
              This will update the database, register an audit log entry, adjust inventory allocations, and update the customer's portal view.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteDecision}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-glow-restock flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {submitting ? 'Confirming...' : 'Yes, Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-md glass-panel border border-rose-500/40 bg-gradient-to-b from-[#1a0f16] to-[#0c070a] rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Permanently Delete Return?</h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to delete return <span className="font-mono font-bold text-rose-300">{returnReq.return_id}</span> ({returnReq.product_name})?
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  This action permanently purges this return request, its image evidence, AI defect inspection, and audit history.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={deletingRecord}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-inspection"
                disabled={deletingRecord}
                onClick={handleDeleteRecord}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingRecord ? 'Deleting Record...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
