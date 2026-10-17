import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import recordStorage from '../../services/recordStorage';
import PageHeader from '../../components/common/PageHeader';
import {
  Package,
  Layers,
  HelpCircle,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
  Sparkles,
  Camera,
  CheckCircle2,
  Search
} from 'lucide-react';

export default function SubmitReturnWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    product_name: '',
    category_id: '',
    category_slug: '',
    unsupported_category_note: '',
    return_reason: 'DEFECTIVE_OR_DAMAGED',
    customer_description: '',
    is_functional: true,
    packaging_condition: 'ORIGINAL_OPENED',
    missing_accessories: '',
    condition_answers: {},
  });

  // SKU lookup state
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuMatched, setSkuMatched] = useState(null);

  // Images state: array of { file, preview, view_label }
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.getCategories();
        const list = res.data.results || res.data || [];
        setCategories(list);
        if (list.length > 0) {
          setFormData((prev) => ({
            ...prev,
            category_id: list[0].id,
            category_slug: list[0].slug,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  const handleSkuLookup = async () => {
    if (!formData.sku.trim()) return;
    setSkuLoading(true);
    setSkuMatched(null);
    try {
      const res = await api.lookupSku(formData.sku.trim());
      const prod = res.data;
      setSkuMatched(prod);
      setFormData((prev) => ({
        ...prev,
        product_name: prod.name,
        category_id: prod.category,
      }));
      // Find category slug
      const cat = categories.find((c) => c.id === prod.category);
      if (cat) {
        setFormData((prev) => ({ ...prev, category_slug: cat.slug }));
      }
    } catch {
      setSkuMatched(false);
    } finally {
      setSkuLoading(false);
    }
  };

  const selectedCategory = categories.find(
    (c) => c.id === Number(formData.category_id) || c.slug === formData.category_slug
  );

  const handleImageAdd = (e, viewLabel = 'FRONT') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImgs = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      view_label: viewLabel,
    }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleSubmit = async () => {
    setError('');
    if (images.length === 0) {
      setError('Please upload at least one real product image for visual condition inspection.');
      return;
    }
    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('sku', formData.sku);
      payload.append('product_name', formData.product_name || 'Returned Product');
      payload.append('category', formData.category_id);
      payload.append('category_slug', formData.category_slug);
      payload.append('unsupported_category_note', formData.unsupported_category_note);
      payload.append('return_reason', formData.return_reason);
      payload.append('customer_description', formData.customer_description);
      payload.append('is_functional', String(formData.is_functional));
      payload.append('packaging_condition', formData.packaging_condition);

      const accArray = formData.missing_accessories
        ? formData.missing_accessories.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      payload.append('missing_accessories', JSON.stringify(accArray));
      payload.append('condition_answers', JSON.stringify(formData.condition_answers));

      // Append images
      images.forEach((img) => {
        payload.append('images', img.file);
      });

      const res = await api.createReturn(payload);
      if (res.data) {
        recordStorage.saveRecord(res.data, user);
      }
      navigate(`/customer/return/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit return request. Please check fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Submit Product Return"
        description="Provide return reason, condition details, and real photos for AI visual inspection."
      />

      {/* Progress Steps Header */}
      <div className="mb-8 grid grid-cols-5 gap-2">
        {[
          { num: 1, label: 'Product Info' },
          { num: 2, label: 'Category' },
          { num: 3, label: 'Condition' },
          { num: 4, label: 'Upload Photos' },
          { num: 5, label: 'Review' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-3 rounded-xl border text-center transition-all ${
              step === s.num
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold shadow-glow-brand'
                : step > s.num
                ? 'bg-slate-900/60 border-emerald-500/30 text-emerald-400 font-medium'
                : 'bg-slate-900/30 border-slate-800 text-slate-500 font-medium'
            }`}
          >
            <span className="text-xs">
              {step > s.num ? '✓' : `0${s.num}`} {s.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="glass-panel border border-slate-800 rounded-3xl p-6 md:p-8">
        {/* STEP 1: Product Information */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-400" />
              Step 1: Product Identification
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Product SKU / Order Reference (Optional Lookup)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. ELC-IPHONE15-128 or CLO-LEVI-501"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSkuLookup}
                  disabled={skuLoading || !formData.sku}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {skuLoading ? 'Searching...' : 'Lookup SKU'}
                </button>
              </div>
              {skuMatched && (
                <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Found: {skuMatched.name} ({skuMatched.category_name})
                </p>
              )}
              {skuMatched === false && (
                <p className="mt-2 text-xs text-amber-400">
                  SKU not in standard catalog. Please provide product title below.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Product Title / Name *
              </label>
              <input
                type="text"
                required
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Category & Return Reason */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Step 2: Category & Return Reason
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Select Product Catalog Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => {
                  const catId = e.target.value;
                  const found = categories.find((c) => c.id === Number(catId));
                  setFormData({
                    ...formData,
                    category_id: catId,
                    category_slug: found ? found.slug : '',
                  });
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} {c.is_ai_supported ? ' (AI Vision Enabled)' : ' (Human Review)'}
                  </option>
                ))}
              </select>

              {selectedCategory && (
                <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
                  <p className="text-slate-300">{selectedCategory.description}</p>
                  {selectedCategory.is_ai_supported ? (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <Sparkles className="w-3.5 h-3.5" /> {selectedCategory.ai_support_notes}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5" /> Note: This category triggers human inspection review.
                    </span>
                  )}
                </div>
              )}
            </div>

            {selectedCategory?.slug === 'other-and-custom-product-categories' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Describe Custom / Unsupported Category
                </label>
                <input
                  type="text"
                  value={formData.unsupported_category_note}
                  onChange={(e) => setFormData({ ...formData, unsupported_category_note: e.target.value })}
                  placeholder="Specify product category type"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Primary Return Reason *
              </label>
              <select
                value={formData.return_reason}
                onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="DEFECTIVE_OR_DAMAGED">Defective or Damaged</option>
                <option value="NOT_AS_DESCRIBED">Item Not as Described</option>
                <option value="CHANGED_MIND">Changed Mind / No Longer Needed</option>
                <option value="WRONG_ITEM_SENT">Wrong Item Sent</option>
                <option value="SIZE_OR_FIT_ISSUE">Size or Fit Issue</option>
                <option value="MISSING_PARTS">Missing Parts or Accessories</option>
                <option value="OTHER">Other Reason</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 3: Condition & Functionality */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Step 3: Condition & Functionality Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Detailed Customer Description of Issue *
              </label>
              <textarea
                rows={3}
                required
                value={formData.customer_description}
                onChange={(e) => setFormData({ ...formData, customer_description: e.target.value })}
                placeholder="Describe any visible defects, performance problems, or reason for return in detail..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Is the product currently functional?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_functional: true })}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      formData.is_functional
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    Yes, Powers On / Works
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_functional: false })}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      !formData.is_functional
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    No, Faulty / Non-Functional
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                  Packaging Condition
                </label>
                <select
                  value={formData.packaging_condition}
                  onChange={(e) => setFormData({ ...formData, packaging_condition: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="ORIGINAL_SEALED">Original Factory Sealed</option>
                  <option value="ORIGINAL_OPENED">Original Packaging (Opened / Intact)</option>
                  <option value="DAMAGED_BOX">Packaging Damaged / Torn</option>
                  <option value="NO_PACKAGING">No Original Packaging</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Missing Accessories or Components (Comma-separated)
              </label>
              <input
                type="text"
                value={formData.missing_accessories}
                onChange={(e) => setFormData({ ...formData, missing_accessories: e.target.value })}
                placeholder="e.g. Charging cable, Manual, Screws (leave blank if complete)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Upload Photos */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Step 4: Upload Real Product Photos
            </h3>

            <p className="text-xs text-slate-400">
              Upload clear photographs of the product. The AI inspection model checks image quality, blurriness,
              and identifies visible condition defects for recovery routing.
            </p>

            {/* Quick Upload Slots by Viewpoint */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Front View', key: 'FRONT' },
                { label: 'Back View', key: 'BACK' },
                { label: 'Defect Close-up', key: 'CLOSE_UP_DEFECT' },
                { label: 'Packaging / Label', key: 'PACKAGING' },
              ].map((slot) => (
                <label
                  key={slot.key}
                  className="cursor-pointer border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-slate-900/40 hover:bg-slate-900/70 transition-all group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400 mb-2 transition-colors" />
                  <span className="text-xs font-semibold text-white">{slot.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">Click to add photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageAdd(e, slot.key)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase mb-2">
                  Uploaded Photos ({images.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-square group"
                    >
                      <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-950/80 text-rose-300 hover:text-white border border-rose-800 opacity-90 hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900/80 text-slate-200 backdrop-blur">
                        {img.view_label.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {step === 5 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Step 5: Review & Confirm Submission
            </h3>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Product:</span>
                <span className="font-semibold text-white">{formData.product_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-indigo-400">{selectedCategory?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Return Reason:</span>
                <span className="font-semibold text-white">{formData.return_reason.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Packaging:</span>
                <span className="font-semibold text-white">{formData.packaging_condition.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Functional Status:</span>
                <span className={`font-semibold ${formData.is_functional ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formData.is_functional ? 'Functional' : 'Non-functional / Faulty'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Issue Description:</span>
                <p className="text-slate-300 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                  "{formData.customer_description}"
                </p>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Attached Photos:</span>
                <span className="text-white font-semibold">{images.length} real photo(s) ready for AI inspection</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>
                Upon submission, the visual inspection pipeline will run automated defect detection and generate
                an initial recovery recommendation (RESTOCK, RESALE, REPAIR, or RECYCLING).
              </span>
            </div>
          </div>
        )}

        {/* Wizard Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1 && !formData.product_name) {
                  setError('Please provide product title.');
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-glow-brand transition-all"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-glow-restock transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'Inspecting & Submitting...' : 'Submit Return & Start Inspection'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
