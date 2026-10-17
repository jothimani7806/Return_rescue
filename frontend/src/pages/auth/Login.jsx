import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReturnRescueScene from './ReturnRescueScene';
import LoginForm from './LoginForm';
import LoadingIntro from '../../components/common/LoadingIntro';
import { Sparkles } from 'lucide-react';

export default function Login({ initialPortal = null }) {
  const [searchParams] = useSearchParams();

  // Determine starting portal: prop > query param 'portal' > default 'customer'
  const effectivePortal = useMemo(() => {
    if (initialPortal) return initialPortal;
    const queryPortal = searchParams.get('portal');
    if (queryPortal === 'manager' || queryPortal === 'customer') {
      return queryPortal;
    }
    return 'customer';
  }, [initialPortal, searchParams]);

  // Session-based 3D Loading Intro: Plays once per tab session, or on demand via replay
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false;
    // Allow forcing intro via ?intro=true query param
    if (searchParams.get('intro') === 'true') return true;
    const hasSeen = sessionStorage.getItem('return_rescue_intro_seen');
    return !hasSeen;
  });

  const handleIntroComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('return_rescue_intro_seen', 'true');
    }
    setShowIntro(false);
  };

  const handleReplayIntro = () => {
    setShowIntro(true);
  };

  return (
    <>
      {/* Cinematic 3D Loading Intro Overlay */}
      {showIntro && <LoadingIntro onComplete={handleIntroComplete} />}

      {/* Main Login Interface with Smooth Fade-In Animation */}
      <div className={`min-h-screen w-full bg-[#080C16] flex flex-col lg:flex-row overflow-x-hidden transition-all duration-700 ${
        showIntro ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}>
        {/* Replay 3D Intro Floating Pill Button */}
        <button
          type="button"
          onClick={handleReplayIntro}
          className="fixed bottom-4 left-4 z-40 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xl backdrop-blur group"
          title="Replay the 3D cinematic inspection animation"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span>Replay 3D Intro</span>
        </button>

        {/* Left Panel: 55% Desktop Width 3D Logistics & AI Vision Scene */}
        <section
          aria-label="Return Rescue 3D Logistics Scene"
          className="w-full lg:w-[55%] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/80 relative"
        >
          <ReturnRescueScene />
        </section>

        {/* Right Panel: 45% Desktop Width Elegant Authentication Card */}
        <section
          aria-label="User Sign In Form"
          className="w-full lg:w-[45%] flex items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-gradient-to-br from-[#080C16] via-[#0E162B] to-[#0B1020]"
        >
          <LoginForm initialPortal={effectivePortal} />
        </section>
      </div>
    </>
  );
}
