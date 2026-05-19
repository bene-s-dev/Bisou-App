import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
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
      }, 500);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="h-[100svh] w-screen overflow-hidden bg-[#F8F7FF] text-[#1F1939] p-4 font-['Plus_Jakarta_Sans',_sans-serif] flex flex-col">
      <div className="bg-aura" />
      
      {/* Header - Matches Login */}
      <header className="max-w-md mx-auto pt-12 pb-4 text-center select-none w-full">
        <h1 className="text-6xl font-semibold text-[var(--text-main)] mb-2 tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
          Bisou
        </h1>
        
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
        </div>      </header>

      {/* Hero Section - Tightened */}
      <main className="max-w-md mx-auto flex-1 flex flex-col justify-center gap-6 overflow-hidden">
        <section className="text-center px-2">
          <h2 className="text-xl font-black mb-2 tracking-tight">Kennst du deinen Partner wirklich?</h2>
          <p className="text-[#4A4468] text-sm leading-relaxed mb-6 px-4">
            Verwandelt eure gemeinsame Zeit in spannende Gespräche. Entdeckt neue Facetten aneinander.
          </p>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/signup')} 
              className="w-full btn-action py-3 text-sm font-black"
            >
              Jetzt starten ✨
            </button>
            <button 
              onClick={() => navigate('/signin')} 
              className="w-full btn-secondary py-3 text-sm font-black"
            >
              Login
            </button>
          </div>
        </section>

        {/* Features - Compacted */}
        <section className="grid grid-cols-2 gap-3 px-2">
          <div className="status-box p-4 text-left">
            <MessageCircle className="w-6 h-6 text-[var(--secondary)] mb-2" />
            <h3 className="font-black text-xs mb-1">Tägliche Inspiration</h3>
            <p className="text-[10px] text-[var(--muted)]">Neue Fragen.</p>
          </div>
          <div className="status-box p-4 text-left">
            <Sparkles className="w-6 h-6 text-[var(--primary)] mb-2" />
            <h3 className="font-black text-xs mb-1">Verbindungs-Moment</h3>
            <p className="text-[10px] text-[var(--muted)]">Vergleicht alles.</p>
          </div>
        </section>
      </main>

      {/* Footer Area */}
      <footer className="pb-8 pt-4 w-full text-center z-10">
        <p className="text-[10px] font-bold text-[var(--muted)] opacity-50">
          Bisou-App v.01<br />
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

      {showPrivacyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-transparent" onClick={() => setShowPrivacyModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-entrance border border-purple-100 text-center shadow-2xl">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-8 h-8 text-[var(--secondary)]" />
            </div>
            <h3 className="text-xl font-bold text-[#1F1939] mb-4">Datenschutz</h3>
            <p className="text-sm text-[#4A4468] leading-relaxed mb-8">
              Die Verarbeitung von Daten durch diese Anwendung erfolgt ausschließlich für persönliche oder familiäre Zwecke. Sie fällt daher gemäß Art. 2 Abs. 2 lit. c DSGVO unter das sogenannte Haushaltsprivileg, weshalb die Bestimmungen der DSGVO keine Anwendung finden.<br /><br />
              <i className="opacity-80">Dein Bene</i>
            </p>
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {showImpressumModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-transparent" onClick={() => setShowImpressumModal(false)} />
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 animate-entrance border border-purple-100 text-center shadow-2xl">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-3xl font-bold text-[var(--secondary)]">§</span>
            </div>
            <h3 className="text-xl font-bold text-[#1F1939] mb-4">Impressum</h3>
            <p className="text-sm text-[#4A4468] leading-relaxed mb-8 font-bold">
              Made with ❤️ in Freiburg
            </p>
            <button 
              onClick={() => setShowImpressumModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
