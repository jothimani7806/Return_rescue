import React, { useState } from 'react';
import { Package, Headphones, Shirt, Cpu, Smartphone, Laptop, Watch, ShoppingBag } from 'lucide-react';

const BACKEND_BASE = 'https://return-rescue.onrender.com';

export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getCategoryIcon(categoryName = '') {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('headphone') || cat.includes('audio') || cat.includes('earphone')) return Headphones;
  if (cat.includes('cloth') || cat.includes('apparel') || cat.includes('shirt') || cat.includes('wear')) return Shirt;
  if (cat.includes('phone') || cat.includes('mobile')) return Smartphone;
  if (cat.includes('laptop') || cat.includes('computer')) return Laptop;
  if (cat.includes('watch') || cat.includes('wearable')) return Watch;
  if (cat.includes('electronic')) return Cpu;
  return Package;
}

export default function ProductThumbnail({
  image = null,
  images = null,
  productName = 'Product',
  categoryName = '',
  className = 'w-14 h-14',
  iconSize = 'w-6 h-6',
  rounded = 'rounded-xl',
}) {
  const [hasError, setHasError] = useState(false);

  // Extract raw image string from image prop or images array
  let rawUrl = '';
  if (typeof image === 'string') {
    rawUrl = image;
  } else if (image && image.image) {
    rawUrl = image.image;
  } else if (Array.isArray(images) && images.length > 0) {
    rawUrl = images[0]?.image || '';
  }

  const resolvedUrl = resolveImageUrl(rawUrl);
  const IconComponent = getCategoryIcon(categoryName || productName);

  if (!resolvedUrl || hasError) {
    return (
      <div
        className={`${className} ${rounded} bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 flex-shrink-0 flex items-center justify-center relative overflow-hidden group shadow-inner`}
        title={`${productName} (${categoryName || 'Item'})`}
      >
        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />
        <IconComponent className={`${iconSize} text-indigo-400/80 group-hover:text-cyan-400 transition-colors`} />
      </div>
    );
  }

  return (
    <div
      className={`${className} ${rounded} bg-slate-900 border border-slate-800 flex-shrink-0 overflow-hidden flex items-center justify-center relative shadow-sm`}
    >
      <img
        src={resolvedUrl}
        alt={productName || 'product thumbnail'}
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}
