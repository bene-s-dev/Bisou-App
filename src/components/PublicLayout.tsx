import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';

import ScalingContainer from './ScalingContainer';

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isKuss, setIsKuss] = useState(false);
  const words = ['Küsschen', 'bisschen'];
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsKuss(true);
    }, 1500);

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setIsFading(false);
      }, 600);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const isAuthPage = ['/signin', '/signup'].includes(location.pathname);
  const isLandingPage = location.pathname === '/';

  const content = (
    <div className={`${isAuthPage ? 'w-full h-full overflow-y-auto scrollbar-soft' : 'h-[100svh] w-screen overflow-hidden'} bg-[#F8F7FF] text-[#1F1939] font-['Plus_Jakarta_Sans',_sans-serif] flex flex-col relative`}>
      {isLandingPage ? (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#FFE3E3] via-[#F4F1FF] to-[#E2DDFF] pointer-events-none overflow-hidden">
          {/* Glowing ambient blobs */}
          <div className="absolute top-[-15%] right-[-15%] w-[60vw] h-[60vw] rounded-full bg-[#FF6B6B]/25 blur-[100px] sm:blur-[140px] animate-pulse-slow" />
          <div className="absolute bottom-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-[#8179E0]/25 blur-[120px] sm:blur-[170px] animate-pulse-slow" />
        </div>
      ) : (
        !isAuthPage && <div className="bg-aura" />
      )}

      {/* Header */}
      <header className={`mx-auto ${isAuthPage ? 'pt-6' : 'pt-12'} pb-0 text-center select-none w-full relative shrink-0 z-20 px-4 ${isLandingPage ? 'max-w-5xl' : 'max-w-md'}`}>
        {!isAuthPage && (
          <div className="absolute top-4 right-4">
            <button 
              onClick={() => navigate('/signin')} 
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border-2 border-[var(--card-border)] text-[var(--secondary)] font-black text-[10px] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
              Login <LogIn className="w-3.5 h-3.5" />
            </button>
          </div>
        )}        
        <button 
          onClick={() => navigate('/')}
          className="group transition-transform active:scale-95"
        >
          <h1 className="text-6xl font-semibold text-[var(--text-main)] mb-2 tracking-tight group-hover:text-[var(--primary)] transition-colors" style={{ fontFamily: 'Fraunces, serif' }}>
            Bisou
          </h1>
        </button>
        
        <div className="text-[var(--text)] text-base font-bold flex items-center justify-center select-none w-full" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          <div className="flex items-center justify-center">
            <span className="whitespace-nowrap">Jeden Tag ein&nbsp;</span>

            <span className="relative inline-flex items-center justify-center text-[var(--primary)] h-[1.2em]">
              <span className="invisible px-[1px] whitespace-nowrap">{words[0]}</span>
              <span className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out px-[1px]" 
                    style={{ 
                      opacity: isFading ? 0 : 1,
                      transform: isFading ? 'translateY(-10px)' : 'translateY(0)'
                    }}>
                {words[wordIndex]}
              </span>
            </span>

            <span className="whitespace-nowrap">&nbsp;näher.</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`mx-auto flex-1 flex flex-col w-full relative z-10 px-4 ${isLandingPage ? 'max-w-5xl overflow-hidden' : `max-w-md ${isAuthPage ? '' : 'overflow-hidden'}`}`}>
        {isLandingPage ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className={`w-full flex-1 flex flex-col pt-0 pb-4 ${isAuthPage ? '' : 'overflow-hidden'}`}>
            <Outlet />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="pb-2 pt-2 w-full text-center z-10 shrink-0">
        <p className="text-[10px] font-bold text-[var(--muted)] opacity-50">
          Bisou-App &bull; Benedikt S. &copy; 2026
        </p>
      </footer>
    </div>
  );

  if (isAuthPage) {
    return (
      <ScalingContainer targetWidth={400} targetHeight={844} onlyScaleWidth={true} align="center">
        {content}
      </ScalingContainer>
    );
  }

  return content;
}
