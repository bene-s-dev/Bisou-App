import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Flame, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: any;
}

export default function StreakModal({ isOpen, onClose, streakData }: StreakModalProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const freezesUsedThisMonth = useMemo(() => {
    const freezes = streakData?.freeze_history || [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return freezes.filter((dateStr: string) => {
      const d = new Date(dateStr);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
  }, [streakData]);

  if (!isOpen) return null;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  const history = streakData?.streak_history || [];
  const freezes = streakData?.freeze_history || [];
  
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
      <div className="modal-content p-8 will-change-transform contain-layout">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
              <Flame className="w-7 h-7 text-orange-500 fill-orange-500" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-lg leading-tight">Streak-Übersicht</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-purple-50 rounded-full text-[var(--muted)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-black text-xs uppercase tracking-widest text-[#1F1939]">{monthName}</span>
          <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2"><ChevronRight className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-8">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
            <div key={d} className="text-[9px] font-black text-[#8E89AA] text-center mb-2">{d}</div>
          ))}
          {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const active = isDateActive(day);
            const frozen = isDateFrozen(day);
            return (
              <div key={day} className={`aspect-square rounded-xl flex items-center justify-center relative transition-all ${
                frozen 
                  ? 'bg-blue-50 border-2 border-blue-100' 
                  : active 
                    ? 'bg-orange-50 border-2 border-orange-100' 
                    : 'bg-gray-50 border-2 border-transparent'
              }`}>
                <span className={`text-[10px] font-black ${
                  frozen 
                    ? 'text-blue-500' 
                    : active 
                      ? 'text-orange-500' 
                      : 'text-[#8E89AA]'
                }`}>{day}</span>
                {frozen ? (
                  <Flame className="w-4 h-4 text-blue-500 fill-blue-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                ) : active ? (
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 items-stretch">
          {/* Links: Rekord */}
          <div className="bg-purple-50/50 rounded-2xl p-3 text-center border border-purple-100 flex flex-col justify-center items-center">
            <p className="text-[8px] font-black text-[var(--muted)] uppercase tracking-wider mb-1 leading-tight">Rekord</p>
            <div className="flex items-center gap-1 justify-center">
              <Flame className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />
              <span className="text-sm font-black text-[var(--secondary)] leading-none">
                {streakData?.longest_streak || 0}
              </span>
            </div>
          </div>
          
          {/* Mittig: Aktueller Streak */}
          <div className="bg-orange-50 rounded-2xl p-4 text-center border-2 border-orange-100 flex flex-col justify-center items-center shadow-sm relative -translate-y-1">
            <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Aktuell</p>
            <div className="flex items-center gap-1 justify-center">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              <span className="text-lg font-black text-orange-600 leading-none">
                {streakData?.current_streak || 0}
              </span>
            </div>
          </div>

          {/* Rechts: Streak Freeze */}
          <div className="bg-blue-50/50 rounded-2xl p-3 text-center border border-blue-100 flex flex-col justify-center items-center">
            <p className="text-[8px] font-black text-[var(--muted)] uppercase tracking-wider mb-1 leading-tight">Streak Freeze</p>
            <div className="flex items-center gap-1 justify-center">
              <Flame className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
              <span className="text-sm font-black text-blue-600 leading-none">
                {freezesUsedThisMonth}
              </span>
            </div>
          </div>
        </div>
        
        <p className="text-[9px] font-bold text-[var(--muted)] text-center leading-relaxed mt-4 px-2">
          ❄️ Deine Serie wird 2x im Monat automatisch eingefroren, wenn du einen tag vergisst. Gefrorene Tage werden mit einer blauen Flamme markiert.
        </p>
      </div>
    </div>,
    document.body
  );
}
