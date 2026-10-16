import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import {
  Sliders,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Wrench,
  ShieldAlert,
  HelpCircle,
  Check
} from 'lucide-react';

export default function CategoryAdmin() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Category Form
  const [newCat, setNewCat] = useState({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    is_ai_supported: false,
    ai_support_notes: 'Under initial evaluation. Mandatory human inspection.',
  });

  const fetchCats = async () => {
    try {
      const res = await api.getCategories();
      const list = res.data.results || res.data || [];
      setCategories(list);
      if (list.length > 0 && !selectedCat) {
        setSelectedCat(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCats();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const slugVal = newCat.slug.trim() || newCat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await api.createCategory({
        ...newCat,
        slug: slugVal,
      });
      setShowAddModal(false);
      setSuccessMsg(`Category '${newCat.name}' created successfully.`);
      setNewCat({
        name: '',
        slug: '',
        description: '',
        is_active: true,
        is_ai_supported: false,
        ai_support_notes: 'Under initial evaluation. Mandatory human inspection.',
      });
      await fetchCats();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to create category.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dynamic Product Catalog & Inspection Rules"
        description="Configure database-driven product categories, supported defect taxonomies, functional inspection questions, and recovery rules without rewriting code."
      >
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-glow-brand flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New Category
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

      {/* Main Layout: Categories List (Left) + Selected Category Details & Inspection Rule (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Category Selector (4 cols) */}
        <div className="lg:col-span-4 glass-panel border border-slate-800 rounded-3xl p-5 space-y-2 max-h-[75vh] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Catalog Categories ({categories.length})
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading categories...</div>
          ) : (
            categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCat(c)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedCat?.id === c.id
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-glow-brand font-bold'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">{c.name}</span>
                  {c.is_ai_supported ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      AI Vision
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                      Manual
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: Inspection Rules Configuration for Selected Category (8 cols) */}
        <div className="lg:col-span-8 glass-panel border border-slate-800 rounded-3xl p-6 space-y-6">
          {selectedCat ? (
            <>
              {/* Header Info */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCat.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedCat.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                      selectedCat.is_ai_supported
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {selectedCat.is_ai_supported ? 'AI Vision Verified' : 'Experimental / Human Review'}
                  </span>
                </div>
              </div>

              {/* AI Support Status Note */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs">
                <span className="text-slate-500 block uppercase font-semibold text-[10px] mb-1">
                  Vision Model Coverage Status
                </span>
                <p className="text-slate-300 leading-relaxed">{selectedCat.ai_support_notes || 'No specific notes.'}</p>
              </div>

              {/* Subcategories Pill List */}
              {selectedCat.subcategories && selectedCat.subcategories.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Catalog Subcategories ({selectedCat.subcategories.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedCat.subcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-medium"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category-Specific Defect Checklist */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  Category Defect Inspection Checklist
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedCat.inspection_rule?.defect_checklist || [
                    'Fabric tears or holes',
                    'Surface stains',
                    'Missing fasteners',
                  ]).map((def, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 flex items-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span>{def}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Functionality & Safety Checklists */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    Functionality Questions
                  </span>
                  <div className="space-y-2">
                    {(selectedCat.inspection_rule?.functionality_questions || [
                      'Does unit power on?',
                      'Are all accessories intact?',
                    ]).map((q, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300"
                      >
                        {q}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Critical Safety Hazards
                  </span>
                  <div className="space-y-2">
                    {(selectedCat.inspection_rule?.safety_checklist || [
                      'Exposed wires',
                      'Lithium battery swelling',
                    ]).map((s, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Economic Thresholds */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Max Repair Economic Threshold:</span>
                  <span className="text-slate-500 text-[11px]">
                    If repair cost exceeds this ratio of retail price, item is automatically recycled.
                  </span>
                </div>
                <span className="text-base font-bold text-indigo-400 font-mono">
                  {Math.round((selectedCat.inspection_rule?.max_repair_cost_ratio || 0.45) * 100)}%
                </span>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 text-xs">Select a category to view inspection rules.</div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Add New Product Catalog Category
            </h3>
            <p className="text-xs text-slate-400">
              The platform dynamically adapts to any product category without modifying core application code.
            </p>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  placeholder="e.g. Drone and Aerial Robotics"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Unique Slug (optional)</label>
                <input
                  type="text"
                  value={newCat.slug}
                  onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                  placeholder="e.g. drone-and-aerial-robotics"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newCat.description}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                  placeholder="Describe goods classified under this catalog category..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ai_toggle"
                  checked={newCat.is_ai_supported}
                  onChange={(e) => setNewCat({ ...newCat, is_ai_supported: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="ai_toggle" className="text-slate-300 font-medium">
                  Trained AI Model Available for this Category
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold shadow-glow-brand"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
