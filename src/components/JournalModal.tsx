import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { History, Calendar, X, ChevronLeft, ChevronRight, MessageSquare, Lock } from 'lucide-react';

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

const getMonthsInRange = (startDateStr: string, endDateStr: string) => {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  const months: { year: number; month: number; name: string }[] = [];
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  
  while (current <= last) {
    months.push({
      year: current.getFullYear(),
      month: current.getMonth(),
      name: current.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    });
    current.setMonth(current.getMonth() + 1);
  }
  
  return months.reverse();
};

export default function JournalModal({ 
  isOpen, 
  onClose, 
  partnerName, 
  userName,
  userId, 
  partnerId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  partnerName: string, 
  userName: string,
  userId: string, 
  partnerId: string 
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [questionsHistory, setQuestionsHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const todayStr = getLocalDateString(today);
    if (todayStr < START_DATE_STR) {
      return new Date(START_DATE_STR);
    }
    return today;
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date(selectedDate));
  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);

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
      
      const handlePopState = (e: PopStateEvent) => {
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

  const currentDayData = useMemo(() => {
    const myAns = history.find(a => a.user_id === userId && a.day_key === selectedDateKey);
    const partnerAns = history.find(a => a.user_id === partnerId && a.day_key === selectedDateKey);
    const qs = questionsHistory[selectedDateKey];

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

    return {
      questions: [
        { 
          q: qs.tot.q, 
          my: parse(myAns?.choice)[0], 
          partner: !!myAns ? parse(partnerAns?.choice)[0] : null,
          isPartnerLocked: !!partnerAns && !myAns
        },
        { 
          q: qs.ranking.q, 
          my: parse(myAns?.choice)[1], 
          partner: !!myAns ? parse(partnerAns?.choice)[1] : null,
          isPartnerLocked: !!partnerAns && !myAns
        },
        { 
          q: qs.text.q, 
          my: parse(myAns?.choice)[2], 
          partner: !!myAns ? parse(partnerAns?.choice)[2] : null,
          isPartnerLocked: !!partnerAns && !myAns
        },
        { 
          q: qs.wwe?.q || 'Wer würde eher...', 
          my: formatWwe(parse(myAns?.choice)[3]), 
          partner: !!myAns ? formatWwe(parse(partnerAns?.choice)[3]) : null,
          isPartnerLocked: !!partnerAns && !myAns
        }
      ],
      myAnswered: !!myAns,
      partnerAnswered: !!partnerAns,
      bothAnswered: !!myAns && !!partnerAns,
      isPartnerLocked: !!partnerAns && !myAns
    };
  }, [history, questionsHistory, selectedDateKey, userId, partnerId]);

  const navigateDate = (days: number) => {
    if (slideDir) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    const nextKey = getLocalDateString(next);
    
    if (days < 0 && nextKey < START_DATE_STR) return;
    const todayKey = getLocalDateString(new Date());
    if (days > 0 && nextKey > todayKey) return;
    
    setSlideDir(days > 0 ? 'left' : 'right');
    
    setTimeout(() => {
      setSelectedDate(next);
      setSlideDir(null);
    }, 150);
  };

  const touchContainerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSwiping = useRef(false);

  useEffect(() => {
    const container = touchContainerRef.current;
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
  }, [showCalendar, selectedDate, slideDir]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-backdrop !p-0 sm:!p-4 z-[4000]"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        className="modal-content !bg-[var(--bg)] p-6 w-full !max-w-none h-[100dvh] sm:h-[650px] sm:max-h-[650px] sm:!max-w-md !rounded-none sm:!rounded-[2.5rem] !border-0 sm:!border-2 flex flex-col relative overflow-hidden"
        style={{
          paddingTop: 'calc(1.5rem + var(--sat, 0px))',
          paddingBottom: 'calc(1.5rem + var(--sab, 0px))',
          touchAction: 'pan-y',
          overscrollBehaviorX: 'contain'
        }}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Bisou-Journal</h3>
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
            <div className="flex items-center justify-between bg-purple-50/50 rounded-2xl p-2 mb-4 shrink-0">
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
                  <div className="grid grid-cols-7 gap-2">
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
                      const isAfterToday = key > getLocalDateString(new Date());
                      const isDisabled = isBeforeStart || isAfterToday;
                      
                      return (
                        <button 
                          key={dayNum}
                          disabled={isDisabled}
                          onClick={() => { setSelectedDate(d); setShowCalendar(false); }}
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
            ref={touchContainerRef}
            className="flex-1 flex flex-col min-h-0"
            style={{ touchAction: 'pan-y' }}
          >
            <div className="flex items-center justify-between bg-purple-50/50 rounded-2xl p-2 mb-6 shrink-0">
              <button 
                onClick={() => navigateDate(-1)} 
                disabled={selectedDateKey <= START_DATE_STR}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-black text-[#1F1939] uppercase tracking-wider">
                  {selectedDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button 
                onClick={() => navigateDate(1)} 
                disabled={selectedDateKey >= getLocalDateString(new Date())}
                className="p-2 bg-white rounded-xl shadow-sm text-[var(--secondary)] active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto scrollbar-soft pr-1 transition-all duration-150 ${
              slideDir === 'left' 
                ? 'translate-x-[-12px] opacity-0' 
                : slideDir === 'right' 
                ? 'translate-x-[12px] opacity-0' 
                : 'translate-x-0 opacity-100'
            }`}>
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-50 rounded-[1.5rem]" />)}
                </div>
              ) : currentDayData ? (
                <div className="space-y-6 pb-4">
                  {currentDayData.questions.map((q, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <p className="text-[9px] font-black text-[#8E89AA] uppercase tracking-widest mb-2 px-1">{q.q}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Partner Answer (Locked if user didn't answer) */}
                        <div className={`rounded-2xl p-3 shadow-sm border transition-all ${q.isPartnerLocked ? 'bg-purple-50/50 border-dashed border-purple-200' : 'bg-white border-purple-100'}`}>
                          <span className="text-[7px] font-black text-[#8E89AA] uppercase block mb-1">{partnerName}</span>
                          {q.isPartnerLocked ? (
                            <div className="flex items-center gap-1.5 text-purple-300">
                              <Lock className="w-2.5 h-2.5" />
                              <span className="text-[9px] font-bold italic">Gesperrt</span>
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-[#4A4468] leading-tight">
                              {i === 1 ? safeSplit(q.partner, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : (q.partner || 'Nicht geantwortet')}
                            </p>
                          )}
                        </div>

                        {/* User Answer */}
                        <div className="bg-white border border-purple-100 rounded-2xl p-3 shadow-sm">
                          <span className="text-[7px] font-black text-[var(--secondary)] uppercase block mb-1">Ich</span>
                          <p className="text-[10px] font-bold text-[#4A4468] leading-tight">
                            {i === 1 ? safeSplit(q.my, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : (q.my || 'Nicht geantwortet')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {currentDayData.isPartnerLocked && (
                    <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 text-center mt-2">
                      <p className="text-[10px] font-bold text-[var(--secondary)] leading-snug">
                        Du kannst die Antworten von {partnerName} für diesen Tag erst sehen, wenn du selbst geantwortet hast.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <p className="text-xs font-bold">Keine Einträge für diesen Tag.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
