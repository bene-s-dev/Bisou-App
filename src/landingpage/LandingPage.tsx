import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, MessageCircle, Heart, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LandingPage() {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchUserCount() {
      const { data, error } = await supabase.rpc('get_user_count');
      if (!error && typeof data === 'number') {
        // Optional: add an artificial offset if desired, or just show real count
        setUserCount(data);
      }
    }
    fetchUserCount();
  }, []);

  const features = [
    { 
      icon: <Heart className="w-4 sm:w-[18px] h-4 sm:h-[18px] text-red-500" />, 
      text: (
        <>
          Sagt Tschüss zu Doom-Scrollen:<br />
          Diese App stärkt eure Bindung.
        </>
      )
    },
    { 
      icon: <Users className="w-4 sm:w-[18px] h-4 sm:h-[18px] text-purple-500" />, 
      text: (
        <>
          Verbinde dich mit einem Bisou-Partner,<br />
          um mehr übereinander zu erfahren.
        </>
      )
    },
    { 
      icon: <MessageCircle className="w-4 sm:w-[18px] h-4 sm:h-[18px] text-emerald-500" />, 
      text: (
        <>
          Täglich neue inspirierende Fragen:<br />
          Für gute Antworten und lustige Momente.
        </>
      )
    },
    { 
      icon: <ShieldCheck className="w-4 sm:w-[18px] h-4 sm:h-[18px] text-blue-500" />, 
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
        <div className="w-full max-w-sm mx-auto flex flex-col gap-2 sm:gap-2.5 px-8 sm:px-10 shrink-0 mt-0">
          <div className="relative p-3 sm:p-3.5 rounded-[1.5rem_0.75rem_1.5rem_0.75rem] bg-white/60 border border-purple-200/80 dark:border-purple-900/40 shadow-md backdrop-blur-sm mb-2 mt-0 text-center">
            {/* Pill sticking out of the top right border */}
            <div className="absolute top-0 -translate-y-1/2 right-2 sm:right-4 px-2 py-[1px] rounded-full bg-gradient-to-tr from-pink-100/90 to-purple-100/90 text-[var(--secondary)] shadow-sm border border-white dark:border-[#17122A] z-20 flex items-center justify-center">
              <span className="text-[9.5px] sm:text-[10.5px] font-black tracking-normal leading-none">
                Was ist Bisou?
              </span>
            </div>

            <p className="relative z-10 text-[11.5px] sm:text-[13px] font-bold text-[#4A4468] tracking-normal leading-snug text-balance">
              Bisou (frz. Küsschen) ist eine App,<br />
              in der du jeden Tag neue Fragen bekommst, über die du mit einem geliebten Menschen {"sprechen\u00a0kannst."}
            </p>
          </div>
          {features.map((f, i) => (
            <div 
              key={i} 
              className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-2.5 rounded-xl sm:rounded-[1.25rem] bg-white/60 border border-white shadow-sm backdrop-blur-sm"
            >
              <div className="shrink-0 ml-2.5 sm:ml-3.5 p-1.5 sm:p-2 rounded-lg bg-purple-50 flex items-center justify-center">
                {f.icon}
              </div>
              <p className="text-[10px] sm:text-[11.5px] font-bold text-[#1F1939] leading-snug text-center flex-1">
                {f.text}
              </p>
            </div>
          ))}
          <div className="flex justify-center mt-0 sm:mt-1 min-h-[22px]">
            {userCount !== null ? (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-[#17122A]/80 border border-purple-200/80 dark:border-purple-900/50 shadow-sm backdrop-blur-sm transition-all">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <span className="text-[9.5px] font-bold text-[#4A4468] dark:text-purple-200">
                  Bereits {userCount} glückliche Nutzer
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/40 dark:bg-[#17122A]/40 border border-purple-200/40 dark:border-purple-900/20 shadow-sm backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                <span className="text-[9.5px] font-bold text-[#4A4468]/50 dark:text-purple-200/50 animate-pulse">
                  Bereits ... glückliche Nutzer
                </span>
              </div>
            )}
          </div>
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
              Profil in unter 30 Sekunden erstellen.
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