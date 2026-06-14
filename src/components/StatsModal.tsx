import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X, Sparkles, Clock, HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { capitalizeName } from '../lib/stringUtils';

const getTimeIcon = (hour: number) => {
  if (hour >= 5 && hour < 12) return '🌅';
  if (hour >= 12 && hour < 18) return '☀️';
  if (hour >= 18 && hour < 22) return '🌆';
  return '🌙';
};

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  userName: string;
  stats: any;
  loading: boolean;
}

export default function StatsModal({
  isOpen,
  onClose,
  partnerName,
  userName,
  stats,
  loading
}: StatsModalProps) {
  const [heartprintType, setHeartprintType] = useState<'tot' | 'ranking' | 'text' | 'all' | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreTrend, setScoreTrend] = useState<{ delta: number; direction: 'up' | 'down' | 'same' } | null>(null);

  // Animate Bisou Score from 0 to target when modal opens or stats change
  React.useEffect(() => {
    if (isOpen && stats?.bisouScore) {
      const target = stats.bisouScore; 
      const duration = 5300; 
      const delay = 500; 
      let startTime: number | null = null;

      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        
        if (elapsed < delay) {
          setDisplayScore(0);
          requestAnimationFrame(animate);
          return;
        }

        const progress = Math.min((elapsed - delay) / duration, 1);
        
        // Harmonisierte Kurve für ca 5.3 Sekunden:
        // Kontinuierlicher Ease-Out (Potenz 2.5). 
        // Startet flüssig, bremst stetig ab, ohne abrupt "stehen" zu bleiben.
        const easeOut = 1 - Math.pow(1 - progress, 2.5);
        
        const currentScore = target * easeOut;
        setDisplayScore(currentScore);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      const raf = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(raf);
    } else if (!isOpen) {
      setDisplayScore(0);
    }
  }, [isOpen, stats?.bisouScore]);

  // Calculate trend from previous score
  React.useEffect(() => {
    if (isOpen && stats?.bisouScore != null) {
      try {
        let prevRaw = localStorage.getItem('bisou_prev_score');
        if (!prevRaw) {
          // If no previous score exists (e.g. first load live), simulate a previous score to show a starting trend
          const simulatedPrev = stats.bisouScore - 0.6;
          prevRaw = String(simulatedPrev);
        }
        const prev = parseFloat(prevRaw);
        const delta = parseFloat((stats.bisouScore - prev).toFixed(1));
        if (delta > 0) setScoreTrend({ delta, direction: 'up' });
        else if (delta < 0) setScoreTrend({ delta: Math.abs(delta), direction: 'down' });
        else setScoreTrend({ delta: 0, direction: 'same' });
        
        localStorage.setItem('bisou_prev_score', String(stats.bisouScore));
      } catch {
        setScoreTrend(null);
      }
    } else if (!isOpen) {
      setScoreTrend(null);
    }
  }, [isOpen, stats?.bisouScore]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4 will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Eure Bisou-Statistik</h3>
              <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">der letzten 30 Tage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="space-y-3 animate-in fade-in duration-500">
            {/* Top Stats Cards Skeleton */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50/40 rounded-3xl p-4 border border-purple-100/50 flex flex-col justify-between h-[76px] animate-pulse">
                <div className="w-20 h-2 bg-purple-200/50 rounded-full" />
                <div className="w-10 h-6 bg-purple-200/50 rounded-full" />
              </div>
              <div className="bg-rose-50/40 rounded-3xl p-4 border border-rose-100/50 flex flex-col justify-between h-[76px] animate-pulse">
                <div className="w-16 h-2 bg-rose-200/50 rounded-full" />
                <div className="w-12 h-6 bg-rose-200/50 rounded-full" />
              </div>
            </div>

            {/* Match Rates Skeleton */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-3.5 h-3.5 bg-purple-200/50 rounded-full" />
                <div className="w-20 h-2 bg-purple-200/50 rounded-full" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-[56px] rounded-xl bg-purple-50/40 border border-purple-50/50 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-1.5 bg-purple-200/50 rounded-full" />
                  <div className="w-8 h-4 bg-purple-200/50 rounded-full" />
                </div>
                <div className="h-[56px] rounded-xl bg-purple-50/40 border border-purple-50/50 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-1.5 bg-purple-200/50 rounded-full" />
                  <div className="w-8 h-4 bg-purple-200/50 rounded-full" />
                </div>
                <div className="h-[56px] rounded-xl bg-purple-50/40 border border-purple-50/50 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-1.5 bg-purple-200/50 rounded-full" />
                  <div className="w-8 h-4 bg-purple-200/50 rounded-full" />
                </div>
              </div>
            </div>

            {/* Answer Habits Skeleton */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-3.5 h-3.5 bg-purple-200/50 rounded-full" />
                <div className="w-24 h-2 bg-purple-200/50 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-[74px] rounded-xl bg-purple-50/40 border border-purple-50/50 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-6 h-6 bg-purple-200/50 rounded-full" />
                  <div className="w-10 h-3.5 bg-purple-200/50 rounded-full" />
                  <div className="w-12 h-2 bg-purple-200/50 rounded-full" />
                </div>
                <div className="h-[74px] rounded-xl bg-orange-50/40 border border-orange-50/50 flex flex-col items-center justify-center gap-1.5">
                  <div className="w-6 h-6 bg-orange-200/30 rounded-full" />
                  <div className="w-10 h-3.5 bg-orange-200/30 rounded-full" />
                  <div className="w-12 h-2 bg-orange-200/30 rounded-full" />
                </div>
              </div>
            </div>

            {/* Algorithm Footer Skeleton */}
            <div className="flex justify-center mt-3 animate-pulse">
              <div className="w-48 h-2 bg-purple-200/30 rounded-full" />
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-3">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-purple-50/40 rounded-3xl p-4 border border-purple-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-1.5">Gemeinsam Aktiv</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--secondary)]">{stats.totalAnswers}</span>
                  <span className="text-[9px] font-bold text-[#4A4468]">Tage</span>
                </div>
              </div>
              <div className="bg-rose-50/40 rounded-3xl p-4 border border-rose-100 flex flex-col justify-between cursor-pointer active:scale-95 transition-transform" onClick={() => setHeartprintType('all')}>
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Bisou Score</p>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline">
                    <span className="text-2xl font-black text-[var(--primary)] tabular-nums min-w-[45px]">
                      {displayScore.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-bold text-rose-400 ml-1">/ 10</span>
                  </div>
                  {scoreTrend && (
                    <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                      scoreTrend.direction === 'up' 
                        ? 'bg-emerald-50 text-emerald-500' 
                        : scoreTrend.direction === 'down' 
                        ? 'bg-red-50 text-red-400' 
                        : 'bg-gray-50 text-gray-400'
                    }`}>
                      {scoreTrend.direction === 'up' && <TrendingUp className="w-2.5 h-2.5" strokeWidth={3} />}
                      {scoreTrend.direction === 'down' && <TrendingDown className="w-2.5 h-2.5" strokeWidth={3} />}
                      {scoreTrend.direction === 'same' && <Minus className="w-2.5 h-2.5" strokeWidth={3} />}
                      <span>{scoreTrend.direction === 'same' ? '±0' : scoreTrend.delta.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Match rates per question type */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[var(--secondary)]" />
                <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Übereinstimmung</h4>
              </div>
              
              <div className="grid grid-cols-4 gap-1.5 text-center">
                {/* TOT Match */}
                <div 
                  onClick={() => setHeartprintType('tot')}
                  className="flex flex-col items-center justify-center p-1.5 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[52px] cursor-pointer active:scale-95 transition-transform"
                >
                  <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Dies/Das</span>
                  <span className="text-sm font-black text-[var(--secondary)]">{stats.totMatch}%</span>
                </div>

                {/* Ranking Match */}
                <div 
                  onClick={() => setHeartprintType('ranking')}
                  className="flex flex-col items-center justify-center p-1.5 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[52px] cursor-pointer active:scale-95 transition-transform"
                >
                  <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Ranking</span>
                  <span className="text-sm font-black text-[var(--secondary)]">{stats.rankingMatch}%</span>
                </div>

                {/* Text Match */}
                <div 
                  onClick={() => setHeartprintType('text')}
                  className="flex flex-col items-center justify-center p-1.5 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[52px] cursor-pointer active:scale-95 transition-transform"
                >
                  <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5">Freitext</span>
                  <span className="text-sm font-black text-[var(--secondary)]">{stats.textMatch}%</span>
                </div>

                {/* Coming Soon */}
                <div className="flex flex-col items-center justify-center p-1.5 bg-gray-50/40 rounded-xl border border-dashed border-gray-200 min-h-[52px] gap-0.5">
                  <span className="text-[7px] font-bold text-[var(--muted)] uppercase tracking-wider mb-0.5 leading-tight text-center">Wer würde<br/>eher</span>
                  <span className="text-[6px] font-bold text-[var(--muted)] opacity-40 uppercase tracking-wider leading-tight text-center">Bald verfügbar</span>
                </div>
              </div>
            </div>

            {/* Answer Habits */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[var(--secondary)]" />
                <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Antwort-Gewohnheiten</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 py-1.5 px-2.5 bg-purple-50/40 rounded-xl border border-purple-50">
                  <span className="text-base">{getTimeIcon(stats.myHabit)}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-[#1F1939] leading-tight">{stats.myHabit}:00</span>
                    <span className="text-[7px] font-black text-[var(--secondary)] uppercase tracking-[0.1em]">{capitalizeName(userName.split(' ')[0])}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 py-1.5 px-2.5 bg-orange-50/40 rounded-xl border border-orange-50">
                  <span className="text-base">{getTimeIcon(stats.partnerHabit)}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-[#1F1939] leading-tight">{stats.partnerHabit}:00</span>
                    <span className="text-[7px] font-black text-orange-500 uppercase tracking-[0.1em]">{capitalizeName(partnerName.split(' ')[0])}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              <p className="text-[8px] text-[var(--muted)] opacity-50 uppercase tracking-[0.12em] font-bold">
                Berechnet mit dem HeartPrint™-Algorithmus
              </p>
              <button 
                onClick={() => setHeartprintType('all')}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity focus:outline-none shrink-0 -mt-[1px] heartprint-info-pulse"
              >
                <HelpCircle className="w-full h-full" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs font-bold text-[#4A4468]">Keine Daten für Statistiken verfügbar.</p>
          </div>
        )}
      </div>

      {heartprintType && (
        <div className="modal-backdrop !backdrop-blur-none px-4 !z-[3000] will-change-[opacity] transition-all animate-fade-in">
          <div className="absolute inset-0" onClick={() => setHeartprintType(null)} />
          <div className="modal-content p-6 max-h-[85vh] flex flex-col w-full max-w-sm relative z-10 animate-entrance shadow-2xl border border-purple-100/50">
            <div className="flex items-center justify-between mb-4 border-b border-purple-50 pb-3 shrink-0">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[var(--secondary)]" />
                </div>
                <div className="flex flex-col pt-0.5">
                  <h4 className="text-[13px] font-black text-[#1F1939] leading-tight">HeartPrint™-Algorithmus</h4>
                  <p className="font-bold text-[9px] text-[var(--muted)] opacity-70 leading-none mt-0.5">by Bisou</p>
                </div>
              </div>
              <button 
                onClick={() => setHeartprintType(null)} 
                className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-soft px-1.5 pb-2 space-y-4 text-[#4A4468] text-[11px] leading-relaxed">
              <p className="px-0.5">
                Der <strong>Bisou-Score</strong> zeigt euren Antwort-Übereinstimmungswert der letzten 30 Tage. Er wird mit dem <strong>HeartPrint</strong>-Algorithmus errechnet und setzt sich aus drei Werten zusammen:
              </p>

              <div className="space-y-3 px-0.5">
                {/* Dies/Das */}
                <div className={`rounded-2xl p-3 border transition-all duration-500 origin-center ${heartprintType === 'tot' ? 'bg-purple-100 border-purple-300 shadow-sm scale-[1.02]' : 'bg-purple-50/40 border-purple-100/50'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-[var(--secondary)] uppercase text-[8px] tracking-wider">1. Dies / Das</span>
                    <span className="font-bold text-[9px] bg-purple-100 text-[var(--secondary)] px-1.5 py-0.5 rounded-full">70% Gewichtung</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-normal mb-1">
                    Binärer Abgleich eurer Entweder-oder-Antworten
                  </p>
                  <p className="text-[9px] opacity-70 leading-normal">
                    Wählen beide dieselbe Option, zählt dies als 100% Match, sonst 0%.
                  </p>
                </div>

                {/* Ranking */}
                <div className={`rounded-2xl p-3 border transition-all duration-500 origin-center ${heartprintType === 'ranking' ? 'bg-purple-100 border-purple-300 shadow-sm scale-[1.02]' : 'bg-purple-50/40 border-purple-100/50'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-[var(--secondary)] uppercase text-[8px] tracking-wider">2. Ranglisten</span>
                    <span className="font-bold text-[9px] bg-purple-100 text-[var(--secondary)] px-1.5 py-0.5 rounded-full">20% Gewichtung</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-normal mb-1">
                    Positions-Abstands-Analyse
                  </p>
                  <p className="text-[9px] opacity-70 leading-normal">
                    Kleine Abweichungen (z. B. Platz 2 statt Platz 3) ziehen den Score kaum nach unten. Eine Quadratwurzel-Kurve federt leichte Meinungsunterschiede sanft ab. Erst bei komplett entgegengesetzter Sortierung nähert sich der Wert 0%.
                  </p>
                </div>

                {/* Freitext */}
                <div className={`rounded-2xl p-3 border transition-all duration-500 origin-center ${heartprintType === 'text' ? 'bg-purple-100 border-purple-300 shadow-sm scale-[1.02]' : 'bg-purple-50/40 border-purple-100/50'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-[var(--secondary)] uppercase text-[8px] tracking-wider">3. Freitexte</span>
                    <span className="font-bold text-[9px] bg-purple-100 text-[var(--secondary)] px-1.5 py-0.5 rounded-full">10% Gewichtung</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-normal mb-1">
                    Semantischer Sinn-Vergleich
                  </p>
                  <p className="text-[9px] opacity-70 leading-normal">
                    Verglichen wird der Sinn, nicht die Schreibweise. Antwortet einer "Glück" und der andere "Zufriedenheit", erkennt HeartPrint die Ähnlichkeit und vergibt hohe Prozentwerte (z. B. ~78% statt 0%).
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
