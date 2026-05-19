import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Heart, Flame, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Tägliche Fragen",
      desc: "Spannende Impulse für tiefere Gespräche.",
      color: "bg-blue-50 text-blue-600 border-blue-100"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Vergleichen",
      desc: "Seht erst was der andere denkt, wenn beide geantwortet haben.",
      color: "bg-rose-50 text-rose-600 border-rose-100"
    },
    {
      icon: <Flame className="w-5 h-5" />,
      title: "Eure Serie",
      desc: "Sammelt Flammen für jeden gemeinsamen Tag.",
      color: "bg-orange-50 text-orange-600 border-orange-100"
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Privat",
      desc: "Keine Algorithmen, nur ihr zwei.",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100"
    }
  ];

  return (
    <section className="text-center px-2 flex flex-col gap-8 py-4">
      <div>
        <h2 className="text-2xl font-black mb-3 tracking-tight text-[#1F1939]">
          Eure Beziehung, neu entdeckt. ✨
        </h2>
        <p className="text-[#4A4468] text-sm font-semibold leading-relaxed px-4 opacity-80">
          Tägliche Fragen, die euch näher zusammenbringen und für ehrliche Gespräche sorgen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <div key={i} className={`p-4 rounded-[2rem] border-2 flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02] ${f.color} bg-white/40 backdrop-blur-sm`}>
            <div className="mb-1">{f.icon}</div>
            <h3 className="text-[10px] font-black uppercase tracking-wider">{f.title}</h3>
            <p className="text-[9px] font-bold leading-tight opacity-70">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button 
          onClick={() => navigate('/signup')} 
          className="w-full btn-action py-4 text-sm font-black shadow-lg shadow-purple-200"
        >
          Kostenlos starten ✨
        </button>
        <p className="mt-4 text-[10px] font-bold text-[var(--muted)] opacity-60">
          In weniger als 1 Minute bereit.
        </p>
      </div>
    </section>
  );
}
