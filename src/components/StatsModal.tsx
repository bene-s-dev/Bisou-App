import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, X, Sparkles, Clock, Info } from 'lucide-react';
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
  const [showHeartprintModal, setShowHeartprintModal] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4 will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-6 will-change-transform contain-layout max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Eure Bisou-Statistik</h3>
              <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">Die letzten 30 Tage</p>
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
              <div className="bg-rose-50/40 rounded-3xl p-4 border border-rose-100 flex flex-col justify-between">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1.5">Bisou Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[var(--primary)]">{stats.bisouScore.toFixed(1)}</span>
                  <span className="text-[9px] font-bold text-rose-400">/ 10</span>
                </div>
              </div>
            </div>

            {/* Match rates per question type */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[var(--secondary)]" />
                <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Übereinstimmung</h4>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* TOT Match */}
                <div className="flex flex-col items-center justify-center p-2 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[56px]">
                  <span className="text-[8px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Dies/Das</span>
                  <span className="text-base font-black text-[var(--secondary)]">{stats.totMatch}%</span>
                </div>

                {/* Ranking Match */}
                <div className="flex flex-col items-center justify-center p-2 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[56px]">
                  <span className="text-[8px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Ranking</span>
                  <span className="text-base font-black text-[var(--secondary)]">{stats.rankingMatch}%</span>
                </div>

                {/* Text Match */}
                <div className="flex flex-col items-center justify-center p-2 bg-purple-50/40 rounded-xl border border-purple-50 min-h-[56px]">
                  <span className="text-[8px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">Freitext</span>
                  <span className="text-base font-black text-[var(--secondary)]">{stats.textMatch}%</span>
                </div>
              </div>
            </div>

            {/* Answer Habits */}
            <div className="bg-white border-2 border-purple-50 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="w-3.5 h-3.5 text-[var(--secondary)]" />
                <h4 className="text-[9px] font-black text-[#1F1939] uppercase tracking-widest">Antwort-Gewohnheiten</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col items-center justify-center py-2.5 px-2 bg-purple-50/40 rounded-xl border border-purple-50 text-center">
                  <span className="text-lg mb-0.5">{getTimeIcon(stats.myHabit)}</span>
                  <span className="text-sm font-black text-[#1F1939]">{stats.myHabit}:00</span>
                  <span className="text-[8px] font-black text-[var(--secondary)] uppercase tracking-[0.1em] mt-1">{capitalizeName(userName.split(' ')[0])}</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2.5 px-2 bg-orange-50/40 rounded-xl border border-orange-50 text-center">
                  <span className="text-lg mb-0.5">{getTimeIcon(stats.partnerHabit)}</span>
                  <span className="text-sm font-black text-[#1F1939]">{stats.partnerHabit}:00</span>
                  <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.1em] mt-1">{capitalizeName(partnerName.split(' ')[0])}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              <p className="text-[8px] text-[var(--muted)] opacity-50 uppercase tracking-[0.12em] font-bold">
                Berechnet mit dem HeartPrint<span className="text-[5px] font-bold relative -top-[2.5px] ml-[0.5px]">TM</span>-Algorithmus
              </p>
              <button 
                onClick={() => setShowHeartprintModal(true)}
                className="w-4 h-4 rounded-full bg-purple-100 text-[var(--secondary)] flex items-center justify-center hover:bg-purple-200 transition-colors focus:outline-none shrink-0"
              >
                <Info className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-xs font-bold text-[#4A4468]">Keine Daten für Statistiken verfügbar.</p>
          </div>
        )}
      </div>

      {showHeartprintModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-md bg-purple-950/20 will-change-[opacity,backdrop-filter] transition-all animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowHeartprintModal(false)} />
          <div className="modal-content p-6 max-h-[85vh] flex flex-col w-full max-w-sm relative contain-layout z-10 animate-entrance shadow-2xl border border-purple-100/50">
            <div className="flex items-center justify-between mb-4 border-b border-purple-50 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-[var(--secondary)]" />
                </div>
                <h4 className="font-black text-[#1F1939] text-sm leading-tight">HeartPrint™-Algorithmus</h4>
              </div>
              <button 
                onClick={() => setShowHeartprintModal(false)} 
                className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-soft pr-1 space-y-4 text-[#4A4468] text-[11px] leading-relaxed">
              <p>
                Der <strong>Bisou-Score</strong> (0 bis 10) misst euren Antwort-Übereinstimmungswert der letzten 30 Tage. Er wird mit dem <strong>HeartPrint™</strong>-Algorithmus errechnet und setzt sich aus drei Werten zusammen:
              </p>

              <div className="space-y-2.5">
                {/* Dies/Das */}
                <div className="bg-purple-50/40 rounded-2xl p-3 border border-purple-100/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-[var(--secondary)] uppercase text-[8px] tracking-wider">1. Dies / Das</span>
                    <span className="font-bold text-[9px] bg-purple-100 text-[var(--secondary)] px-1.5 py-0.5 rounded-full">70% Gewichtung</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-normal mb-1">
                    Binärer Abgleich eurer Entweder-Oder-Antworten
                  </p>
                  <p className="text-[9px] opacity-70 leading-normal">
                    Wählen beide dieselbe Option, zählt dies als 100% Match, sonst 0%.
                  </p>
                </div>

                {/* Ranking */}
                <div className="bg-purple-50/40 rounded-2xl p-3 border border-purple-100/50">
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
                <div className="bg-purple-50/40 rounded-2xl p-3 border border-purple-100/50">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-black text-[var(--secondary)] uppercase text-[8px] tracking-wider">3. Freitexte</span>
                    <span className="font-bold text-[9px] bg-purple-100 text-[var(--secondary)] px-1.5 py-0.5 rounded-full">10% Gewichtung</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-normal mb-1">
                    Semantischer Sinn-Vergleich
                  </p>
                  <p className="text-[9px] opacity-70 leading-normal">
                    Verglichen wird der Sinn, nicht die Schreibweise. Antwortet einer "Pasta" und der andere "Nudeln", erkennt HeartPrint die Ähnlichkeit und vergibt hohe Prozentwerte (z. B. ~78% statt 0%).
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
