import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
              <div key={day} className={`aspect-square rounded-lg flex items-center justify-center relative transition-all ${
                frozen 
                  ? 'bg-blue-50 border border-blue-100' 
                  : active 
                    ? 'bg-orange-50 border border-orange-100' 
                    : 'bg-gray-50/50 border border-transparent'
              }`}>
                <span className={`text-[9px] font-black ${
                  frozen 
                    ? 'text-blue-500' 
                    : active 
                      ? 'text-orange-500' 
                      : 'text-[#8E89AA]'
                }`}>{day}</span>
                {frozen ? (
                  <Flame className="w-3.5 h-3.5 text-blue-500 fill-blue-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                ) : active ? (
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 items-center">
          {/* Links: Rekord */}
          <div className="bg-purple-50/50 rounded-xl py-1.5 px-2.5 text-center border border-purple-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider mb-2 leading-tight">Rekord</p>
            <div className="flex items-center gap-2 justify-center">
              <Flame className="w-4 h-4 text-purple-600 fill-purple-600" />
              <span className="text-sm font-black text-purple-600 leading-none">
                {activeStreakData?.longest_streak || 0}
              </span>
            </div>
          </div>
          
          {/* Mittig: Aktueller Streak */}
          <div className="bg-orange-50 rounded-xl py-2 px-3 text-center border border-orange-300 flex flex-col justify-center items-center shadow-sm relative">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Aktuell</p>
            <div className="flex items-center gap-2 justify-center">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-flicker" />
              <span className="text-lg font-black text-orange-600 leading-none">
                {activeStreakData?.current_streak || 0}
              </span>
            </div>
          </div>

          {/* Rechts: Streak Freeze */}
          <div className="bg-blue-50/50 rounded-xl py-1.5 px-2.5 text-center border border-blue-100 flex flex-col justify-center items-center">
            <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider mb-2 leading-tight">Freeze</p>
            <div className="flex items-center gap-2 justify-center">
              <Flame className="w-4 h-4 text-blue-500 fill-blue-500" />
              <span className="text-sm font-black text-blue-600 leading-none">
                {freezesUsedThisMonth}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-[8.5px] font-bold text-[var(--muted)] text-center leading-relaxed mt-3 px-1">
          Deine Serie wird 2x im Monat automatisch eingefroren, wenn du einen Tag vergisst. Gefrorene Tage werden mit einer blauen Flamme markiert.
        </p>
      </div>
    </div>,
    document.body
  );
}
