import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import {
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  HardDrive,
  FileText,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDatasets = async () => {
    try {
      const res = await api.getDatasets();
      setDatasets(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDownload = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'downloading' }));
    setErrorMsg('');
    try {
      const res = await api.downloadDataset(id);
      if (res.data.report) {
        setSelectedReport(res.data.report);
      }
      setSuccessMsg(`Action executed for dataset #${id}. Status: ${res.data.status}`);
      await fetchDatasets();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Download action failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleValidate = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'validating' }));
    setErrorMsg('');
    try {
      const res = await api.validateDataset(id);
      setSelectedReport(res.data.report);
      setSuccessMsg('Validation completed. Dataset quality report generated.');
      await fetchDatasets();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Validation failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleSeedRegistry = async () => {
    setLoading(true);
    try {
      await api.seedDatasets();
      await fetchDatasets();
      setSuccessMsg('Dataset source registry updated.');
    } catch {
      setErrorMsg('Failed to refresh registry.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'READY_FOR_TRAINING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Ready for Training
          </span>
        );
      case 'DOWNLOADING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 animate-pulse">
            Downloading Archive...
          </span>
        );
      case 'DOWNLOADED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Downloaded
          </span>
        );
      case 'AWAITING_USER_AUTHORIZATION':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Auth / License Required
          </span>
        );
      case 'VALIDATION_FAILED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            Validation Failed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status?.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset Acquisition & Preparation Pipeline"
        description="Automated acquisition of defect benchmarks (MVTec AD, VisA, Kaggle, HuggingFace), file integrity audits, and train/val/test split preparation without physical leakage."
      >
        <button
          onClick={handleSeedRegistry}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Sync Registry
        </button>
      </PageHeader>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Dataset Sources Table */}
      <div className="glass-panel border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Dataset Name</th>
                <th className="py-3.5 px-4">Source Platform</th>
                <th className="py-3.5 px-4">Target Categories</th>
                <th className="py-3.5 px-4">License Terms</th>
                <th className="py-3.5 px-4">Valid Images</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    Loading dataset registry...
                  </td>
                </tr>
              ) : datasets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500 text-sm">
                    No dataset sources registered. Click "Sync Registry" to seed official benchmarks.
                  </td>
                </tr>
              ) : (
                datasets.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-white block">{src.name}</span>
                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        Source Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {src.platform_display || src.platform}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(src.target_categories || []).map((cat, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          >
                            {cat.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-slate-300 block">{src.license_name}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-2">{src.license_notes}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-white">
                        {src.valid_images} / {src.total_files}
                      </span>
                      {src.corrupt_files > 0 && (
                        <span className="text-[10px] text-rose-400 block font-semibold">
                          {src.corrupt_files} corrupt
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(src.download_status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(src.id)}
                          disabled={Boolean(actionLoading[src.id])}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {actionLoading[src.id] === 'downloading' ? 'Pulling...' : 'Fetch'}
                        </button>
                        <button
                          onClick={() => handleValidate(src.id)}
                          disabled={Boolean(actionLoading[src.id])}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium disabled:opacity-50"
                        >
                          Validate
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

      {/* Quality Report Modal / Inspection Details */}
      {selectedReport && (
        <div className="glass-panel border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Latest Quality & Integrity Audit Report: {selectedReport.dataset_name}
            </h4>
            <button
              onClick={() => setSelectedReport(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Total Files Checked</span>
              <span className="text-base font-bold text-white font-mono mt-0.5 block">
                {selectedReport.total_files}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Verified Openable Images</span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                {selectedReport.valid_images}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Corrupt Images Found</span>
              <span className={`text-base font-bold font-mono mt-0.5 block ${selectedReport.corrupt_files > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {selectedReport.corrupt_files}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-500 block">Current Readiness</span>
              <span className="text-xs font-bold text-indigo-400 mt-1 block">
                {selectedReport.status}
              </span>
            </div>
          </div>

          {selectedReport.class_distribution && Object.keys(selectedReport.class_distribution).length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase block mb-2">
                Class / Defect Category Distribution
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(selectedReport.class_distribution).map(([cls, count]) => (
                  <div key={cls} className="p-2 rounded-lg bg-slate-900/40 border border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-300 font-medium truncate">{cls}</span>
                    <span className="text-indigo-400 font-mono font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
