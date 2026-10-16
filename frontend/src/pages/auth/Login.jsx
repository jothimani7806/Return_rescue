import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReturnRescueScene from './ReturnRescueScene';
import LoginForm from './LoginForm';

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

  return (
    <div className="min-h-screen w-full bg-[#080C16] flex flex-col lg:flex-row overflow-x-hidden">
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
  );
}
