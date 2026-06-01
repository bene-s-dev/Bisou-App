import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, MessageCircle, Heart, Lock, Users } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { 
      icon: <Heart className="w-3.5 h-3.5 text-red-500" />, 
      text: (
        <>
          Sagt Tschüss zu Doom-Scrollen:<br />
          Diese App stärkt eure Bindung.
        </>
      )
    },
    { 
      icon: <Users className="w-3.5 h-3.5 text-purple-500" />, 
      text: (
        <>
          Verbinde dich mit einem Bisou-Partner,<br />
          um mehr übereinander zu erfahren.
        </>
      )
    },
    { 
      icon: <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />, 
      text: (
        <>
          Täglich neue inspirierende Fragen:<br />
          Für lustige Fragen und spannende Momente.
        </>
      )
    },
    { 
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />, 
      text: (
        <>
          Deine Daten werden verschlüsselt<br />
          und nach strengen BSI-Richtlinien übertragen.
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
        <div className="-mx-4 w-[calc(100%+2rem)] overflow-hidden py-2.5 sm:py-3.5 bg-white/40 dark:bg-white/10 border-y border-purple-200/50 dark:border-purple-900/30 relative shrink-0 my-1 sm:my-2">
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
        <div className="w-full max-w-sm mx-auto flex flex-col gap-1.5 sm:gap-2 px-8 sm:px-10 shrink-0 mt-2 sm:mt-3">
          <div className="relative p-4 sm:p-5 rounded-[2rem_1rem_2rem_1rem] bg-white/60 border border-purple-200/80 dark:border-purple-900/40 shadow-md backdrop-blur-sm mb-3 mt-1 text-center">
            {/* Floating question mark sticking out of the top right border */}
            <div className="absolute -top-3 -right-2.5 w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-400 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#17122A] z-20 animate-bounce-3s">
              <span className="text-[15px] font-black select-none mt-[-1px]">?</span>
            </div>

            {/* Background chat bubbles centered as very light outlines */}
            <MessageCircle className="absolute top-1/2 left-[44%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-purple-300/20 dark:text-purple-800/10 -rotate-12 pointer-events-none z-0" fill="none" stroke="currentColor" strokeWidth={1.2} />
            <MessageCircle className="absolute top-1/2 left-[56%] -translate-x-1/2 -translate-y-1/2 w-24 h-24 text-pink-300/20 dark:text-pink-800/10 rotate-12 pointer-events-none z-0" fill="none" stroke="currentColor" strokeWidth={1.2} />
            
            <p className="relative z-10 text-[12.5px] sm:text-[14px] font-bold text-[#4A4468] tracking-normal leading-relaxed text-balance">
              Bisou (frz. Küsschen) ist eine App,<br />
              in der du jeden Tag neue Fragen bekommst, über die du mit einem geliebten Menschen {"sprechen\u00a0kannst."}
            </p>
          </div>
          {features.map((f, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-xl sm:rounded-[1rem] bg-white/60 border border-white shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:translate-x-1 duration-200"
            >
              <div className="shrink-0 ml-3.5 sm:ml-4.5 p-1 sm:p-1.5 rounded-md bg-purple-50 flex items-center justify-center">
                {f.icon}
              </div>
              <p className="text-[9px] sm:text-[10px] font-bold text-[#1F1939] leading-tight text-center flex-1">
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
        @keyframes bounce3s {
          0%, 15%, 100% { transform: translateY(0); }
          5% { transform: translateY(-6px); }
          10% { transform: translateY(1.5px); }
        }
        .animate-bounce-3s {
          animation: bounce3s 3s ease-in-out infinite;
          transform-origin: center bottom;
        }
      `}
      </style>
    </section>
  );
}