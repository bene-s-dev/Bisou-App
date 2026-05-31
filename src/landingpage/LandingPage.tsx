import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, MessageCircle, Heart, Lock } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <Heart className="w-5 h-5 text-red-500" />, text: "Sagt Tschüss zu Doom-Scrollen: Diese App stärkt eure Beziehung" },
    { icon: <MessageCircle className="w-5 h-5 text-blue-500" />, text: "Jeden Tag neue, spannende Fragen" },
    { icon: <MessageCircle className="w-5 h-5 text-purple-500" />, text: "Antworten erst sichtbar, wenn beide geantwortet haben" },
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, text: "Deine Daten werden verschlüsselt und nach strengen BSI-Richtlinien übertragen." },
  ];

  const tickerItems = [
    "Für immer kostenlos",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies.",
    "Für immer kostenlos",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies."
  ];

  return (
    <section className="flex-1 flex flex-col relative h-full w-full">
      {/* Brand Gradient Background - Full Screen */}
      {createPortal(
        <div className="fixed inset-0 -z-50 bg-gradient-to-br from-[#FF8A8A]/10 via-[#F8F7FF] to-[#A29BFE]/10 pointer-events-none" />,
        document.body
      )}
      
      <div className="flex-1 flex flex-col gap-5 sm:gap-6 py-4 relative w-full justify-evenly">
        {/* Intro Section */}
        <div className="text-center">
          <p className="text-[#4A4468] text-[13px] sm:text-lg font-bold leading-relaxed max-w-2xl mx-auto opacity-90 animate-entrance">
            Verbinde dich mit einem Bisou-Partner,<br />
            um täglich mehr übereinander zu erfahren.
          </p>
        </div>

        {/* Infinite Ticker */}
        <div className="w-full overflow-hidden py-2 border-y border-purple-100/50 relative">
          <div className="flex animate-ticker whitespace-nowrap gap-8 items-center">
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[var(--secondary)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4A4468]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature List (Responsive Grid) */}
        <div className="w-full grid grid-cols-2 gap-2 sm:gap-4">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2 p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] bg-white/60 border border-white shadow-sm backdrop-blur-sm transition-all hover:bg-white h-full">
              <div className="shrink-0 scale-90 sm:scale-100">{f.icon}</div>
              <p className="text-[9px] sm:text-[11px] font-bold text-[#1F1939] leading-snug">{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button 
            onClick={() => navigate('/signup')} 
            className="btn-primary py-4 px-8 text-[11px] font-black uppercase tracking-[0.2em] w-full shadow-xl hover:scale-[1.02] transition-transform"
          >
            Kostenlos starten ✨
          </button>
          <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest opacity-60">
            Bereit in unter 30 Sekunden.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
          width: fit-content;
        }
      `}
      </style>
    </section>
  );
}