import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { History, Calendar, X, ChevronLeft, ChevronRight, MessageSquare, Lock, Heart, User } from 'lucide-react';

const START_DATE_STR = '2026-06-14';

const safeSplit = (val: any, delimiter: string) => {
  if (!val) return [];
  try {
    return String(val).split(delimiter);
  } catch (e) {
    return [];
  }
};

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};



export default function JournalModal({ 
  isOpen, 
  onClose, 
  partnerName, 
  userId, 
  partnerId,
  partnerAvatar,
  userAvatar,
  dayKey
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  partnerName: string, 
  userId: string, 
  partnerId: string,
  partnerAvatar?: string | null,
  userAvatar?: string | null,
  dayKey: string
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [questionsHistory, setQuestionsHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return parseLocalDate(dayKey);
    } catch (e) {
      return new Date();
    }
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(selectedDate));
  const [displayState, setDisplayState] = useState<{
    current: string;
    previous: string | null;
    direction: 'left' | 'right';
  }>(() => ({
    current: getLocalDateString(selectedDate),
    previous: null,
    direction: 'left'
  }));

  const currentKey = getLocalDateString(selectedDate);
  if (currentKey !== displayState.current) {
    const direction = currentKey > displayState.current ? 'left' : 'right';
    setDisplayState({
      current: currentKey,
      previous: displayState.current,
      direction
    });
  }

  useEffect(() => {
    if (displayState.previous !== null) {
      const timer = setTimeout(() => setDisplayState(prev => ({ ...prev, previous: null })), 400);
      return () => clearTimeout(timer);
    }
  }, [displayState.previous]);

  useEffect(() => {
    if (showCalendar) {
      setCalendarViewDate(new Date(selectedDate));
    }
  }, [showCalendar, selectedDate]);

  const selectedDateKey = useMemo(() => {
    return getLocalDateString(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      supabase.rpc('increment_journal_views').then(
        ({ error }) => {
          if (error) console.error("Error updating journal views:", error);
        },
        (err) => console.error("Error updating journal views:", err)
      );
    }
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Handle mobile hardware back button / browser navigation
  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ modal: 'journal' }, '');
      
      const handlePopState = () => {
        onCloseRef.current();
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.modal === 'journal') {
          window.history.back();
        }
      };
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      let dateStr = getLocalDateString(sixtyDaysAgo);
      if (dateStr < START_DATE_STR) {
        dateStr = START_DATE_STR;
      }

      const [answersRes, questionsRes] = await Promise.all([
        supabase.from('answers')
          .select('*')
          .gte('day_key', dateStr)
          .in('user_id', [userId, partnerId])
          .order('day_key', { ascending: false }),
        supabase.from('daily_questions')
          .select('*')
          .gte('day_key', dateStr)
      ]);

      if (answersRes.data) setHistory(answersRes.data);
      if (questionsRes.data) {
        const qMap: Record<string, any> = {};
        questionsRes.data.forEach(q => {
          qMap[q.day_key] = q.questions;
        });
        setQuestionsHistory(qMap);
      }
    } catch (err) {
      console.error("Journal error:", err);
    } finally {
      setLoading(false);
    }
  };

  const activeDays = useMemo(() => {
    const days = new Set<string>();
    history.forEach(a => days.add(a.day_key));
    return days;
  }, [history]);

  const getDayData = useCallback((key: string) => {
    const myAns = history.find(a => a.user_id === userId && a.day_key === key);
    const partnerAns = history.find(a => a.user_id === partnerId && a.day_key === key);
    const qs = questionsHistory[key];

    if (!qs) return null;

    const parse = (choiceStr: string) => {
      if (!choiceStr) return [];
      return choiceStr.split(" [")[0].split(" | ");
    };

    const formatWwe = (val: string) => {
      if (!val || val === 'Nicht geantwortet') return val;
      if (val === 'Ich') return 'Ich';
      if (val === 'Partner') return 'Du';
      return val;
    };

    const isLocked = key === dayKey && !!partnerAns && !myAns;

    return {
      questions: [
        { 
          q: qs.tot?.q || 'Wie war dein Tag?', 
          my: parse(myAns?.choice)[0], 
          partner: !isLocked ? parse(partnerAns?.choice)[0] : null,
          isPartnerLocked: isLocked
        },
        { 
          q: qs.ranking?.q || 'Ranking', 
          my: parse(myAns?.choice)[1], 
          partner: !isLocked ? parse(partnerAns?.choice)[1] : null,
          isPartnerLocked: isLocked
        },
        { 
          q: qs.text?.q || 'Dankbarkeit', 
          my: parse(myAns?.choice)[2], 
          partner: !isLocked ? parse(partnerAns?.choice)[2] : null,
          isPartnerLocked: isLocked
        },
        { 
          q: qs.wwe?.q || 'Wer würde eher...', 
          my: formatWwe(parse(myAns?.choice)[3]), 
          partner: !isLocked ? formatWwe(parse(partnerAns?.choice)[3]) : null,
          isPartnerLocked: isLocked
        }
      ],
      myAnswered: !!myAns,
      partnerAnswered: !!partnerAns,
      bothAnswered: !!myAns && !!partnerAns,
      isPartnerLocked: isLocked
    };
  }, [history, questionsHistory, userId, partnerId]);

  const navigateDate = (days: number) => {
    if (displayState.previous !== null) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    const nextKey = getLocalDateString(next);
    
    if (days < 0 && nextKey < START_DATE_STR) return;
    if (days > 0 && nextKey > dayKey) return;
    
    setSelectedDate(next);
  };

  const renderDayContent = (key: string, isOutgoing = false) => {
    const isForward = displayState.direction === 'left';
    const animationClass = displayState.previous !== null
      ? (isOutgoing
          ? (isForward ? 'animate-slide-out-left' : 'animate-slide-out-right')
          : (isForward ? 'animate-slide-in-right' : 'animate-slide-in-left'))
      : '';

    const data = getDayData(key);
    return (
      <div 
        className={`w-full h-full overflow-y-auto scrollbar-soft px-2 ${animationClass}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          isolation: 'isolate',
          overscrollBehaviorY: 'auto'
        }}
      >
        {data ? (
          <div 
            className="space-y-6 pt-10"
            style={{ paddingBottom: 'calc(8rem + var(--sab, 0px))' }}
          >
            {data.questions.map((q, i) => (
              <div key={i}>
                <div className="flex items-center mb-4 pl-4 pr-2">
                  <span className="text-[12px] font-bold text-[#2D264B] opacity-80 tracking-wider">{q.q}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4 px-2">
                  {/* Partner Answer */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-100 bg-purple-50 flex items-center justify-center">
                        {partnerAvatar ? (
                          <img src={partnerAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Heart className="w-3.5 h-3.5 text-purple-200" />
                        )}
                      </div>
                      <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-wider">{partnerName}</span>
                    </div>
                    <div className={`p-4 min-h-[80px] rounded-[1.5rem] rounded-bl-none shadow-sm flex flex-col flex-1 ${i === 3 ? 'items-center justify-center text-center' : ''} ${q.isPartnerLocked ? 'bg-purple-50/50 border-2 border-dashed border-purple-200' : 'bg-white border border-purple-100'}`}>
                      {q.isPartnerLocked ? (
                        <div className="flex items-center gap-1.5 text-purple-300">
                          <Lock className="w-2.5 h-2.5" />
                          <span className="text-[9px] font-bold italic">Gesperrt</span>
                        </div>
                      ) : (
                        <p className={`text-[11px] font-bold text-[#2D264B] opacity-90 leading-relaxed break-words ${i === 3 ? 'text-center' : ''}`}>
                          {i === 1 ? (
                            q.partner ? (
                              safeSplit(q.partner, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>))
                            ) : 'Nicht geantwortet'
                          ) : (q.partner || 'Nicht geantwortet')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* User Answer */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mr-2 self-end">
                      <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-wider">Ich</span>
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-200 bg-purple-50 flex items-center justify-center">
                        {userAvatar ? (
                          <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-purple-300" />
                        )}
                      </div>
                    </div>
                    <div className={`p-4 min-h-[80px] rounded-[1.5rem] rounded-br-none bg-white border border-purple-100 shadow-sm flex flex-col flex-1 ${i === 3 ? 'items-center justify-center text-center' : ''}`}>
                      <p className={`text-[11px] font-bold text-[#2D264B] opacity-90 leading-relaxed break-words ${i === 3 ? 'text-center' : ''}`}>
                        {i === 1 ? (
                          q.my ? (
                            safeSplit(q.my, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>))
                          ) : 'Nicht geantwortet'
                        ) : (q.my || 'Nicht geantwortet')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {data.isPartnerLocked && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center mt-2 mx-2">
                <p className="text-[10px] font-bold text-[var(--secondary)] leading-snug">
                  Du kannst die Antworten von {partnerName} für diesen Tag erst sehen, wenn du selbst geantwortet hast.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-40 h-[80%]">
            <MessageSquare className="w-8 h-8 mb-2" />
            <p className="text-xs font-bold">Keine Einträge für diesen Tag.</p>
          </div>
        )}
      </div>
    );
  };

  const [touchContainer, setTouchContainer] = useState<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  useEffect(() => {
    const container = touchContainer;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isSwiping.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (isSwiping.current || (absX > absY && absX > 10)) {
        isSwiping.current = true;
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const deltaX = touchStartRef.current.x - touchEndX;
      const deltaY = Math.abs(touchStartRef.current.y - touchEndY);
      
      // Verify primarily horizontal swipe: horizontal distance > 40px and at least 1.3x larger than vertical drift
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > deltaY * 1.3) {
        if (deltaX > 0) {
          navigateDate(1);
        } else {
          navigateDate(-1);
        }
      }
      touchStartRef.current = null;
      isSwiping.current = false;
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
      isSwiping.current = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [touchContainer, showCalendar, selectedDate, displayState.previous]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-backdrop !p-0 z-[4000]"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <style>{`
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-slide-out-right {
          animation: slideOutRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        className="modal-content !bg-[var(--bg)] w-full !max-w-none h-[100dvh] !rounded-none !border-0 flex flex-col relative overflow-hidden"
        style={{
          paddingTop: 'var(--sat, 0px)',
          paddingBottom: 'var(--sab, 0px)',
          overscrollBehaviorX: 'contain'
        }}
      >
        <div className="flex items-center justify-between mt-2 mb-2 shrink-0 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Tagebuch</h3>
              <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">Reise in die Vergangenheit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-1.5 rounded-xl transition-all border ${showCalendar ? 'bg-[var(--secondary)] text-white border-[var(--secondary)]' : 'bg-purple-50 text-[var(--secondary)] hover:bg-purple-100 border-purple-200'}`}
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showCalendar ? (
          <div className="flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-200">
            {/* Calendar Month Navigation Header */}
            <div className="flex items-center justify-between bg-purple-50/50 rounded-2xl p-2 mb-4 mx-4 shrink-0">
              <button 
                onClick={() => {
                  setCalendarViewDate(prev => {
                    const next = new Date(prev);
                    next.setMonth(next.getMonth() - 1);
                    return next;
                  });
                }}
                disabled={(() => {
                  const prevMonthLastDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 0);
                  return getLocalDateString(prevMonthLastDay) < START_DATE_STR;
                })()}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="text-center font-bold">
                <p className="text-[10px] font-black text-[#1F1939] uppercase tracking-wider">
                  {calendarViewDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <button 
                onClick={() => {
                  setCalendarViewDate(prev => {
                    const next = new Date(prev);
                    next.setMonth(next.getMonth() + 1);
                    return next;
                  });
                }}
                disabled={(() => {
                  const nextMonthFirstDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
                  return getLocalDateString(nextMonthFirstDay) > getLocalDateString(new Date());
                })()}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-soft pr-1">
              {(() => {
                const year = calendarViewDate.getFullYear();
                const month = calendarViewDate.getMonth();
                const numDays = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
                
                return (
                  <div className="grid grid-cols-7 gap-2 mx-4">
                    {/* Weekday headers */}
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
                      <div key={d} className="text-[8px] font-black text-[#8E89AA] text-center mb-1">{d}</div>
                    ))}
                    
                    {/* Empty padding cells */}
                    {Array.from({ length: firstDayIndex }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    
                    {/* Day buttons */}
                    {Array.from({ length: numDays }).map((_, i) => {
                      const dayNum = i + 1;
                      const d = new Date(year, month, dayNum);
                      const key = getLocalDateString(d);
                      const active = activeDays.has(key);
                      const isSelected = selectedDateKey === key;
                      const isBeforeStart = key < START_DATE_STR;
                      const isAfterToday = key > dayKey;
                      const isDisabled = isBeforeStart || isAfterToday;
                      
                      return (
                        <button 
                          key={dayNum}
                          disabled={isDisabled}
                          onClick={() => {
                            const dateKey = getLocalDateString(d);
                            setSelectedDate(d);
                            setDisplayState({
                              current: dateKey,
                              previous: null,
                              direction: 'left'
                            });
                            setShowCalendar(false);
                          }}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-all
                            ${isSelected ? 'border-[var(--secondary)] bg-purple-50' : 'border-transparent bg-gray-50/50'}
                            ${isDisabled ? 'opacity-20 cursor-not-allowed pointer-events-none' : 'hover:bg-purple-50/50'}
                          `}
                        >
                          <span className={`text-[10px] font-black ${isSelected ? 'text-[var(--secondary)]' : 'text-[#4A4468]'}`}>{dayNum}</span>
                          {active && !isDisabled && <div className="w-1 h-1 bg-[var(--secondary)] rounded-full mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div 
            ref={setTouchContainer}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-between bg-purple-50/50 rounded-2xl p-2 mb-1 mx-4 shrink-0 relative z-40">
              <button 
                onClick={() => navigateDate(-1)} 
                disabled={selectedDateKey <= START_DATE_STR}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {(() => {
                const isForward = displayState.direction === 'left';
                const dateInClass = displayState.previous !== null
                  ? (isForward ? 'animate-slide-in-right' : 'animate-slide-in-left')
                  : '';
                const dateOutClass = isForward ? 'animate-slide-out-left' : 'animate-slide-out-right';

                return (
                  <div className="flex-1 min-w-0 relative h-8 overflow-hidden">
                    <div 
                      key={'date-curr-' + displayState.current}
                      className={`absolute inset-0 flex items-center justify-center ${dateInClass}`}
                    >
                      <p className="text-[10px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">
                        {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                    {displayState.previous !== null && (
                      <div 
                        key={'date-prev-' + displayState.previous}
                        className={`absolute inset-0 flex items-center justify-center pointer-events-none ${dateOutClass}`}
                      >
                        <p className="text-[10px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">
                          {parseLocalDate(displayState.previous).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
              <button 
                onClick={() => navigateDate(1)} 
                disabled={selectedDateKey >= dayKey}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 relative w-full flex flex-col overflow-hidden">
              {/* Top blur-fade overlay */}
              {!loading && (
                <div 
                  className="absolute z-30 pointer-events-none top-0 left-[-20px] right-[-20px] h-8"
                  style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    maskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                    background: 'linear-gradient(to bottom, var(--bg) 0%, var(--bg-80) 40%, transparent 100%)'
                  }}
                />
              )}

              {/* Bottom blur-fade overlay */}
              {!loading && (
                <div 
                  className="absolute z-30 pointer-events-none bottom-0 left-[-20px] right-[-20px] h-20"
                  style={{
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                    background: 'linear-gradient(to top, var(--bg) 0%, var(--bg-80) 40%, transparent 100%)'
                  }}
                />
              )}

              {/* Day Contents */}
              <div 
                className={`flex-1 relative overflow-hidden ${
                  loading ? 'opacity-0 pointer-events-none' : 'animate-fade-in'
                }`}
              >
                <div key={'curr-' + displayState.current} className="absolute inset-0 flex flex-col">
                  {renderDayContent(displayState.current, false)}
                </div>
                {displayState.previous !== null && (
                  <div key={'prev-' + displayState.previous} className="absolute inset-0 pointer-events-none z-10 flex flex-col">
                    {renderDayContent(displayState.previous, true)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
