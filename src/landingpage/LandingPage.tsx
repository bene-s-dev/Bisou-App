import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, Flame, ShieldCheck, LogIn } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Tägliche Fragen",
      desc: "Spannende Impulse für tiefere Gespräche.",
      color: "bg-purple-50 text-[var(--secondary)] border-purple-100"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Vergleichen",
      desc: "Seht erst was der andere denkt, wenn beide geantwortet haben.",
      color: "bg-purple-50 text-[var(--secondary)] border-purple-100"
    },
    {
      icon: <Flame className="w-5 h-5" />,
      title: "Eure Serie",
      desc: "Sammelt Flammen für jeden gemeinsamen Tag.",
      color: "bg-purple-50 text-[var(--secondary)] border-purple-100"
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Privat",
      desc: "Keine Algorithmen, nur ihr zwei.",
      color: "bg-purple-50 text-[var(--secondary)] border-purple-100"
    }
  ];

  return (
    <section className="text-center flex flex-col gap-10 py-6 sm:py-12 relative max-w-5xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl font-black text-[#1F1939] tracking-tight leading-tight px-4" style={{ fontFamily: 'Fraunces, serif' }}>
          Jeden Tag ein kleiner <br className="hidden sm:block" /> magischer Moment.
        </h1>
        <p className="text-[#4A4468] text-base sm:text-lg font-semibold leading-relaxed px-4 opacity-80 max-w-2xl mx-auto">
          Täglich drei neue Fragen, die euch näher zusammenbringen. Entdeckt eure Antworten gemeinsam.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-2">
        {features.map((f, i) => (
          <div key={i} className={`p-6 sm:p-8 rounded-[2.5rem] border-2 flex flex-col items-center text-center gap-4 transition-all hover:scale-[1.02] ${f.color} shadow-sm group`}>
            <div className="p-3.5 rounded-2xl bg-white/60 shadow-sm group-hover:bg-white transition-colors">{f.icon}</div>
            <div className="space-y-2">
              <h3 className="text-[11px] sm:text-[12px] font-black uppercase tracking-[0.2em]">{f.title}</h3>
              <p className="text-[10px] sm:text-[11px] font-bold leading-relaxed opacity-80">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 flex flex-col items-center gap-4">
        <button 
          onClick={() => navigate('/signup')} 
          className="w-full sm:w-auto sm:px-12 btn-primary py-6 text-base font-black shadow-xl shadow-purple-200 hover:scale-105"
        >
          Kostenlos starten ✨
        </button>
        <p className="text-[11px] font-bold text-[var(--muted)] opacity-60">
          In unter 60 Sekunden bereit • Keine App-Installation nötig
        </p>
      </div>
    </section>
  );
}
