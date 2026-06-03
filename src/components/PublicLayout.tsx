import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthPage = ['/signin', '/signup', '/reset-password'].includes(location.pathname);
  const isLandingPage = location.pathname === '/';

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden scrollbar-soft text-[#1F1939] font-['Plus_Jakarta_Sans',_sans-serif] flex flex-col relative">
      <div className="bg-public-gradient" />

      {/* Header */}
      <header 
        className="mx-auto pb-0 text-center select-none w-full relative shrink-0 z-20 px-4 max-w-md pwa-public-header"
      >
        {!isAuthPage && (
          <div 
            className="absolute right-4 pwa-public-login-btn"
          >
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
          <div className="flex items-center justify-center text-center">
            <span>Jeden Tag ein&nbsp;<span className="text-[var(--primary)]">Moment</span>&nbsp;für euch.</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`mx-auto flex-1 flex flex-col w-full relative z-10 px-4 ${isLandingPage ? 'max-w-5xl' : `max-w-md ${isAuthPage ? '' : 'overflow-hidden'}`}`}>
        {isLandingPage ? (
          <div className="flex-1 flex flex-col min-h-0">
            <Outlet />
          </div>
        ) : (
          <div className={`w-full flex-1 flex flex-col pt-6 pb-4 ${isAuthPage ? '' : 'overflow-hidden'}`}>
            <Outlet />
          </div>
        )}
      </main>

      <footer className="pb-2 pt-2 w-full text-center relative z-10 shrink-0">
        <p className="text-[10px] font-bold text-[var(--muted)] opacity-50">
          Bisou-App &copy; 2026 &bull; Benedikt S.
        </p>
      </footer>
    </div>
  );
}
