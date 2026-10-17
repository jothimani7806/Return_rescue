import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  CheckCircle2,
  Tag,
  Wrench,
  Trash2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FastForward,
  Cpu,
  Layers,
  RotateCcw
} from 'lucide-react';
import './LoadingIntro.css';

export default function LoadingIntro({ onComplete }) {
  // Phase sequence: 1 (Emergence: 0-1.5s), 2 (Inspection: 1.5-3.5s), 3 (Routing: 3.5-5.0s), 4 (Brand Reveal: 5.0-5.8s)
  const [phase, setPhase] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [activeNode, setActiveNode] = useState(0); // 0 to 4 (staggered illuminate)

  const timerRef = useRef([]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 450);
  };

  useEffect(() => {
    // Phase 1 -> Phase 2 at 1.5s
    const t1 = setTimeout(() => {
      setPhase(2);
    }, 1500);

    // Phase 2 -> Phase 3 at 3.5s
    const t2 = setTimeout(() => {
      setPhase(3);
    }, 3500);

    // Stagger destination node illuminations in Phase 3
    const t3a = setTimeout(() => setActiveNode(1), 3650);
    const t3b = setTimeout(() => setActiveNode(2), 3950);
    const t3c = setTimeout(() => setActiveNode(3), 4250);
    const t3d = setTimeout(() => setActiveNode(4), 4550);

    // Phase 3 -> Phase 4 at 5.0s
    const t4 = setTimeout(() => {
      setPhase(4);
    }, 5000);

    // Fade out and transition to login at 5.8s
    const t5 = setTimeout(() => {
      setIsFadingOut(true);
    }, 5600);

    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 6050);

    timerRef.current = [t1, t2, t3a, t3b, t3c, t3d, t4, t5, t6];

    // Smooth progress bar ticker
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(prev + 1.25, 100);
      });
    }, 70);

    return () => {
      timerRef.current.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [onComplete]);

  // Destination nodes for Phase 3
  const nodes = [
    {
      id: 1,
      title: 'RESTOCK',
      desc: 'Immediate Reshelving',
      color: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)',
      border: 'border-emerald-500/50',
      icon: CheckCircle2,
      posClass: '-top-4 -left-12 sm:top-2 sm:-left-32',
    },
    {
      id: 2,
      title: 'RESALE',
      desc: 'Secondary Outlet',
      color: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.4)',
      border: 'border-blue-500/50',
      icon: Tag,
      posClass: '-top-4 -right-12 sm:top-2 sm:-right-32',
    },
    {
      id: 3,
      title: 'REPAIR',
      desc: 'Refurbish & Fix',
      color: '#F97316',
      glow: 'rgba(249, 115, 22, 0.4)',
      border: 'border-amber-500/50',
      icon: Wrench,
      posClass: 'bottom-4 -left-12 sm:bottom-8 sm:-left-32',
    },
    {
      id: 4,
      title: 'RECYCLE',
      desc: 'Circular Salvage',
      color: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.4)',
      border: 'border-rose-500/50',
      icon: Trash2,
      posClass: 'bottom-4 -right-12 sm:bottom-8 sm:-right-32',
    },
  ];

  // Dynamic Phase Status labels
  let statusBadge = 'INITIALIZING AI INSPECTION';
  let statusSub = 'Preparing inspection environment...';

  if (phase === 2) {
    statusBadge = 'AI CONDITION ANALYSIS';
    statusSub = 'Analyzing product condition & surface integrity...';
  } else if (phase === 3) {
    statusBadge = 'MAPPING RECOVERY PATHWAYS';
    statusSub = 'Evaluating Restock • Resale • Repair • Recycling routes...';
  } else if (phase === 4) {
    statusBadge = 'INSPECTION COMPLETE';
    statusSub = 'Preparing your workspace...';
  }

  return (
    <div
      role="dialog"
      aria-label="Return Rescue 3D Loading Sequence"
      className={`fixed inset-0 z-50 loading-intro-container flex flex-col justify-between items-center p-6 sm:p-10 transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 scale-98 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 p-0.5 shadow-md">
            <div className="w-full h-full rounded-[10px] bg-[#0B1020] flex items-center justify-center">
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-widest text-white uppercase">
            RETURN RESCUE <span className="text-[10px] font-mono text-cyan-400 font-semibold ml-1">AI LAB</span>
          </span>
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md group backdrop-blur"
          title="Skip intro and proceed directly to login"
        >
          <span>Skip Intro</span>
          <FastForward className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Center 3D Stage & Package Presentation */}
      <div className="relative flex flex-col items-center justify-center my-auto w-full max-w-lg">
        {/* Ambient Radial Background Glow */}
        <div className="absolute w-80 h-80 bg-gradient-to-tr from-cyan-500/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Floating Holographic Platform with Concentric Rings */}
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 flex items-center justify-center">
          {/* Outer SVG Hologram Circular Grid */}
          <svg
            className="absolute inset-0 w-full h-full holo-ring-1 pointer-events-none"
            viewBox="0 0 320 320"
          >
            <circle
              cx="160"
              cy="160"
              r="150"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="1"
              strokeDasharray="4 8"
              opacity="0.3"
            />
            <circle
              cx="160"
              cy="160"
              r="135"
              fill="none"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="16 12 4 12"
              opacity="0.45"
            />
          </svg>

          {/* Inner Counter-Rotating Hex Ring */}
          <svg
            className="absolute inset-0 w-full h-full holo-ring-2 pointer-events-none"
            viewBox="0 0 320 320"
          >
            <circle
              cx="160"
              cy="160"
              r="115"
              fill="none"
              stroke="#6366F1"
              strokeWidth="1"
              strokeDasharray="8 6"
              opacity="0.35"
            />
            <circle
              cx="160"
              cy="160"
              r="95"
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2"
              strokeDasharray="2 12"
              opacity="0.5"
            />
          </svg>

          {/* Glowing Platform Floor Disc */}
          <div className="absolute bottom-6 w-48 h-16 rounded-[100%] bg-gradient-to-t from-cyan-500/30 via-emerald-500/20 to-transparent border border-cyan-400/30 blur-[1px] holo-glow shadow-[0_0_40px_rgba(34,211,238,0.35)]" />

          {/* 3D Cardboard Package Cube */}
          <div
            className={`cube-wrap z-20 ${
              phase === 1 ? 'translate-y-12 scale-90 opacity-80' : 'translate-y-0 scale-100 opacity-100'
            }`}
          >
            {/* Front Face with Shipping Label and Barcode */}
            <div className="cube-face cube-face-front flex flex-col justify-between p-2.5">
              <div className="tape-strip-h" />
              <div className="flex justify-between items-start z-10">
                <span className="text-[8px] font-mono font-bold text-amber-950/70 bg-amber-200/60 px-1 rounded">
                  PRIORITY
                </span>
                <span className="text-[8px] font-bold text-amber-950/70">FRAGILE ⬆</span>
              </div>

              {/* Holographic Smart Label */}
              <div className="z-10 bg-amber-50/90 border border-amber-900/30 rounded p-1.5 shadow-sm text-left">
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-800">
                  <span className="font-extrabold text-indigo-900">RETURN RESCUE</span>
                  <span className="text-emerald-700 font-bold">● AI VERIFIED</span>
                </div>
                {/* Barcode representation */}
                <div className="mt-1 flex gap-0.5 h-3 items-end opacity-80">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 2].map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 h-full"
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <span className="text-[6px] font-mono text-slate-600 block mt-0.5">
                  RET-2026-AI-PATH
                </span>
              </div>

              <div className="flex justify-between items-center z-10 text-[7px] text-amber-950/60 font-mono">
                <span>HANDLE W/ CARE</span>
                <span>♻ RECYCLABLE</span>
              </div>
            </div>

            {/* Back Face */}
            <div className="cube-face cube-face-back">
              <div className="tape-strip-h" />
            </div>

            {/* Right Face with Package Recovery Stamp */}
            <div className="cube-face cube-face-right flex flex-col items-center justify-center p-2 text-center">
              <div className="w-10 h-10 rounded-full border border-amber-950/40 flex items-center justify-center text-amber-950/70">
                <RotateCcw className="w-5 h-5 text-amber-900/70" />
              </div>
              <span className="text-[7px] font-bold text-amber-950/70 mt-1 uppercase">CIRCULAR RETURN</span>
            </div>

            {/* Left Face */}
            <div className="cube-face cube-face-left">
              <div className="tape-strip-v" />
            </div>

            {/* Top Face with Center Packing Tape */}
            <div className="cube-face cube-face-top">
              <div className="tape-strip-h" />
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </div>

            {/* Bottom Face */}
            <div className="cube-face cube-face-bottom" />

            {/* Phase 2: Active AI Scanning Laser Beam */}
            {phase >= 2 && phase <= 3 && <div className="scan-beam" />}
          </div>

          {/* Phase 2 & 3: Floating Holographic Wireframe HUD */}
          {phase >= 2 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-25">
              <div className="w-52 h-44 border border-cyan-400/40 rounded-2xl relative flex flex-col justify-between p-2 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                {/* 4 Corner Crosshairs */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

                <div className="flex justify-between items-center text-[9px] font-mono text-cyan-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    AI VISION SCAN
                  </span>
                  <span>99.4% CONF</span>
                </div>

                <div className="flex justify-between items-center text-[8px] font-mono text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  <span>DIM: 32×24×18 CM</span>
                  <span>GRADE: INTACT</span>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Four Destination Recovery Nodes & Connecting Circuits */}
          {phase >= 3 && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {nodes.map((node) => {
                const isLit = activeNode >= node.id;
                const Icon = node.icon;
                return (
                  <div
                    key={node.id}
                    className={`absolute ${node.posClass} transition-all duration-500 ${
                      isLit
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-75 translate-y-2'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-2xl bg-slate-900/90 border ${node.border} backdrop-blur-md flex items-center gap-2.5 shadow-lg min-w-[130px]`}
                      style={{
                        boxShadow: isLit ? `0 0 24px ${node.glow}` : 'none',
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${node.color}25` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: node.color }} />
                      </div>
                      <div className="text-left">
                        <span
                          className="text-[11px] font-extrabold tracking-wider block"
                          style={{ color: node.color }}
                        >
                          {node.title}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-medium">
                          {node.desc}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Phase 4: Big Brand Reveal Overlay */}
        <div
          className={`transition-all duration-700 text-center mt-2 ${
            phase === 4
              ? 'opacity-100 transform translate-y-0 scale-100'
              : 'opacity-0 pointer-events-none transform translate-y-4 scale-95'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-emerald-300">
            RETURN RESCUE
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            "Give Every Returned Product a Second Chance."
          </p>
          <p className="text-xs text-cyan-400/90 font-medium mt-0.5">
            Inspect smarter. Recover more. Waste less.
          </p>
        </div>
      </div>

      {/* Bottom Progress Bar & Inspection Status */}
      <div className="w-full max-w-md z-20 space-y-2.5 mb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="font-mono font-bold text-cyan-300 text-[11px] tracking-wider uppercase">
              {statusBadge}
            </span>
          </div>
          <span className="font-mono text-slate-400 text-[11px] font-semibold">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Subtle Progress Bar with Animated Moving Shimmer */}
        <div className="w-full h-1.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-150 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-white/40 blur-xs rounded-full" />
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 font-medium">
          {statusSub}
        </p>
      </div>
    </div>
  );
}
