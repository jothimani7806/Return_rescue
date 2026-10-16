import React, { useState } from 'react';
import { ZoomIn, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function ImageGallery({ images = [], productName = 'Product' }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 bg-slate-900/40">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No inspection images uploaded</p>
      </div>
    );
  }

  const currentImage = images[selectedIndex] || images[0];
  const imageUrl = currentImage?.image || '';

  return (
    <div className="space-y-4">
      {/* Main Image Stage */}
      <div className="relative group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 aspect-square max-h-96 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={`${productName} view`}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
          onClick={() => setIsZoomed(true)}
        />

        {/* View & Quality Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2 pointer-events-none">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900/80 text-white backdrop-blur border border-white/10 shadow-sm">
            {currentImage.view_label?.replace(/_/g, ' ')}
          </span>
          {currentImage.image_quality_status === 'VALID' ? (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Sharp ({Math.round((currentImage.quality_score || 0.95) * 100)}%)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {currentImage.image_quality_status}
            </span>
          )}
        </div>

        {/* Zoom trigger icon */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute bottom-3 right-3 p-2 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white backdrop-blur border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Click to enlarge"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnails row */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((img, idx) => {
            const thumbUrl = img.image || '';
            return (
              <button
                key={img.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedIndex === idx
                    ? 'border-indigo-500 shadow-glow-brand ring-1 ring-indigo-500/50'
                    : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                <img src={thumbUrl} alt="thumbnail" className="w-full h-full object-cover" />
              </button>
            );
          })}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute -top-10 right-0 text-slate-300 hover:text-white p-1 rounded-full bg-slate-800 border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={imageUrl}
              alt={productName}
              className="max-w-full max-h-[85vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
            <p className="mt-3 text-xs text-slate-400">
              {productName} - {currentImage.view_label?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
