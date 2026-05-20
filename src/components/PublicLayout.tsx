import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';

export default function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);
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

  return (
    <div className="h-[100svh] w-screen overflow-hidden bg-[#F8F7FF] text-[#1F1939] font-['Plus_Jakarta_Sans',_sans-serif] flex flex-col relative">
      <div className="bg-aura" />

      {/* Header */}
      <header className="max-w-md mx-auto pt-12 pb-4 text-center select-none w-full relative shrink-0 z-20">
        {!isAuthPage && (
          <div className="absolute top-6 right-4">
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
      <main className="max-w-md mx-auto flex-1 flex flex-col justify-center w-full px-4 overflow-hidden relative z-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="pb-8 pt-4 w-full text-center z-10 shrink-0">
        <p className="text-[10px] font-bold text-[var(--muted)] opacity-50">
          <a 
            href="https://github.com/bene-s-dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-[var(--secondary)] transition-colors"
          >
            Benedikt S.
          </a> &copy; 2026
        </p>
        <div className="flex justify-center gap-6 mt-2">
          <button 
            onClick={() => setShowPrivacyModal(true)}
            className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest opacity-50 underline hover:opacity-100 transition-opacity"
          >
            Datenschutz
          </button>
          <button 
            onClick={() => setShowImpressumModal(true)}
            className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest opacity-50 underline hover:opacity-100 transition-opacity"
          >
            Impressum
          </button>
        </div>
      </footer>

      {/* Modals */}
      {showPrivacyModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowPrivacyModal(false)} />
          <div className="modal-content p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-8 h-8 text-[var(--secondary)]" />
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 tracking-tight">Datenschutz</h3>
            <p className="text-sm text-[#4A4468] font-semibold leading-relaxed mb-8 italic">
              Die Verarbeitung von Daten durch diese Anwendung erfolgt ausschließlich für persönliche oder familiäre Zwecke. Sie fällt daher gemäß Art. 2 Abs. 2 lit. c DSGVO unter das sogenannte Haushaltsprivileg, weshalb die Bestimmungen der DSGVO keine Anwendung finden.<br /><br />
              <span className="opacity-80">Dein Bene</span>
            </p>
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>,
        document.body
      )}

      {showImpressumModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowImpressumModal(false)} />
          <div className="modal-content p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-3xl font-black text-[var(--secondary)]">§</span>
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 tracking-tight">Impressum</h3>
            <p className="text-sm text-[#4A4468] font-bold leading-relaxed mb-8">
              Made with ❤️ in Freiburg
            </p>
            <button 
              onClick={() => setShowImpressumModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
