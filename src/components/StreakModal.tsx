import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X, ChevronLeft, ChevronRight } from 'lucide-react';

function BottleWine({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path 
        d="M10 2h4v5c0 2 3 2.5 3 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-9c0-1.5 3-2 3-4V2Z" 
        className="stroke-slate-400 fill-slate-200 dark:fill-slate-700" 
      />
      <rect 
        x="9" 
        y="12" 
        width="6" 
        height="5" 
        className="fill-red-500 stroke-red-500" 
        strokeWidth="0" 
        rx="0.5" 
      />
    </svg>
  );
}

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData?: any; // Fallback/Original prop
  myStreakData?: any;
  partnerStreakData?: any;
  initialTab?: 'user' | 'partner';
}

export default function StreakModal({ 
  isOpen, 
  onClose, 
  streakData, 
  myStreakData, 
  partnerStreakData,
  initialTab = 'user'
}: StreakModalProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'partner'>(initialTab);
  const [viewDate, setViewDate] = useState(new Date());

  // Determine active streak data to show in modal
  const activeStreakData = useMemo(() => {
    if (myStreakData || partnerStreakData) {
      return activeTab === 'user' ? myStreakData : partnerStreakData;
    }
    return streakData;
  }, [activeTab, streakData, myStreakData, partnerStreakData]);

  const showTabs = !!(myStreakData && partnerStreakData);

  const freezesUsedThisMonth = useMemo(() => {
    const freezes = activeStreakData?.freeze_history || [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return freezes.filter((dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [activeStreakData]);

  if (!isOpen) return null;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  const history = activeStreakData?.streak_history || [];
  const freezes = activeStreakData?.freeze_history || [];
  
  const isDateActive = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    return history.includes(dateStr);
  };

  const isDateFrozen = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    return freezes.includes(dateStr);
  };

  return createPortal(
    <div className="modal-backdrop px-4 will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-5 overflow-hidden will-change-transform contain-layout">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Serien-Übersicht</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {showTabs && (
          <div className="flex bg-purple-50 p-0.5 rounded-xl border border-purple-100/50 mb-3.5 shrink-0">
            <button 
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'user' ? 'bg-white text-[var(--secondary)] shadow-sm' : 'text-[var(--muted)] hover:text-[#1F1939]'}`}
            >
              Meine Serie
            </button>
            <button 
              onClick={() => setActiveTab('partner')}
              className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'partner' ? 'bg-white text-[var(--secondary)] shadow-sm' : 'text-[var(--muted)] hover:text-[#1F1939]'}`}
            >
              Partner-Serie
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-3 px-1">
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-1.5 bg-purple-50/50 rounded-lg"><ChevronLeft className="w-4 h-4 text-[var(--secondary)]" /></button>
          <span className="font-black text-[10px] uppercase tracking-wider text-[#1F1939]">{monthName}</span>
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-1.5 bg-purple-50/50 rounded-lg"><ChevronRight className="w-4 h-4 text-[var(--secondary)]" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
            <div key={d} className="text-[8px] font-black text-[#8E89AA] text-center mb-1">{d}</div>
          ))}
          {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const active = isDateActive(day);
            const frozen = isDateFrozen(day);
            return (
              <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${
                frozen 
                  ? 'bg-slate-50 border border-slate-200' 
                  : active 
                    ? 'bg-orange-50 border border-orange-100' 
                    : 'bg-gray-50/50 border border-transparent'
              }`}>
                <span className={`text-[9px] font-black -translate-y-[5px] ${
                  frozen 
                    ? 'text-slate-500' 
                    : active 
                      ? 'text-orange-500' 
                      : 'text-[#8E89AA]'
                }`}>{day}</span>
                {frozen ? (
                  <BottleWine className="w-3.5 h-3.5 absolute bottom-[2.5px] left-1/2 -translate-x-1/2" />
                ) : active ? (
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500 absolute bottom-1 left-1/2 -translate-x-1/2" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-1.5 items-stretch">
          {/* Links: Rekord */}
          <div className="bg-purple-50/40 rounded-xl py-1.5 px-1.5 text-center border border-purple-100/70 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider mb-2 leading-tight">Rekord</p>
            <div className="flex items-center gap-1.5 justify-center">
              <Flame className="w-4 h-4 text-[var(--secondary)] fill-[var(--secondary)]" />
              <span className="text-sm font-black text-[var(--secondary-dark)] leading-none">
                {activeStreakData?.longest_streak || 0}
              </span>
            </div>
          </div>
          
          {/* Mittig: Aktueller Streak */}
          <div className="bg-orange-50/40 rounded-xl py-2 px-1.5 text-center border border-orange-100 flex flex-col justify-center items-center relative">
            <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider mb-2 leading-tight">Aktuell</p>
            <div className="flex items-center gap-1.5 justify-center">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400 animate-flicker" />
              <span className="text-lg font-black text-orange-500 leading-none">
                {activeStreakData?.current_streak || 0}
              </span>
            </div>
          </div>

          {/* Rechts: Streak Freeze */}
          <div className="bg-slate-50/40 rounded-xl py-1.5 px-1 text-center border border-slate-200/50 flex flex-col justify-center items-center">
            <p className="text-[7.5px] sm:text-[8.5px] font-black text-[var(--muted)] uppercase tracking-tight mb-2 leading-tight">
              Grill-<span className="block">anzünder</span>
            </p>
            <div className="flex items-center gap-1 justify-center">
              <BottleWine className="w-3.5 h-3.5" />
              <span className="text-sm font-black text-slate-600 leading-none">
                {freezesUsedThisMonth}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-[8.5px] font-bold text-[var(--muted)] text-center leading-relaxed mt-3 px-1">
          Deine Serie wird 2x im Monat automatisch mit einem<br />großzügigen Schuss Grillanzünder gerettet, wenn du einen Tag vergisst.
        </p>
      </div>
    </div>,
    document.body
  );
}
