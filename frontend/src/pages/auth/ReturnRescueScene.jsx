import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  RotateCcw,
  CheckCircle2,
  Tag,
  Wrench,
  Trash2,
  Cpu,
  Scan,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';
import './ReturnRescueScene.css';

export default function ReturnRescueScene() {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeNode, setActiveNode] = useState(0);

  // Cycle active destination node on a periodic rhythm matching the scan beam
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % 4);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Smooth mouse parallax handler
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const destinationNodes = [
    {
      id: 'restock',
      title: 'RESTOCK',
      desc: 'Grade A • Immediate Reshelving',
      color: '#10B981',
      bgGlow: 'rgba(16, 185, 129, 0.25)',
      borderColor: 'border-emerald-500/40',
      icon: CheckCircle2,
      position: 'top-6 left-6 md:top-10 md:left-10',
    },
    {
      id: 'resale',
      title: 'RESALE',
      desc: 'Grade B/C • Open-Box Secondary',
      color: '#3B82F6',
      bgGlow: 'rgba(59, 130, 246, 0.25)',
      borderColor: 'border-blue-500/40',
      icon: Tag,
      position: 'top-6 right-6 md:top-10 md:right-10',
    },
    {
      id: 'repair',
      title: 'REPAIR',
      desc: 'Refurbish • Component Fix',
      color: '#F97316',
      bgGlow: 'rgba(249, 115, 22, 0.25)',
      borderColor: 'border-amber-500/40',
      icon: Wrench,
      position: 'bottom-6 left-6 md:bottom-10 md:left-10',
    },
    {
      id: 'recycle',
      title: 'RECYCLE',
      desc: 'Circular • Material Salvage',
      color: '#EF4444',
      bgGlow: 'rgba(239, 68, 68, 0.25)',
      borderColor: 'border-rose-500/40',
      icon: Trash2,
      position: 'bottom-6 right-6 md:bottom-10 md:right-10',
    },
  ];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-full min-h-[580px] lg:min-h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-hidden select-none bg-gradient-to-br from-[#0B1020] via-[#0E162B] to-[#070B14]"
    >
      {/* Background Logistics Matrix Grid & Ambient Glows */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.15) 0%, transparent 60%), linear-gradient(to right, rgba(30, 41, 59, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.3) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Branding with custom Logo (Package + Circular Recovery Arrow) */}
      <div className="relative z-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-500 p-0.5 shadow-[0_0_25px_rgba(34,211,238,0.35)]">
            <div className="w-full h-full rounded-[14px] bg-[#0B1020] flex items-center justify-center relative overflow-hidden">
              <Package className="w-6 h-6 text-cyan-400 transform -translate-x-0.5" />
              <RotateCcw className="w-4 h-4 text-emerald-400 absolute bottom-1 right-1" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white font-sans uppercase">
                RETURN RESCUE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                AI Vision
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Give every returned product a second chance.
            </p>
          </div>
        </div>

        {/* Live Engine Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 border border-slate-800 text-xs text-slate-300 backdrop-blur">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-cyan-300 font-semibold">
            INSPECTION_CORE_v2.4: ACTIVE
          </span>
        </div>
      </div>

      {/* Middle Centerpiece: 3D Scene Viewport */}
      <div className="relative z-10 my-auto py-8 sm:py-12 flex items-center justify-center scene-viewport">
        {/* SVG Dynamic Circuit Lines Connecting Package to 4 Nodes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 600 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="grad-restock" x1="50%" y1="50%" x2="15%" y2="20%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-resale" x1="50%" y1="50%" x2="85%" y2="20%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-repair" x1="50%" y1="50%" x2="15%" y2="80%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-recycle" x1="50%" y1="50%" x2="85%" y2="80%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Lines */}
          <line
            x1="300"
            y1="200"
            x2="90"
            y2="70"
            stroke="url(#grad-restock)"
            strokeWidth="1.5"
            className="pulse-circuit opacity-60"
          />
          <line
            x1="300"
            y1="200"
            x2="510"
            y2="70"
            stroke="url(#grad-resale)"
            strokeWidth="1.5"
            className="pulse-circuit opacity-60"
          />
          <line
            x1="300"
            y1="200"
            x2="90"
            y2="330"
            stroke="url(#grad-repair)"
            strokeWidth="1.5"
            className="pulse-circuit opacity-60"
          />
          <line
            x1="300"
            y1="200"
            x2="510"
            y2="330"
            stroke="url(#grad-recycle)"
            strokeWidth="1.5"
            className="pulse-circuit opacity-60"
          />
        </svg>

        {/* 4 Destination Nodes positioned around center */}
        {destinationNodes.map((node, idx) => {
          const Icon = node.icon;
          const isPulsing = activeNode === idx;
          return (
            <div
              key={node.id}
              className={`absolute ${node.position} z-20 transition-all duration-500 transform ${
                isPulsing ? 'scale-105' : 'scale-100 opacity-85'
              }`}
            >
              <div
                className={`p-3 md:p-3.5 rounded-2xl glass-panel border ${node.borderColor} backdrop-blur-md flex items-center gap-3 shadow-lg transition-all duration-300`}
                style={{
                  boxShadow: isPulsing ? `0 0 25px ${node.bgGlow}` : 'none',
                  borderColor: isPulsing ? node.color : undefined,
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${node.color}20`,
                    color: node.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-black tracking-wider uppercase"
                      style={{ color: node.color }}
                    >
                      {node.title}
                    </span>
                    {isPulsing && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {node.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Floating Depth Parcels (Background Parallax Depth) */}
        <div
          className="absolute -top-4 right-1/4 w-12 h-12 rounded-xl bg-indigo-950/40 border border-indigo-500/20 pointer-events-none transform rotate-12 opacity-40 blur-[1px]"
          style={{
            transform: `translate(${mousePos.x * -35}px, ${mousePos.y * -35}px) rotate(18deg)`,
            transition: 'transform 0.2s ease-out',
          }}
        />
        <div
          className="absolute bottom-2 left-1/4 w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/20 pointer-events-none transform -rotate-12 opacity-50 blur-[1px]"
          style={{
            transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px) rotate(-14deg)`,
            transition: 'transform 0.2s ease-out',
          }}
        />

        {/* 3D Central Rotating Box with Realistic Cardboard Faces and Laser Scanner */}
        <div
          className="parcel-3d-stage relative flex items-center justify-center"
          style={{
            transform: `rotateY(${mousePos.x * 30}deg) rotateX(${-mousePos.y * 25}deg)`,
          }}
        >
          {/* Holographic Concentric Scanning Rings */}
          <div className="hologram-ring" />
          <div className="hologram-ring-outer" />

          {/* Contact Shadow beneath package */}
          <div className="contact-shadow" />

          {/* 3D Box Container */}
          <div className="parcel-body">
            {/* Animated Laser Beam sweeping across box */}
            <div className="laser-scanning-beam" />

            {/* FRONT FACE */}
            <div className="box-face box-front flex flex-col justify-between p-2">
              <div className="tape-strip-h">RETURN RESCUE</div>
              {/* Shipping Label */}
              <div className="shipping-label z-10">
                <div className="flex items-center justify-between border-b pb-1">
                  <span className="text-[6px] font-bold tracking-tighter">RR-EXPRESS</span>
                  <span className="text-[5px] font-mono text-emerald-600 font-bold">PASS</span>
                </div>
                {/* Barcode representation */}
                <div className="py-1">
                  <div className="h-5 flex items-stretch gap-0.5 justify-center">
                    <span className="w-0.5 bg-black" />
                    <span className="w-1 bg-black" />
                    <span className="w-0.5 bg-black" />
                    <span className="w-1.5 bg-black" />
                    <span className="w-0.5 bg-black" />
                    <span className="w-1 bg-black" />
                    <span className="w-2 bg-black" />
                    <span className="w-0.5 bg-black" />
                    <span className="w-1 bg-black" />
                    <span className="w-0.5 bg-black" />
                  </div>
                  <span className="text-[5px] font-mono block text-center mt-0.5 tracking-widest text-slate-700">
                    *RR-9428-AI*
                  </span>
                </div>
                <div className="text-[5px] font-bold text-slate-800 leading-tight">
                  INSPECTION: VERIFIED
                </div>
              </div>

              {/* Fragile & Eco Stamp */}
              <div className="self-end mt-auto z-10 p-1 bg-amber-900/20 border border-amber-900/40 rounded text-[7px] font-black text-amber-950 uppercase tracking-tighter">
                FRAGILE • AI CARE
              </div>
            </div>

            {/* BACK FACE */}
            <div className="box-face box-back flex items-center justify-center">
              <div className="tape-strip-h">CIRCULAR RECOVERY</div>
              <div className="w-16 h-16 rounded-xl border border-white/20 flex items-center justify-center opacity-40">
                <RotateCcw className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* RIGHT FACE */}
            <div className="box-face box-right flex flex-col justify-between p-2">
              <div className="tape-strip-v" />
              <div className="z-10 text-[7px] font-mono font-bold text-amber-950">
                DEST: HUB-01
              </div>
              <div className="z-10 text-[6px] font-mono text-amber-900 font-semibold self-end">
                WEIGHT: 1.42 KG
              </div>
            </div>

            {/* LEFT FACE */}
            <div className="box-face box-left flex flex-col justify-between p-2">
              <div className="tape-strip-v" />
              <div className="z-10 text-[7px] font-mono font-bold text-amber-950">
                BATCH #8410
              </div>
            </div>

            {/* TOP FACE */}
            <div className="box-face box-top flex items-center justify-center">
              <div className="tape-strip-h">SEALED BY RETURN RESCUE</div>
            </div>

            {/* BOTTOM FACE */}
            <div className="box-face box-bottom" />
          </div>
        </div>

        {/* Small Animated HUD Inspection Indicator Badge */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-cyan-500/30 backdrop-blur shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          <Scan className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-200 tracking-wider font-mono uppercase">
                AI CONDITION ANALYSIS
              </span>
              <span className="text-[9px] font-mono font-bold text-emerald-400">
                CONF: 98.4%
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400">
              SCAN_STATUS: SURFACE_CLEAN • CLASSIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Info: Supporting mission statement */}
      <div className="relative z-20 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-semibold text-slate-200">
            “AI-powered inspection that transforms product returns into recovery, reuse, and sustainability.”
          </p>
          <p className="text-[11px] text-cyan-400 font-medium mt-0.5">
            Inspect smarter. Recover more. Waste less.
          </p>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Role-Guarded Dual Authentication</span>
        </div>
      </div>
    </div>
  );
}
