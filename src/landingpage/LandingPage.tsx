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
    <section className="text-center flex flex-col gap-8 py-4 relative">
      <div className="mt-4">
        <p className="text-[#4A4468] text-sm font-semibold leading-relaxed px-4 opacity-80">
          Tägliche Fragen, die euch näher zusammenbringen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <div key={i} className={`p-5 rounded-[2.5rem] border-2 flex flex-col items-center text-center gap-3 transition-all hover:scale-[1.02] ${f.color} shadow-sm`}>
            <div className="p-2.5 rounded-2xl bg-white/60 shadow-sm">{f.icon}</div>
            <div className="space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest">{f.title}</h3>
              <p className="text-[9px] font-bold leading-relaxed opacity-80">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button 
          onClick={() => navigate('/signup')} 
          className="w-full btn-action-animated py-5 text-sm font-black shadow-lg shadow-purple-200"
        >
          Kostenlos starten ✨
        </button>
      </div>
      <div className="text-center">
        <p className="mt-4 text-[10px] font-bold text-[var(--muted)] opacity-60">
          In 60 Sekunden bereit.
        </p>
      </div>
    </section>
  );
}
