import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { FALLBACK_QUESTIONS, Question } from '../constants/questions';
import Sortable from 'sortablejs';
import { ChevronRight, Heart, Sparkles, MessageCircle, ListOrdered, ArrowRightLeft, RefreshCcw, AlertCircle, XCircle, ArrowRight, Send, Mail, MailOpen, Lock } from 'lucide-react';
import { getDailyKey } from '../lib/dateUtils';
import { useDialog } from './DialogProvider';

interface QuestionsProps {
  userName: string;
  partnerName: string;
  partnerId?: string | null;
  dashboardData?: any;
  onComplete: () => void;
}

const EncryptionOverlay = () => {
  const [phase, setPhase] = useState(1);
  const [scrambledText, setScrambledText] = useState("Meine Antworten");
  
  const targetScrambled = useMemo(() => {
    const chars = "ABCDEFGHiJKLMNOPQRSTUVWXYZ0123456789$&#@?%";
    return "Meine Antworten".split("").map(() => chars[Math.floor(Math.random() * chars.length)]).join("");
  }, []);

  useEffect(() => {
    // Sequence
    const t1 = setTimeout(() => setPhase(2), 500);   // Start encrypting
    const t2 = setTimeout(() => setPhase(3), 2000);  // Letter moves into envelope
    const t3 = setTimeout(() => setPhase(4), 2600);  // Envelope closes
    const t4 = setTimeout(() => setPhase(5), 3100);  // Seal (Lock) appears
    const t5 = setTimeout(() => setPhase(6), 3800);  // Move up and disappear
    
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (phase === 2) {
      const chars = "ABCDEFGHiJKLMNOPQRSTUVWXYZ0123456789$&#@?%";
      const original = "Meine Antworten";
      let iteration = 0;
      const interval = setInterval(() => {
        setScrambledText(original.split("").map((_, i) => {
          if (i < iteration / 2) return targetScrambled[i];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(""));
        iteration++;
        if (iteration > original.length * 2) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }
  }, [phase, targetScrambled]);

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#F8F7FF]/90 backdrop-blur-sm overflow-hidden">
      <div className={`relative flex items-center justify-center transition-all duration-700 ease-in-out ${phase === 6 ? '-translate-y-[120vh] opacity-0' : 'translate-y-0 opacity-100'}`}>
        
        {/* The Letter */}
        <div 
          className={`absolute w-40 h-52 bg-white rounded-xl shadow-2xl border-2 border-[var(--secondary)] p-6 flex flex-col gap-3 transition-all duration-700 ease-in-out z-40 
            ${phase >= 3 ? 'translate-y-20 scale-50 opacity-0' : 'translate-y-[-80px] scale-100 opacity-100'}`}
        >
          <div className="w-full h-2 bg-[var(--secondary)] rounded-full opacity-30" />
          <div className="w-3/4 h-2 bg-[var(--secondary)] rounded-full opacity-30" />
          <p className="mt-4 font-mono text-[10px] font-black text-[var(--secondary)] break-words leading-relaxed text-center">
            {scrambledText}
          </p>
          <div className="mt-auto flex flex-col gap-2">
            <div className="w-full h-1.5 bg-[var(--secondary)] rounded-full opacity-20" />
            <div className="w-full h-1.5 bg-[var(--secondary)] rounded-full opacity-20" />
          </div>
        </div>

        {/* The Envelope */}
        <div className={`relative transition-all duration-700 ease-in-out z-30 ${phase >= 3 ? 'scale-110' : 'scale-100'}`}>
          {phase < 4 ? (
            <MailOpen className="w-48 h-48 text-[var(--secondary)] fill-white stroke-[2px]" />
          ) : (
            <Mail className="w-48 h-48 text-[var(--secondary)] fill-white stroke-[2px]" />
          )}
          
          {/* The Lock / Seal */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${phase >= 5 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <div className="bg-[var(--secondary)] p-4 rounded-full shadow-2xl border-4 border-white">
              <Lock className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        </div>

      </div>
      
      <div className="absolute bottom-24 left-0 right-0 text-center">
        <span className="text-[12px] font-black text-[var(--secondary)] uppercase tracking-[0.4em] animate-pulse">
          {phase < 5 ? "Verschlüsseln..." : "Gesichert"}
        </span>
      </div>
    </div>,
    document.body
  );
};

// --- HELPERS ---
const safeSplit = (val: any, delimiter: string) => {
  if (!val) return [];
  try {
    return String(val).split(delimiter);
  } catch (e) {
    return [];
  }
};

const getResultsFromData = (data: any, uid: string | null | undefined) => {
  if (!data?.answers || !uid) return [];
  const ans = data.answers.find((a: any) => a.user_id === uid);
  if (!ans) return [];
  const mainPart = String(ans.choice || '').split(" [")[0];
  return safeSplit(mainPart, " | ");
};

export default function Questions({ userName, partnerName, partnerId, dashboardData, onComplete }: QuestionsProps) {
  const { showAlert, showConfirm } = useDialog();

  // --- INITIAL STATE DERIVATION ---
  const [initialMyResults, initialPartnerResults, initialStep] = useMemo(() => {
    const my = getResultsFromData(dashboardData, dashboardData?.answers?.find((a: any) => a.user_id !== partnerId)?.user_id);
    const partner = partnerId ? getResultsFromData(dashboardData, partnerId) : null;
    const step = my.length >= 3 ? 3 : 0;
    return [my, partner, step];
  }, [dashboardData, partnerId]);

  // --- STATE ---
  const [step, setStep] = useState<number>(initialStep); 
  const [dailyQs, setDailyQs] = useState<Question[]>(dashboardData?.questions || [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text]);
  const [myResults, setMyResults] = useState<string[]>(initialMyResults);
  const [partnerResults, setPartnerResults] = useState<string[] | null>(initialPartnerResults);
  const [loading, setLoading] = useState(!dashboardData);
  const [selectedTot, setSelectedTot] = useState<string | null>(null);
  const [textVal, setTextVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [rankingOptions, setRankingOptions] = useState<string[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  const sortableRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const dayKey = getDailyKey();
  const MAX_TEXT_LENGTH = 100;

  // Sync with live dashboardData if it changes (e.g. partner answers while viewing)
  useEffect(() => {
    if (dashboardData) {
      const my = getResultsFromData(dashboardData, dashboardData?.answers?.find((a: any) => a.user_id !== partnerId)?.user_id);
      const partner = partnerId ? getResultsFromData(dashboardData, partnerId) : null;
      
      // Update results but only change step if moving TO completed state
      if (my.length >= 3 && step < 3) {
        setMyResults(prev => JSON.stringify(prev) === JSON.stringify(my) ? prev : my);
        setStep(3);
      } else if (my.length >= 3) {
        // Just update results if we are already in step 3
        setMyResults(prev => JSON.stringify(prev) === JSON.stringify(my) ? prev : my);
      }
      
      setPartnerResults(prev => JSON.stringify(prev) === JSON.stringify(partner) ? prev : partner);
      if (dashboardData.questions) {
        setDailyQs(prev => JSON.stringify(prev) === JSON.stringify(dashboardData.questions) ? prev : dashboardData.questions);
      }
      setLoading(false);
    }
  }, [dashboardData, partnerId, step]);

  // --- DATA LOADING ---
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch Questions
      const { data: qData } = await supabase.from('daily_questions').select('questions').eq('day_key', dayKey).maybeSingle();
      if (qData?.questions) {
        const q = qData.questions;
        if (q.tot && q.ranking && q.text) {
          setDailyQs([q.tot, q.ranking, q.text]);
          // Only update fetch timestamp if it's a new day/set of questions
          const lastDayKey = localStorage.getItem('last_question_day_key');
          if (lastDayKey !== dayKey) {
            localStorage.setItem('last_question_fetch', new Date().toISOString());
            localStorage.setItem('last_question_day_key', dayKey);
          }
        }
      }

      // 2. Fetch Answers (initial load, then sync takes over)
      const userIds = [session.user.id];
      if (partnerId) userIds.push(partnerId);
      const { data: answers } = await supabase.from('answers').select('*').in('user_id', userIds).eq('day_key', dayKey);
      
      if (answers) {
        const myAnsObj = answers.find(a => a.user_id === session.user.id);
        const pAnsObj = partnerId ? answers.find(a => a.user_id === partnerId) : null;

        if (myAnsObj) {
          const mainPart = String(myAnsObj.choice || '').split(" [")[0];
          const parts = safeSplit(mainPart, " | ");
          if (parts.length >= 3) {
            setMyResults(parts);
            setStep(3);
          }
        } else if (!forceRefresh) {
          setStep(0);
          setMyResults([]);
        }

        if (pAnsObj) {
          const pMainPart = String(pAnsObj.choice || '').split(" [")[0];
          setPartnerResults(safeSplit(pMainPart, " | "));
        }
      }
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setLoading(false);
    }
  }, [dayKey, partnerId]);

  useEffect(() => { 
    if (!dashboardData || !dashboardData.answers || dashboardData.answers.length === 0) {
      loadData(); 
    }
  }, [loadData, dashboardData]);

  // --- RANKING INITIALIZATION ---
  useEffect(() => {
    if (step === 1 && dailyQs[1] && rankingOptions.length === 0) {
      setRankingOptions([...(dailyQs[1].o || [])]);
    }
  }, [step, dailyQs, rankingOptions.length]);

  // --- SORTABLE CLEANUP ---
  useEffect(() => {
    let container: HTMLDivElement | null = null;
    let handleTouchStart: () => void;
    let handleMouseDown: () => void;
    let onDragMove: (() => void) | null = null;

    if (step === 1 && rankingOptions.length > 0 && sortableRef.current) {
      container = sortableRef.current;
      try {
        if (sortableInstance.current) sortableInstance.current.destroy();
        sortableInstance.current = new Sortable(container, {
          animation: 200, 
          ghostClass: 'sortable-ghost',
          chosenClass: 'sortable-chosen',
          dragClass: 'sortable-drag',
          forceFallback: true,
          fallbackClass: 'sortable-fallback',
          fallbackOnBody: true,
          swapThreshold: 0.4,
          delay: 0,
          touchStartThreshold: 3,
          onStart: () => {
            const updateRank = () => {
              if (!container) return;
              const ghost = container.querySelector('.sortable-ghost');
              const fallback = document.querySelector('.sortable-fallback');
              if (ghost && fallback) {
                const children = Array.from(container.children);
                const items = children.filter(c => !c.classList.contains('sortable-fallback'));
                const ghostIndex = items.indexOf(ghost);
                if (ghostIndex !== -1) {
                  const badge = fallback.querySelector('.rank-badge');
                  if (badge) {
                    badge.setAttribute('data-live-rank', String(ghostIndex + 1));
                  }
                }
              }
            };
            onDragMove = updateRank;
            setTimeout(updateRank, 0);
            document.addEventListener('mousemove', onDragMove, { passive: true });
            document.addEventListener('touchmove', onDragMove, { passive: true });
          },
          onEnd: (evt) => {
            if (onDragMove) {
              document.removeEventListener('mousemove', onDragMove);
              document.removeEventListener('touchmove', onDragMove);
              onDragMove = null;
            }
            if (evt.oldIndex === undefined || evt.newIndex === undefined) return;
            setRankingOptions(prev => {
              const list = [...prev];
              const [moved] = list.splice(evt.oldIndex!, 1);
              list.splice(evt.newIndex!, 0, moved);
              return list;
            });
          }
        });

        handleTouchStart = () => {
          if (sortableInstance.current) {
            sortableInstance.current.option('delay', 120);
          }
        };
        handleMouseDown = () => {
          if (sortableInstance.current) {
            sortableInstance.current.option('delay', 0);
          }
        };

        container.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
        container.addEventListener('mousedown', handleMouseDown, { capture: true });
      } catch (e) { console.error("Sortable error:", e); }
    }

    return () => {
      if (sortableInstance.current) {
        try { sortableInstance.current.destroy(); } catch(e){}
        sortableInstance.current = null;
      }
      if (container) {
        try {
          container.removeEventListener('touchstart', handleTouchStart, { capture: true });
          container.removeEventListener('mousedown', handleMouseDown, { capture: true });
        } catch(e){}
      }
      if (onDragMove) {
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('touchmove', onDragMove);
      }
    };
  }, [step, rankingOptions.length]);

  // --- SUBMISSION ---
  const handleSubmit = async (finalResults: string[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      
      const sig = dailyQs.map(q => `[${q.q}]`).join("");
      const choiceStr = finalResults.join(" | ") + " " + sig;
      
      // Delete old answers for this user
      await supabase.from('answers').delete().eq('user_id', session.user.id).neq('day_key', dayKey);
      
      const { error } = await supabase.from('answers').insert([{ user_id: session.user.id, choice: choiceStr, day_key: dayKey }]);
      if (error && error.code !== '23505') throw error;
      
      // Send push notification to partner (fire-and-forget, non-blocking)
      if (partnerId) {
        supabase.functions.invoke('send-push-notification', {
          body: { user_id: session.user.id, partner_id: partnerId, type: 'answer_submitted' }
        }).catch(err => console.warn('Push notification failed (non-critical):', err));
      }

      // Update local streak for immediate feedback if dashboardData isn't instant
      if (dashboardData?.streaks) {
        const myS = dashboardData.streaks.find((s: any) => s.user_id === session.user.id);
        if (myS) myS.current_streak = (myS.current_streak || 0) + 1;
      }

      // TRIGGER ANIMATION
      setIsEncrypting(true);
      
      // Wait for animation to finish (approx 4.5s total to be safe)
      await new Promise(resolve => setTimeout(resolve, 4800));

      setMyResults(finalResults);
      setIsEncrypting(false);
      setStep(3);
      // Delayed notification to parent to prevent sync render issues
      setTimeout(() => onComplete(), 200);
    } catch (err: any) {
      console.error("Submit error:", err);
      showAlert("Speichern fehlgeschlagen.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const onSwipeStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartRef.current.x - touchEndX;
    const deltaY = Math.abs(touchStartRef.current.y - touchEndY);
    
    if (Math.abs(deltaX) > 50 && deltaY < 60) {
      if (deltaX > 0) {
        if (step + 1 <= myResults.length) handleDotClick(step + 1);
      } else {
        if (step > 0) handleDotClick(step - 1);
      }
    }
    touchStartRef.current = null;
  };

  const handleDotClick = (targetStep: number) => {
    if (targetStep === step || targetStep > myResults.length || targetStep > 3) return;

    let val = '';
    if (step === 0) val = selectedTot || '';
    else if (step === 1) val = rankingOptions.length > 0 ? rankingOptions.join(" > ") : '';
    else if (step === 2) val = textVal.trim();

    const nextResults = [...myResults];
    if (val) nextResults[step] = val;
    setMyResults(nextResults);

    setStep(targetStep);

    if (targetStep < 3) {
      if (nextResults[targetStep]) {
        const saved = nextResults[targetStep];
        if (targetStep === 0) setSelectedTot(saved);
        else if (targetStep === 1) setRankingOptions(saved.split(" > "));
        else if (targetStep === 2) setTextVal(saved);
      } else {
        if (targetStep === 0) setSelectedTot(null);
        else if (targetStep === 1) setRankingOptions([...(dailyQs[1]?.o || [])]);
        else if (targetStep === 2) setTextVal('');
      }
    }
  };

  const handleNext = () => {
    try {
      if (step >= 3) return;
      let val = '';
      if (step === 0) val = selectedTot || '';
      else if (step === 1) val = rankingOptions.join(" > ");
      else if (step === 2) val = textVal.trim();
      if (!val) return;
      
      const nextResults = [...myResults];
      nextResults[step] = val;

      if (step < 2) {
        setMyResults(nextResults);
        setStep(step + 1);
        
        if (nextResults[step + 1]) {
          const saved = nextResults[step + 1];
          if (step + 1 === 1) setRankingOptions(saved.split(" > "));
          else if (step + 1 === 2) setTextVal(saved);
        } else {
          if (step + 1 === 1) setRankingOptions([...(dailyQs[1]?.o || [])]);
          else if (step + 1 === 2) setTextVal('');
        }
      } else {
        setMyResults(nextResults);
        handleSubmit(nextResults);
      }
    } catch (e: any) {
      setInternalError(e.message);
    }
  };

  const resetQuiz = async () => {
    showConfirm(
      "Möchtest du heute wirklich neu starten? Deine bisherigen Antworten werden gelöscht.",
      async () => {
        try {
          setLoading(true);
          const { data: { session } } = await supabase.auth.getSession();
          if (session) await supabase.from('answers').delete().eq('day_key', dayKey).eq('user_id', session.user.id);
          
          setMyResults([]);
          setStep(0);
          setPartnerResults(null);
          setSelectedTot(null);
          setTextVal('');
          setRankingOptions([]);
          setIsSubmitting(false);
          
          setTimeout(() => onComplete(), 200);
          await loadData(true);
        } catch (e) {
          setLoading(false);
        }
      },
      { title: "Fragen neu starten", confirmLabel: "Ja, Neustart", cancelLabel: "Abbrechen" }

    );
  };

  // --- RENDER RECOVERY ---
  if (internalError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-sm font-bold text-[#1F1939]">Fehler: {internalError}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs font-black text-[var(--secondary)] uppercase px-6 py-3 border-2 border-purple-100 rounded-full">Neu laden</button>
      </div>
    );
  }

  if (loading && step !== 3) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-100 border-t-[var(--secondary)] rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  try {
    const q = dailyQs[step < 3 ? step : 0] || FALLBACK_QUESTIONS.tot;

    return (
      <div 
        className="animate-entrance flex flex-col flex-1 h-full overflow-hidden pt-0 will-change-transform"
        onTouchStart={onSwipeStart} 
        onTouchEnd={onSwipeEnd}
      >
        {isEncrypting && <EncryptionOverlay />}
        {step < 3 ? (
          // --- QUIZ VIEW ---
          <div className="flex flex-col flex-1 h-full overflow-hidden pt-4 quiz-view-container" style={{ paddingBottom: 'calc(9.5rem + var(--sab))' }}>
            <header className="mb-4">
              <div className="quiz-prog-dots">
                {[0, 1, 2].map(i => (<div key={i} onClick={() => handleDotClick(i)} className={`quiz-dot ${i <= myResults.length ? 'cursor-pointer' : ''} ${i === step ? 'active' : (i < step ? 'done' : '')}`}></div>))}
              </div>
            </header>
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 scrollbar-soft justify-center py-4">
              <h2 className="text-xl font-black mb-6 text-[#1F1939] leading-[1.2] shrink-0 tracking-tight text-center">{q.q}</h2>
              <div className="min-h-0 pb-4">
                {step === 0 && (
                  <div className="flex flex-col gap-3">
                    {(q.o || []).map((o, i) => (
                      <button key={i} className={`p-6 rounded-[2rem] border-2 text-sm font-black min-h-[80px] flex items-center justify-center transition-all shadow-sm ${selectedTot === o ? 'border-[var(--secondary)] bg-purple-50 text-[var(--secondary)]' : 'bg-white border-[var(--card-border)] text-[#4A4468] hover:border-purple-300'}`} onClick={() => setSelectedTot(o)}>{o}</button>
                    ))}
                  </div>
                )}
                {step === 1 && (
                  <>
                    <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em] text-center mb-4 flex items-center justify-center gap-1.5 opacity-80">
                      <span>👆</span> Gedrückt halten zum Verschieben
                    </div>
                    <div ref={sortableRef} className="flex flex-col gap-3 rank-list">
                      {rankingOptions.map((o, i) => (
                        <div key={o} className="cursor-grab select-none rank-item">
                          <div className="bg-white border-2 border-[var(--card-border)] p-5 rounded-[2rem] flex items-center gap-4 shadow-sm transition-[border-color,background-color] duration-200 card-inner">
                            <span className="w-8 h-8 rounded-full bg-purple-50 text-[var(--secondary)] flex items-center justify-center text-[12px] font-black rank-badge" data-rank={i + 1}></span>
                            <span className="font-black text-[14px] text-[#2D264B] leading-snug line-clamp-2">{o}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {step === 2 && (
                  <div className="flex flex-col gap-2 relative">
                    <textarea 
                      className="w-full h-[180px] p-6 pb-12 rounded-[2.5rem] border-2 border-[var(--card-border)] bg-white text-base font-bold leading-relaxed resize-none focus:border-[var(--secondary)] outline-none text-[#2D264B] shadow-sm transition-all" 
                      placeholder="Deine Gedanken hier..." 
                      value={textVal} 
                      onChange={(e) => setTextVal(e.target.value)} 
                      maxLength={MAX_TEXT_LENGTH}
                    />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
                      <span className={`text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-purple-50 shadow-sm ${textVal.length >= MAX_TEXT_LENGTH ? 'text-red-400' : 'text-[#8E89AA]'}`}>
                        {textVal.length} / {MAX_TEXT_LENGTH}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // --- RESULTS VIEW ---
          <div className="flex flex-col flex-1 h-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 right-0 h-32 z-10 pointer-events-none results-top-fade"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
                margin: '0 -16px'
              }}
            />
            <div className="flex-1 relative min-h-0">
              <div className="h-full overflow-y-auto scroll-smooth show-scrollbar">
                <div className="space-y-10 pb-72 pt-28 pr-1">
                {dailyQs.map((question, i) => {
                  const m = myResults[i] || "—";
                  const p = partnerResults?.[i];
                  return (
                    <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="flex items-center mb-4 px-1">
                        <span className="text-[10px] font-black text-[#8E89AA] uppercase tracking-[0.2em]">{question?.q || "Frage"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="res-bubble p-5 min-h-[120px] flex flex-col rounded-[2.25rem] border-2 border-[var(--card-border)] bg-white shadow-sm">
                          <span className="text-[9px] font-black text-[var(--secondary)] mb-3 uppercase tracking-[0.2em]">ICH</span>
                          <p className="text-xs font-bold text-[#2D264B] leading-relaxed break-words">
                            {i === 1 ? safeSplit(m, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : m}
                          </p>
                        </div>
                        <div className={`res-bubble p-5 min-h-[120px] flex flex-col rounded-[2.25rem] border-2 border-[var(--card-border)] bg-white shadow-sm ${!p ? 'bg-purple-50/20 border-dashed border-purple-100 opacity-60' : ''}`}>
                          <span className="text-[9px] font-black text-[#8E89AA] mb-3 uppercase tracking-[0.2em]">{partnerName.toUpperCase()}</span>
                          {p ? (
                            <p className="text-xs font-bold text-[#2D264B] leading-relaxed break-words">
                              {i === 1 ? safeSplit(p, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : p}
                            </p>
                          ) : <p className="text-[10px] font-black text-purple-200 italic mt-auto">Wartet...</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
              
              {/* Overlays on top */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-56 z-20 pointer-events-none bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF]/95 to-transparent"
                style={{ 
                  maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 50%, transparent 100%)'
                }}
              />
          </div>
        </div>
      )}

      {step < 3 && createPortal(
        <div 
          className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-[90]" 
          style={{ bottom: 'calc(5.5rem + var(--sab))' }}
        >
          <button 
            onClick={handleNext} 
            disabled={isSubmitting || !((step === 0 && selectedTot) || (step === 1 && rankingOptions.length > 0) || (step === 2 && textVal.trim().length > 0))} 
            className="btn-static py-4 text-sm uppercase tracking-[0.15em] shadow-[var(--shadow-soft)] disabled:opacity-40 font-black group"
          >
            {isSubmitting ? (
              'Wird geteilt...'
            ) : (
              <>
                {step === 2 ? (
                  <>
                    Antworten senden
                    <Send className="w-4.5 h-4.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </>
                ) : (
                  <>
                    Weiter
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </>
            )}
          </button>
        </div>,
        document.body
      )}

      {step >= 3 && createPortal(
        <>
          <div 
            className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF]/95 to-transparent pointer-events-none z-[90]" 
            style={{ 
              maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)'
            }}
          />
          <div 
            className="fixed left-0 right-0 top-0 mx-auto w-full max-w-md px-4 z-[100] pointer-events-none" 
            style={{ paddingTop: 'calc(1.5rem + var(--sat))' }}
          >
            <div className="flex justify-end">
              <button onClick={resetQuiz} className="pointer-events-auto text-[9px] font-black text-red-400 uppercase tracking-[0.2em] hover:text-red-600 active:scale-95 transition-all flex items-center gap-1.5 py-1.5 px-3 bg-red-50/50 rounded-full border border-red-100 shadow-sm mt-1">
                Antworten zurücksetzen <RefreshCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
    );
  } catch (e: any) {
    setInternalError(e.message);
    return null;
  }
}
