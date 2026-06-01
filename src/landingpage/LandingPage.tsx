import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, MessageCircle, Heart, Lock, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { 
      icon: <Heart className="w-5 h-5 text-red-500" />, 
      text: (
        <>
          Sagt Tschüss zu Doom-Scrollen:<br />
          Diese App stärkt eure Bindung
        </>
      )
    },
    { 
      icon: <Users className="w-5 h-5 text-purple-500" />, 
      text: (
        <>
          Verbinde dich mit einem Bisou-Partner,<br />
          um täglich mehr übereinander zu erfahren
        </>
      )
    },
    { 
      icon: <MessageCircle className="w-5 h-5 text-blue-500" />, 
      text: (
        <>
          Eure Antworten sind erst sichtbar,<br />
          wenn ihr beide geantwortet habt
        </>
      )
    },
    { 
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />, 
      text: (
        <>
          Deine Daten werden verschlüsselt und<br />
          nach strengen BSI-Richtlinien übertragen.
        </>
      )
    },
  ];

  const tickerItems = [
    "Als App installierbar",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies.",
    "Als App installierbar",
    "Personen aus deinem privaten Umfeld verwenden Bisou",
    "Privacy by Design: Keine Tracker, keine Cookies."
  ];

  return (
    <section className="flex-1 flex flex-col relative h-full w-full min-h-0">
      
      <div className="flex-1 flex flex-col gap-3 sm:gap-6 pt-3 sm:pt-6 pb-2 sm:pb-4 relative w-full justify-between sm:justify-evenly min-h-0">
        {/* Infinite Ticker */}
        <div className="-mx-4 w-[calc(100%+2rem)] overflow-hidden py-2.5 sm:py-3.5 border-y border-purple-100/50 relative shrink-0 my-1 sm:my-2">
          <div className="flex animate-ticker whitespace-nowrap gap-8 items-center">
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[var(--secondary)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4A4468]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature List (Vertical List) */}
        <div className="w-full flex flex-col gap-2 sm:gap-3 px-2 sm:px-6 shrink-0">
          <p className="text-[10px] font-black text-[var(--muted)] tracking-[0.05em] mb-2.5 px-2 text-center">
            Bisou ist jetzt mit diesen Funktionen verfügbar:
          </p>
          {features.map((f, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-[1.25rem] sm:rounded-[1.75rem] bg-white/60 border border-white shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:translate-x-1 duration-200"
            >
              <div className="shrink-0 p-2 sm:p-2.5 rounded-xl bg-purple-50 flex items-center justify-center">
                {f.icon}
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-[#1F1939] leading-relaxed text-left flex-1">
                {f.text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 px-2 sm:px-6 relative">
          {/* Glowing blur spot */}
          <div 
            className="absolute w-[110%] h-[60%] rounded-full opacity-40"
            style={{
              background: 'radial-gradient(ellipse, rgba(255, 107, 107, 0.5) 0%, rgba(129, 121, 224, 0.5) 50%, transparent 80%)',
              filter: 'blur(35px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          
          <div className="w-full flex flex-col items-center justify-center gap-2 sm:gap-3 relative z-10">
            <button 
              onClick={() => navigate('/signup')} 
              className="btn-primary py-4 sm:py-5 px-6 sm:px-8 text-[13px] sm:text-[15px] font-black uppercase tracking-[0.15em] w-full shadow-[0_0_24px_rgba(255,107,107,0.45),_0_0_12px_rgba(129,121,224,0.4)] hover:scale-[1.02] transition-transform"
            >
              Kostenlos starten ✨
            </button>
            <p className="text-[9px] font-black text-[var(--muted)] tracking-wide opacity-85">
              Bereit in unter 30 Sekunden.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 12s linear infinite;
          width: fit-content;
        }
      `}
      </style>
    </section>
  );
}