import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Zap, MessageCircle, Heart, Lock } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: <Heart className="w-5 h-5 text-red-500" />, text: "Sagt Tschüss zu Doom-Scrollen: Diese App stärkt eure Beziehung" },
    { icon: <MessageCircle className="w-5 h-5 text-blue-500" />, text: "Jeden Tag neue, spannende Fragen" },
    { icon: <MessageCircle className="w-5 h-5 text-purple-500" />, text: "Antworten erst sichtbar, wenn beide geantwortet haben" },
    { icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, text: "Deine Daten werden auf NATO-Niveau verschlüsselt und nach strengen BSI-Richtlinien übertragen (unabhängig validiert mit dem Höchstprädikat A+).¹" },
  ];

  const tickerItems = [
    "Für immer kostenlos²",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies.",
    "Für immer kostenlos²",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies."
  ];

  return (
    <section className="flex-1 flex flex-col relative h-full overflow-hidden">
      {/* Brand Gradient Background - Full Screen */}
      {createPortal(
        <div className="fixed inset-0 -z-50 bg-gradient-to-br from-[#FF8A8A]/10 via-[#F8F7FF] to-[#A29BFE]/10 pointer-events-none" />,
        document.body
      )}
      
      <div className="flex-1 flex flex-col gap-10 py-6 sm:py-12 relative max-w-5xl mx-auto px-4 w-full justify-center">
        {/* Intro Sentence */}
        <div className="space-y-6 text-center">
          <p className="text-[#4A4468] text-base sm:text-lg font-bold leading-relaxed max-w-2xl mx-auto opacity-90 animate-entrance">
            Verbinde dich mit einem Bisou-Partner, um täglich mehr übereinander zu erfahren.
          </p>
        </div>

        {/* Feature List */}
        <div className="max-w-xl mx-auto w-full grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3 p-5 rounded-[2rem] bg-white/60 border border-white shadow-sm backdrop-blur-sm transition-all hover:bg-white h-full">
              <div className="shrink-0 mt-0.5">{f.icon}</div>
              <p className="text-[10px] sm:text-[11px] font-bold text-[#1F1939] leading-snug">{f.text}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
          <button 
            onClick={() => navigate('/signup')} 
            className="btn-primary py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] w-full shadow-xl hover:scale-[1.02] transition-transform"
          >
            Kostenlos starten ✨
          </button>
          <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest opacity-60">
            Bereit in unter 30 Sekunden.
          </p>
        </div>

        {/* Infinite Ticker */}
        <div className="w-full overflow-hidden py-4 border-y border-purple-100/50 relative">
          <div className="flex animate-ticker whitespace-nowrap gap-12 items-center">
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[var(--secondary)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4A4468]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real Footer at the very bottom */}
      <footer className="w-full py-6 px-4 mt-auto">
        <div className="max-w-5xl mx-auto space-y-2 opacity-60">
          <p className="text-[8px] font-medium leading-relaxed text-[var(--muted)] text-center italic">
            ¹ Datenverbindung zum Server standardmäßig geschützt mittels TLS 1.2/1.3 inkl. Perfect Forward Secrecy & AES-256-Bit-Verschlüsselung.
          </p>
          <p className="text-[8px] font-medium leading-relaxed text-[var(--muted)] text-center italic">
            ² Außer das ändert sich.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
          width: fit-content;
        }
      `}</style>
    </section>
  );
}
