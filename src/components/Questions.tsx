import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { FALLBACK_QUESTIONS, Question } from '../constants/questions';
import Sortable from 'sortablejs';
import { Heart, RefreshCcw, AlertCircle, ArrowRight, Send, Lock, User, History, Share2, Loader2 } from 'lucide-react';
import { useDialog } from './DialogProvider';
import { translateError } from '../lib/translations';
import JournalModal from './JournalModal';

interface QuestionsProps {
  profile?: any;
  partnerProfile?: any;
  partnerName: string;
  partnerId?: string | null;
  dashboardData?: any;
  dayKey: string;
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
    // Sequence (sped up for a snappier, more satisfying experience)
    const t1 = setTimeout(() => setPhase(2), 200);   // Start encrypting text
    const t2 = setTimeout(() => setPhase(3), 1000);  // Letter moves into envelope
    const t3 = setTimeout(() => setPhase(4), 1450);  // Envelope flap closes
    const t4 = setTimeout(() => setPhase(5), 1800);  // Seal (Lock) appears
    const t5 = setTimeout(() => setPhase(6), 2200);  // Move up, background fades out, disappear
    
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
      }, 20);
      return () => clearInterval(interval);
    }
  }, [phase, targetScrambled]);

  return createPortal(
    <div 
      className={`fixed inset-0 z-[3000] flex items-center justify-center bg-[#F8F7FF]/90 backdrop-blur-md overflow-hidden transition-opacity duration-300 ease-in-out
        ${phase >= 6 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div 
        className="relative w-48 h-48 flex items-center justify-center"
        style={{
          transform: phase >= 6 ? 'translate3d(0, -120vh, 0) scale(0.9)' : 'translate3d(0, 0, 0) scale(1)',
          transition: 'transform 450ms cubic-bezier(0.32, 0, 0.67, 0)',
          perspective: '600px',
          transformStyle: 'preserve-3d'
        }}
      >
        
        {/* Layer 1: Envelope Back */}
        <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full text-[var(--secondary)] pointer-events-none z-10">
          <path 
            d="M 8 64 L 184 64 L 184 164 A 16 16 0 0 1 168 180 L 24 180 A 16 16 0 0 1 8 164 Z" 
            fill="#FFFFFF" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
        </svg>

        {/* Layer 1b: Envelope Flap (3D folding flap) */}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 ease-in-out"
          style={{
            transformOrigin: '96px 64px',
            transform: phase >= 4 ? 'rotateX(-180deg)' : 'rotateX(0deg)',
            transformStyle: 'preserve-3d',
            zIndex: phase >= 4 ? 40 : 15,
          }}
        >
          <svg viewBox="0 0 192 192" className="w-full h-full text-[var(--secondary)]">
            <path
              d="M 8 64 Q 96 8 184 64"
              fill="#FFFFFF"
              stroke="currentColor"
              strokeWidth="3.5" 
              strokeLinejoin="round" 
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Layer 2: The Letter (slides down behind EnvelopeFront pocket) */}
        <div 
          className={`absolute left-4 top-16 w-40 h-32 bg-white rounded-2xl shadow-lg border-2 border-[var(--secondary)] p-4 flex flex-col gap-2 transition-all duration-350 ease-in-out z-20 
            ${phase >= 3 ? 'translate-y-[48px] scale-90 opacity-0' : 'translate-y-[-60px] scale-100 opacity-100'}`}
        >
          <div className="w-full h-2 bg-[var(--secondary)] rounded-full opacity-30" />
          <div className="w-3/4 h-2 bg-[var(--secondary)] rounded-full opacity-30" />
          <p className="mt-2 font-mono text-[9px] font-black text-[var(--secondary)] break-words leading-relaxed text-center">
            {scrambledText}
          </p>
          <div className="mt-auto flex flex-col gap-1.5">
            <div className="w-full h-1 bg-[var(--secondary)] rounded-full opacity-20" />
            <div className="w-full h-1 bg-[var(--secondary)] rounded-full opacity-20" />
          </div>
        </div>

        {/* Layer 3: Envelope Front Pocket */}
        <svg viewBox="0 0 192 192" className="absolute inset-0 w-full h-full text-[var(--secondary)] pointer-events-none z-30">
          <path 
            d="M 8 64 Q 96 118 184 64 L 184 164 A 16 16 0 0 1 168 180 L 24 180 A 16 16 0 0 1 8 164 Z" 
            fill="#FFFFFF" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinejoin="round" 
          />
        </svg>

        {/* Layer 4: The Lock (bounces onto the envelope seal crease) */}
        <div 
          className="absolute inset-0 flex items-center justify-center z-[60] translate-y-6"
          style={{
            transformOrigin: 'center center',
            transform: phase >= 5 ? 'scale(1)' : 'scale(0)',
            opacity: phase >= 5 ? 1 : 0,
            transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 250ms ease-out'
          }}
        >
          <div className="bg-[var(--secondary)] p-3 rounded-full shadow-2xl border-4 border-white">
            <Lock className="w-6 h-6 text-white fill-white" />
          </div>
        </div>

      </div>
      
      {/* Bottom info text */}
      <div 
        className={`absolute bottom-24 left-0 right-0 text-center transition-all duration-500 ease-in-out
          ${phase >= 6 ? 'opacity-0 translate-y-4' : phase >= 5 ? 'opacity-100 translate-y-0 scale-105' : 'opacity-100 translate-y-0'}`}
      >
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

export default function Questions({ profile, partnerProfile, partnerName, partnerId, dashboardData, dayKey, onComplete }: QuestionsProps) {
  const { showAlert, showConfirm } = useDialog();

  // --- CONSTANTS ---
  const ACTIVE_QUESTIONS = 4; // Set to 4 to enable the 'Wer würde eher' question
  const MAX_TEXT_LENGTH = 256;

  // --- INITIAL STATE DERIVATION ---
  const [initialMyResults, initialPartnerResults, initialStep] = useMemo(() => {
    const my = getResultsFromData(dashboardData, dashboardData?.answers?.find((a: any) => a.user_id !== partnerId)?.user_id);
    const partner = partnerId ? getResultsFromData(dashboardData, partnerId) : null;
    const step = my.length >= ACTIVE_QUESTIONS ? ACTIVE_QUESTIONS : 0;
    return [my, partner, step];
  }, [dashboardData, partnerId, ACTIVE_QUESTIONS]);

  // --- STATE ---
  const [step, setStep] = useState<number>(initialStep); 
  const [dailyQs, setDailyQs] = useState<Question[]>(() => {
    const base = dashboardData?.questions || [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text];
    // Use real wwe from DB (index 3) if available, otherwise fall back
    const wwe = dashboardData?.questions?.[3] || FALLBACK_QUESTIONS.wwe;
    if (wwe) {
      return base.length >= 4 ? base : [...base.slice(0,3), wwe];
    }
    return base;
  });
  const [myResults, setMyResults] = useState<string[]>(initialMyResults);
  const [partnerResults, setPartnerResults] = useState<string[] | null>(initialPartnerResults);
  const [loading, setLoading] = useState(!dashboardData);
  const [selectedTot, setSelectedTot] = useState<string | null>(null);
  const [selectedWwe, setSelectedWwe] = useState<string | null>(null);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [textVal, setTextVal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [revealResults, setRevealResults] = useState(initialStep >= ACTIVE_QUESTIONS);
  const [rankingOptions, setRankingOptions] = useState<string[]>([]);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  const [displayState, setDisplayState] = useState<{
    current: number;
    previous: number | null;
    direction: 'left' | 'right';
  }>(() => ({
    current: step,
    previous: null,
    direction: 'left'
  }));

  if (step !== displayState.current) {
    const direction = step > displayState.current ? 'left' : 'right';
    setDisplayState({
      current: step,
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

  const sortableRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (step < ACTIVE_QUESTIONS) {
      const saved = localStorage.getItem(`quiz_progress_${dayKey}`);
      if (saved) {
        try {
          const { step: savedStep, myResults: savedResults } = JSON.parse(saved);
          if (savedResults && Array.isArray(savedResults)) {
            setMyResults(savedResults);
            setStep(savedStep);
            const currentVal = savedResults[savedStep];
            if (currentVal) {
              if (savedStep === 0) setSelectedTot(currentVal);
              else if (savedStep === 1) setRankingOptions(currentVal.split(" > "));
              else if (savedStep === 2) setTextVal(currentVal);
              else if (savedStep === 3) setSelectedWwe(currentVal);
            }
          }
        } catch (e) {
          console.error("Failed to load quiz progress:", e);
        }
      }
    }
  }, [dayKey, ACTIVE_QUESTIONS]);

  useEffect(() => {
    if (step < ACTIVE_QUESTIONS && (myResults.length > 0 || selectedTot || textVal || selectedWwe)) {
      const currentResults = [...myResults];
      let currentVal = '';
      if (step === 0) currentVal = selectedTot || '';
      else if (step === 1) currentVal = rankingOptions.join(" > ");
      else if (step === 2) currentVal = textVal.trim();
      else if (step === 3) currentVal = selectedWwe || '';
      
      if (currentVal) currentResults[step] = currentVal;
      
      localStorage.setItem(`quiz_progress_${dayKey}`, JSON.stringify({ 
        step, 
        myResults: currentResults 
      }));
    } else if (step === ACTIVE_QUESTIONS) {
      localStorage.removeItem(`quiz_progress_${dayKey}`);
    }
  }, [step, myResults, selectedTot, textVal, rankingOptions, selectedWwe, dayKey, ACTIVE_QUESTIONS]);

  useEffect(() => {
    if (dashboardData) {
      const my = getResultsFromData(dashboardData, dashboardData?.answers?.find((a: any) => a.user_id !== partnerId)?.user_id);
      const partner = partnerId ? getResultsFromData(dashboardData, partnerId) : null;
      
      if (my.length >= ACTIVE_QUESTIONS) {
        if (step < ACTIVE_QUESTIONS) {
          setMyResults(prev => JSON.stringify(prev) === JSON.stringify(my) ? prev : my);
          setStep(ACTIVE_QUESTIONS);
        } else {
          setMyResults(prev => JSON.stringify(prev) === JSON.stringify(my) ? prev : my);
        }
      } else if (step === ACTIVE_QUESTIONS) {
        setMyResults([]);
        setStep(0);
        setPartnerResults(null);
        setSelectedTot(null);
        setSelectedWwe(null);
        setTextVal('');
        setRankingOptions([]);
        setIsSubmitting(false);
        setRevealResults(false);
      }
      
      setPartnerResults(prev => JSON.stringify(prev) === JSON.stringify(partner) ? prev : partner);
      if (dashboardData.questions) {
        setDailyQs(prev => {
          const newQs = [...dashboardData.questions];
          if (FALLBACK_QUESTIONS.wwe && newQs.length < 4) {
            newQs.push(FALLBACK_QUESTIONS.wwe);
          }
          return JSON.stringify(prev) === JSON.stringify(newQs) ? prev : newQs;
        });
      }
      setLoading(false);
    }
  }, [dashboardData, partnerId, step, ACTIVE_QUESTIONS]);

  // --- DATA LOADING ---
  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return;

      const { data: qData } = await supabase.from('daily_questions').select('questions').eq('day_key', dayKey).maybeSingle();
      if (qData?.questions) {
        const q = qData.questions;
        if (q.tot && q.ranking && q.text) {
          const newQs = [q.tot, q.ranking, q.text];
          const wwe = q.wwe || FALLBACK_QUESTIONS.wwe;
          if (wwe) newQs.push(wwe);
          setDailyQs(newQs);
          const lastDayKey = localStorage.getItem('last_question_day_key');
          if (lastDayKey !== dayKey) {
            localStorage.setItem('last_question_fetch', new Date().toISOString());
            localStorage.setItem('last_question_day_key', dayKey);
          }
        }
      }

      const userIds = [session.user.id];
      if (partnerId) userIds.push(partnerId);
      const { data: answers } = await supabase.from('answers').select('*').in('user_id', userIds).eq('day_key', dayKey);
      
      if (answers) {
        const myAnsObj = answers.find(a => a.user_id === session.user.id);
        const pAnsObj = partnerId ? answers.find(a => a.user_id === partnerId) : null;

        if (myAnsObj) {
          const mainPart = String(myAnsObj.choice || '').split(" [")[0];
          const parts = safeSplit(mainPart, " | ");
          if (parts.length >= ACTIVE_QUESTIONS) {
            setMyResults(parts);
            setStep(ACTIVE_QUESTIONS);
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
  }, [dayKey, partnerId, ACTIVE_QUESTIONS]);

  useEffect(() => { 
    if (!dashboardData) {
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
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) throw new Error("No session");
      
      const sig = dailyQs.slice(0, ACTIVE_QUESTIONS).map(q => `[${q.q}]`).join("");
      const choiceStr = finalResults.join(" | ") + " " + sig;
      
      const { error: deleteError } = await supabase.from('answers').delete().eq('user_id', session.user.id).eq('day_key', dayKey);
      if (deleteError) throw deleteError;
      const { error } = await supabase.from('answers').insert([{ user_id: session.user.id, choice: choiceStr, day_key: dayKey }]);
      if (error && error.code !== '23505') throw error;
      
      if (partnerId) {
        supabase.functions.invoke('send-push-notification', {
          body: { user_id: session.user.id, partner_id: partnerId, type: 'answer_submitted' }
        }).catch(err => console.warn('Push notification failed (non-critical):', err));
      }

      if (dashboardData?.streaks) {
        const myS = dashboardData.streaks.find((s: any) => s.user_id === session.user.id);
        if (myS) myS.current_streak = (myS.current_streak || 0) + 1;
      }

      setIsEncrypting(true);
      setTimeout(() => {
        setMyResults(finalResults);
        setStep(ACTIVE_QUESTIONS);
        setRevealResults(true);
      }, 2200);

      await new Promise(resolve => setTimeout(resolve, 2550));
      setIsEncrypting(false);
      setTimeout(() => onComplete(), 50);
    } catch (err: any) {
      console.error("Submit error:", err);
      showAlert("Speichern fehlgeschlagen.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const onSwipeStart = (e: React.TouchEvent) => {
    if (step >= ACTIVE_QUESTIONS || displayState.previous !== null) return;
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onSwipeEnd = (e: React.TouchEvent) => {
    if (step >= ACTIVE_QUESTIONS) return;
    if (!touchStartRef.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartRef.current.x - touchEndX;
    const deltaY = Math.abs(touchStartRef.current.y - touchEndY);
    
    if (Math.abs(deltaX) > 50 && deltaY < 60) {
      if (deltaX > 0) {
        if (step + 1 <= myResults.length && step + 1 < ACTIVE_QUESTIONS) handleDotClick(step + 1);
      } else {
        if (step > 0) handleDotClick(step - 1);
      }
    }
    touchStartRef.current = null;
  };

  const handleDotClick = (targetStep: number) => {
    if (displayState.previous !== null) return;
    if (targetStep === step || targetStep > myResults.length || targetStep >= ACTIVE_QUESTIONS) return;

    let val = '';
    if (step === 0) val = selectedTot || '';
    else if (step === 1) val = rankingOptions.length > 0 ? rankingOptions.join(" > ") : '';
    else if (step === 2) val = textVal.trim();
    else if (step === 3) val = selectedWwe || '';

    const nextResults = [...myResults];
    if (val) nextResults[step] = val;
    setMyResults(nextResults);

    setStep(targetStep);

    if (targetStep < ACTIVE_QUESTIONS) {
      if (nextResults[targetStep]) {
        const saved = nextResults[targetStep];
        if (targetStep === 0) setSelectedTot(saved);
        else if (targetStep === 1) setRankingOptions(saved.split(" > "));
        else if (targetStep === 2) setTextVal(saved);
        else if (targetStep === 3) setSelectedWwe(saved);
      } else {
        if (targetStep === 0) setSelectedTot(null);
        else if (targetStep === 1) setRankingOptions([...(dailyQs[1]?.o || [])]);
        else if (targetStep === 2) setTextVal('');
        else if (targetStep === 3) setSelectedWwe(null);
      }
    }
  };

  const handleNext = () => {
    try {
      if (step >= ACTIVE_QUESTIONS || displayState.previous !== null) return;
      let val = '';
      if (step === 0) val = selectedTot || '';
      else if (step === 1) val = rankingOptions.join(" > ");
      else if (step === 2) val = textVal.trim();
      else if (step === 3) val = selectedWwe || '';
      if (!val) return;
      
      const nextResults = [...myResults];
      nextResults[step] = val;

      if (step < ACTIVE_QUESTIONS - 1) {
        setMyResults(nextResults);
        setStep(step + 1);
        
        if (nextResults[step + 1]) {
          const saved = nextResults[step + 1];
          if (step + 1 === 1) setRankingOptions(saved.split(" > "));
          else if (step + 1 === 2) setTextVal(saved);
          else if (step + 1 === 3) setSelectedWwe(saved);
        } else {
          if (step + 1 === 1) setRankingOptions([...(dailyQs[1]?.o || [])]);
          else if (step + 1 === 2) setTextVal('');
          else if (step + 1 === 3) setSelectedWwe(null);
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
    // Only allow reset for today
    const todayKey = new Date().toISOString().split('T')[0];
    if (dayKey !== todayKey) {
      showAlert("Du kannst nur die Antworten des heutigen Tages zurücksetzen.", "error");
      return;
    }

    if (profile?.last_answer_reset_at) {
      const lastReset = new Date(profile.last_answer_reset_at).getTime();
      const elapsed = Date.now() - lastReset;
      const cooldownMs = 7 * 24 * 60 * 60 * 1000;

      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

        let timeString = '';
        if (days >= 1) {
          timeString = days === 1 ? '1 Tag' : `${days} Tagen`;
        } else if (hours >= 1) {
          timeString = hours === 1 ? '1 Stunde' : `${hours} Stunden`;
        } else {
          timeString = `${Math.max(1, minutes)} Minuten`;
        }

        showAlert(`Du kannst deine Antworten nur einmal alle 7 Tage zurücksetzen. Nächster Neustart möglich in ${timeString}.`, "error");
        return;
      }
    }

    showConfirm(
      <span>
        Möchtest du heute wirklich neu starten? Deine bisherigen Antworten werden gelöscht.{" "}
        <span className="block mt-2">
          <strong className="text-red-500 dark:text-red-400">Hinweis:</strong> Das Zurücksetzen ist<br /> nur{" "}
          <strong>einmal alle 7 Tage</strong> möglich!
        </span>
      </span>,
      async () => {
        try {
          setLoading(true);
          const { error: rpcError } = await supabase.rpc('reset_today_answers', {
            day_key_param: dayKey
          });
          if (rpcError) throw new Error(rpcError.message);
          localStorage.removeItem(`quiz_progress_${dayKey}`);
          await onComplete();
          setLoading(false);
        } catch (e: any) {
          console.error("Fehler beim Zurücksetzen der Fragen:", e);
          setLoading(false);
          showAlert(translateError(e.message), "error");
        }
      },
      { title: "Fragen neu starten", confirmLabel: "Ja, Neustart", cancelLabel: "Abbrechen" }
    );
  };

  // --- SHARE FUNCTIONALITY ---
  const handleShareAnswers = async () => {
    if (isSharing || step < ACTIVE_QUESTIONS) return;
    setIsSharing(true);
    showAlert("Antworten-Übersicht wird erstellt...", "info");

    const timerPromise = new Promise(resolve => setTimeout(resolve, 800));

    try {
      const fontStack = "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

      // Helper: word-wrap text and return lines
      const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          if (context.measureText(word).width > maxWidth) {
            // Flush current line first
            if (currentLine) {
              lines.push(currentLine);
              currentLine = '';
            }
            // Split the word character-by-character
            let subLine = '';
            for (let c = 0; c < word.length; c++) {
              const testSub = subLine + word[c];
              if (context.measureText(testSub).width > maxWidth) {
                if (subLine) lines.push(subLine);
                subLine = word[c];
              } else {
                subLine = testSub;
              }
            }
            currentLine = subLine;
          } else {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (context.measureText(testLine).width > maxWidth) {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      };

      // Pre-measure all cards to determine total canvas height
      // We need a temporary canvas for measuring
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = 1; tmpCanvas.height = 1;
      const tmpCtx = tmpCanvas.getContext('2d')!;

      const cardWidth = 340;
      const cardX = 40;
      const qLineH = 12;
      const ansLineH = 13;
      const colWidth = (cardWidth - 32) / 2 - 4;

      // Compute card data
      const cardData: { 
        qLines: string[]; 
        myLines: string[]; 
        pLines: string[]; 
        hasPAnswer: boolean;
        pBubbleHeight: number;
        myBubbleHeight: number;
        maxAnswerHeight: number;
        isFreeText: boolean;
      }[] = [];
      let totalCardsHeight = 0;

      for (let i = 0; i < ACTIVE_QUESTIONS && i < dailyQs.length; i++) {
        const question = dailyQs[i];
        const myAnswer = myResults[i] || '—';
        const pAnswer = partnerResults?.[i];
        const qText = question?.q || 'Frage';

        const formatAns = (val: string, qIndex: number): string => {
          if (qIndex === 1) return val.split(' > ').map((it, idx) => `${idx + 1}. ${it}`).join('\n');
          if (qIndex === 3) {
            if (val === 'Ich') return 'Ich';
            if (val === 'Partner') return 'Du';
          }
          return val;
        };

        const myFormatted = formatAns(myAnswer, i);
        const partnerFormatted = pAnswer ? formatAns(pAnswer, i) : null;

        // Measure question wrapping
        tmpCtx.font = `bold 8.5px ${fontStack}`;
        const qWrapped = wrapText(tmpCtx, qText, cardWidth - 32);

        // Measure answer wrapping
        const isFreeText = (i === 2);
        const ansFont = isFreeText ? `500 8.5px ${fontStack}` : `bold 9.5px ${fontStack}`;
        const currentAnsLineH = isFreeText ? 11.5 : 13;

        tmpCtx.font = ansFont;
        const myRaw = myFormatted.split('\n');
        const myWrapped: string[] = [];
        myRaw.forEach(line => {
          const wrapped = wrapText(tmpCtx, line, colWidth - 20);
          myWrapped.push(...wrapped);
        });

        const pRaw = partnerFormatted ? partnerFormatted.split('\n') : ['Wartet...'];
        const pWrapped: string[] = [];
        pRaw.forEach(line => {
          const wrapped = wrapText(tmpCtx, line, colWidth - 20);
          pWrapped.push(...wrapped);
        });

        const pBubbleHeight = Math.max(pWrapped.length * currentAnsLineH + 20, 46);
        const myBubbleHeight = Math.max(myWrapped.length * currentAnsLineH + 20, 46);
        const maxAnswerHeight = Math.max(pBubbleHeight, myBubbleHeight);

        const qHeight = qWrapped.length * qLineH + 8;
        const cardHeight = qHeight + 22 + maxAnswerHeight + 16;
        totalCardsHeight += cardHeight + 12; // +12 gap between cards

        cardData.push({ 
          qLines: qWrapped, 
          myLines: myWrapped, 
          pLines: pWrapped, 
          hasPAnswer: !!pAnswer,
          pBubbleHeight,
          myBubbleHeight,
          maxAnswerHeight,
          isFreeText
        });
      }

      // Dynamic canvas height: header (54) + cards + bottom padding (24 for domain text)
      const headerH = 54;
      const canvasLogicalH = headerH + totalCardsHeight + 24;
      const canvas = document.createElement('canvas');
      canvas.width = 840;
      canvas.height = Math.ceil(canvasLogicalH) * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);

      // 1. Background gradient (Bisou lavender)
      const grad = ctx.createLinearGradient(0, 0, 420, canvasLogicalH);
      grad.addColorStop(0, '#F8F7FF');
      grad.addColorStop(0.5, '#F0EEFF');
      grad.addColorStop(1, '#EBE8FF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 420, canvasLogicalH);

      // 2. Ambient glows
      const glowPink = ctx.createRadialGradient(80, 60, 0, 80, 60, 200);
      glowPink.addColorStop(0, 'rgba(255, 138, 138, 0.18)');
      glowPink.addColorStop(0.5, 'rgba(255, 138, 138, 0.06)');
      glowPink.addColorStop(1, 'rgba(255, 138, 138, 0)');
      ctx.fillStyle = glowPink;
      ctx.beginPath(); ctx.arc(80, 60, 200, 0, Math.PI * 2); ctx.fill();

      const glowPurple = ctx.createRadialGradient(340, canvasLogicalH - 80, 0, 340, canvasLogicalH - 80, 240);
      glowPurple.addColorStop(0, 'rgba(162, 155, 254, 0.16)');
      glowPurple.addColorStop(0.5, 'rgba(162, 155, 254, 0.05)');
      glowPurple.addColorStop(1, 'rgba(162, 155, 254, 0)');
      ctx.fillStyle = glowPurple;
      ctx.beginPath(); ctx.arc(340, canvasLogicalH - 80, 240, 0, Math.PI * 2); ctx.fill();

      // 3. "Bisou" app logo in Fraunces serif and Names pill centered together on one line
      const fraunces = "'Fraunces', Georgia, 'Times New Roman', serif";
      const myName = profile?.display_name?.split(' ')[0] || 'Ich';
      const pName = partnerName.split(' ')[0];
      const namesStr = `${pName} & ${myName}`;

      // Measure logo width
      ctx.font = `600 24px ${fraunces}`;
      const bisouW = ctx.measureText('Bisou').width;

      // Measure names pill width
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.1em';
      ctx.font = `800 8px ${fontStack}`;
      const namesW = ctx.measureText(namesStr.toUpperCase()).width;
      const namesPillW = namesW + 16;
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      // Center the combined block (logo + gap + pill)
      const totalHeaderW = bisouW + 12 + namesPillW;
      const startX = (420 - totalHeaderW) / 2;

      // Vertical alignment anchor (middle of the 54px high header space)
      const headerCenterY = 27;

      ctx.textBaseline = 'middle';

      // Draw "Bisou" app logo
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '-0.02em';
      ctx.fillStyle = '#1F1939';
      ctx.font = `600 24px ${fraunces}`;
      ctx.fillText('Bisou', startX, headerCenterY);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      // Draw Names pill
      const namesPillX = startX + bisouW + 12;
      const namesPillY = headerCenterY - 9; // 9 is half of the 18px pill height

      // Gradient pill background
      const namesPillGrad = ctx.createLinearGradient(namesPillX, namesPillY, namesPillX + namesPillW, namesPillY);
      namesPillGrad.addColorStop(0, 'rgba(255, 138, 138, 0.12)');
      namesPillGrad.addColorStop(1, 'rgba(162, 155, 254, 0.12)');
      ctx.beginPath();
      ctx.roundRect(namesPillX, namesPillY, namesPillW, 18, 9);
      ctx.fillStyle = namesPillGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(162, 155, 254, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Names text
      ctx.fillStyle = '#A29BFE';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.1em';
      ctx.font = `800 8px ${fontStack}`;
      ctx.fillText(namesStr.toUpperCase(), namesPillX + 8, headerCenterY);
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      ctx.textBaseline = 'alphabetic'; // Restore baseline to default for the rest of drawing

      // 6. Draw answer cards
      let cardY = headerH;

      for (let i = 0; i < cardData.length; i++) {
        const { qLines, myLines, pLines, hasPAnswer, pBubbleHeight, myBubbleHeight, maxAnswerHeight, isFreeText } = cardData[i];

        const qHeight = qLines.length * qLineH + 8;
        const cardHeight = qHeight + 22 + maxAnswerHeight + 16;

        // Card background (glass)
        ctx.save();
        ctx.shadowColor = 'rgba(162, 155, 254, 0.08)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fill();
        ctx.restore();

        // Card border
        const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
        borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        borderGrad.addColorStop(0.5, 'rgba(226, 223, 255, 0.35)');
        borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
        ctx.strokeStyle = borderGrad;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Question text (wrapped)
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.04em';
        ctx.fillStyle = '#2D264B';
        ctx.font = `bold 8.5px ${fontStack}`;
        qLines.forEach((line, lineIdx) => {
          ctx.fillText(line, cardX + 16, cardY + 18 + lineIdx * qLineH);
        });
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

        // Two columns for answers
        const leftColX = cardX + 16;
        const rightColX = cardX + cardWidth / 2 + 2;
        const answerStartY = cardY + qHeight + 22;

        const currentAnsLineH = isFreeText ? 11.5 : 13;
        const textTopOffset = isFreeText ? 20 : 21;
        const ansFont = isFreeText ? `500 8.5px ${fontStack}` : `bold 9.5px ${fontStack}`;

        // Partner answer (left)
        ctx.fillStyle = '#A29BFE';
        ctx.font = `800 7px ${fontStack}`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.1em';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.split(' ')[0].toUpperCase(), leftColX + colWidth / 2, answerStartY);
        ctx.textAlign = 'left';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

        ctx.beginPath();
        ctx.roundRect(leftColX, answerStartY + 8, colWidth, pBubbleHeight - 8, 12);
        ctx.fillStyle = hasPAnswer ? 'rgba(162, 155, 254, 0.08)' : 'rgba(0, 0, 0, 0.02)';
        ctx.fill();
        ctx.strokeStyle = hasPAnswer ? 'rgba(162, 155, 254, 0.15)' : 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = hasPAnswer ? '#2D264B' : '#B0ADBE';
        ctx.font = ansFont;
        if (i === 3) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bubbleY = answerStartY + 8;
          const bubbleH = pBubbleHeight - 8;
          const totalLinesH = pLines.length * currentAnsLineH;
          const startY = bubbleY + (bubbleH - totalLinesH) / 2 + (currentAnsLineH / 2);
          pLines.forEach((line, lineIdx) => {
            ctx.fillText(line, leftColX + colWidth / 2, startY + lineIdx * currentAnsLineH);
          });
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        } else {
          pLines.forEach((line, lineIdx) => {
            ctx.fillText(line, leftColX + 10, answerStartY + textTopOffset + lineIdx * currentAnsLineH, colWidth - 20);
          });
        }

        // My answer (right)
        ctx.fillStyle = '#A29BFE';
        ctx.font = `800 7px ${fontStack}`;
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.1em';
        ctx.textAlign = 'center';
        ctx.fillText(myName.toUpperCase(), rightColX + colWidth / 2, answerStartY);
        ctx.textAlign = 'left';
        if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

        ctx.beginPath();
        ctx.roundRect(rightColX, answerStartY + 8, colWidth, myBubbleHeight - 8, 12);
        ctx.fillStyle = 'rgba(162, 155, 254, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(162, 155, 254, 0.15)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = '#2D264B';
        ctx.font = ansFont;
        if (i === 3) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const bubbleY = answerStartY + 8;
          const bubbleH = myBubbleHeight - 8;
          const totalLinesH = myLines.length * currentAnsLineH;
          const startY = bubbleY + (bubbleH - totalLinesH) / 2 + (currentAnsLineH / 2);
          myLines.forEach((line, lineIdx) => {
            ctx.fillText(line, rightColX + colWidth / 2, startY + lineIdx * currentAnsLineH);
          });
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
        } else {
          myLines.forEach((line, lineIdx) => {
            ctx.fillText(line, rightColX + 10, answerStartY + textTopOffset + lineIdx * currentAnsLineH, colWidth - 20);
          });
        }

        cardY += cardHeight + 12;
      }

      // 7. Domain at the bottom
      ctx.fillStyle = '#A29BFE';
      ctx.font = `bold 8px ${fontStack}`;
      ctx.textAlign = 'center';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0.08em';
      ctx.fillText('bisou.benelabs.de', 210, canvasLogicalH - 12);
      ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px';

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });

      if (!blob) throw new Error('Canvas to Blob failed');

      await timerPromise;
      setIsSharing(false);

      const filename = `Bisou_Antworten_${dayKey}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      const shareData = {
        files: [file],
        title: 'Bisou',
        text: `Unsere Antworten vom ${new Date(dayKey + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })} 💜\n\nBisou-App ausprobieren auf bisou.benelabs.de`
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (e: any) {
          if (e.name !== 'AbortError') {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error creating share image:', err);
      showAlert('Fehler beim Erstellen des Bildes.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  if (internalError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-sm font-bold text-[#1F1939]">Fehler: {internalError}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs font-black text-[var(--secondary)] uppercase px-6 py-3 border-2 border-purple-100 rounded-full">Neu laden</button>
      </div>
    );
  }

  if (loading && step !== ACTIVE_QUESTIONS) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-100 border-t-[var(--secondary)] rounded-full animate-spin"></div>
      </div>
    );
  }

  try {
    const q0 = dailyQs[0] || FALLBACK_QUESTIONS.tot;
    const q1 = dailyQs[1] || FALLBACK_QUESTIONS.ranking;
    const q2 = dailyQs[2] || FALLBACK_QUESTIONS.text;
    const q3 = dailyQs[3] || FALLBACK_QUESTIONS.wwe;
    
    const renderQuestionSlide = (s: number, isOutgoing = false) => {
      const isForward = displayState.direction === 'left';
      const animationClass = displayState.previous !== null
        ? (isOutgoing
            ? (isForward ? 'animate-slide-out-left' : 'animate-slide-out-right')
            : (isForward ? 'animate-slide-in-right' : 'animate-slide-in-left'))
        : '';

      switch (s) {
        case 0:
          return (
            <div className={`w-full h-full flex flex-col justify-center overflow-y-auto scrollbar-soft px-6 py-4 ${animationClass}`}>
              <h2 className="text-xl font-black mb-6 text-[#1F1939] leading-[1.2] shrink-0 tracking-tight text-center">{q0.q}</h2>
              <div className="min-h-0 pb-4">
                <div className="flex flex-col gap-3">
                  {(q0.o || []).map((o, i) => (
                    <button key={i} className={`p-6 rounded-[2rem] border-2 text-sm font-black min-h-[80px] flex items-center justify-center transition-all shadow-sm ${selectedTot === o ? 'border-[var(--secondary)] bg-purple-50 text-[var(--secondary)]' : 'bg-white border-[var(--card-border)] text-[#4A4468] hover:border-purple-300'}`} onClick={() => setSelectedTot(o)}>{o}</button>
                  ))}
                </div>
              </div>
            </div>
          );
        case 1:
          return (
            <div className={`w-full h-full flex flex-col justify-center overflow-y-auto scrollbar-soft px-6 py-4 ${animationClass}`}>
              <h2 className="text-xl font-black mb-6 text-[#1F1939] leading-[1.2] shrink-0 tracking-tight text-center">{q1.q}</h2>
              <div className="min-h-0 pb-4">
                <div className="text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em] text-center mb-4 flex items-center justify-center gap-1.5 opacity-80 animate-pulse">
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
              </div>
            </div>
          );
        case 2:
          return (
            <div className={`w-full h-full flex flex-col justify-center overflow-y-auto scrollbar-soft px-6 py-4 ${animationClass}`}>
              <h2 className="text-xl font-black mb-6 text-[#1F1939] leading-[1.2] shrink-0 tracking-tight text-center">{q2.q}</h2>
              <div className="min-h-0 pb-4">
                <div className="flex flex-col gap-2">
                  <textarea 
                    className="w-full h-[180px] p-6 rounded-[2.5rem] border-2 border-[var(--card-border)] bg-white text-base font-bold leading-relaxed resize-none focus:border-[var(--secondary)] outline-none text-[#2D264B] shadow-sm transition-all" 
                    placeholder="Deine Gedanken hier..." 
                    value={textVal} 
                    onChange={(e) => setTextVal(e.target.value)} 
                    maxLength={MAX_TEXT_LENGTH}
                  />
                  <div className="flex justify-end px-6">
                    <div className={`flex items-baseline gap-1 px-3 py-1 rounded-full bg-white border border-purple-50 shadow-sm ${textVal.length >= MAX_TEXT_LENGTH ? 'text-red-400' : 'text-[#8E89AA]'}`}>
                      <span className="text-[9px] font-black tracking-[0.2em] uppercase">
                        {textVal.length} / {MAX_TEXT_LENGTH}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 3:
          if (!q3) return null;
          return (
            <div className={`w-full h-full flex flex-col justify-center overflow-y-auto scrollbar-soft px-6 py-4 ${animationClass}`}>
              <h2 className="text-xl font-black mb-6 text-[#1F1939] leading-[1.2] shrink-0 tracking-tight text-center">{q3.q}</h2>
              <div className="min-h-0 pb-4">
                <div className="grid grid-cols-2 gap-4 h-[240px]">
                  <button 
                    onClick={() => setSelectedWwe('Partner')}
                    className={`flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 transition-all shadow-sm ${selectedWwe === 'Partner' ? 'border-[var(--secondary)] bg-purple-50 text-[var(--secondary)]' : 'bg-white border-[var(--card-border)] text-[#4A4468]'}`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 ${selectedWwe === 'Partner' ? 'border-purple-200 bg-white shadow-md' : 'border-purple-100 bg-purple-50'}`}>
                      {(partnerProfile?.avatar_url || dashboardData?.partnerProfile?.avatar_url) ? (
                        <img src={partnerProfile?.avatar_url || dashboardData?.partnerProfile?.avatar_url} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-purple-300" />
                      )}
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest">{partnerName.split(' ')[0]}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedWwe('Ich')}
                    className={`flex flex-col items-center justify-center gap-4 rounded-[2.5rem] border-2 transition-all shadow-sm ${selectedWwe === 'Ich' ? 'border-[var(--secondary)] bg-purple-50 text-[var(--secondary)]' : 'bg-white border-[var(--card-border)] text-[#4A4468]'}`}
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden border-2 ${selectedWwe === 'Ich' ? 'border-purple-200 bg-white shadow-md' : 'border-purple-100 bg-purple-50'}`}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Ich" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-purple-300" />
                      )}
                    </div>
                    <span className="font-black text-sm uppercase tracking-widest">Ich</span>
                  </button>
                </div>
              </div>
            </div>
          );
        default:
          return null;
      }
    };
    
    const progressIndices = Array.from({ length: ACTIVE_QUESTIONS }, (_, i) => i);

    return (
      <div 
        className="animate-entrance flex flex-col flex-1 h-full overflow-hidden pt-0 will-change-transform"
        onTouchStart={onSwipeStart} 
        onTouchEnd={onSwipeEnd}
      >
        <style>{`
          .animate-slide-in-right {
            animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .animate-slide-out-left {
            animation: slideOutLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            position: absolute;
            width: 100%;
            height: 100%;
          }
          .animate-slide-in-left {
            animation: slideInLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .animate-slide-out-right {
            animation: slideOutRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            position: absolute;
            width: 100%;
            height: 100%;
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
        {isEncrypting && <EncryptionOverlay />}
        {step < ACTIVE_QUESTIONS ? (
          <div 
            className="flex flex-col flex-1 h-full overflow-hidden pt-4 quiz-view-container pwa-quiz-view-container"
            style={{ 
              paddingTop: 'calc(72px + var(--sat, 0px))',
              paddingBottom: 'calc(9.5rem + var(--sab, 0px))'
            }}
          >
            <header className="mb-4 px-6">
              <div className="quiz-prog-dots">
                {progressIndices.map(i => (<div key={i} onClick={() => handleDotClick(i)} className={`quiz-dot ${i <= myResults.length ? 'cursor-pointer' : ''} ${i === step ? 'active' : (i < step ? 'done' : '')}`}></div>))}
              </div>
            </header>
            <div className="flex-1 overflow-hidden relative w-full h-full">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-purple-100 border-t-[var(--secondary)] rounded-full animate-spin"></div>
                </div>
              ) : (
                <>
                  <div key={'curr-' + displayState.current} className="w-full h-full flex flex-col">
                    {renderQuestionSlide(displayState.current, false)}
                  </div>
                  {displayState.previous !== null && (
                    <div key={'prev-' + displayState.previous} className="absolute inset-0 w-full h-full pointer-events-none flex flex-col z-10">
                      {renderQuestionSlide(displayState.previous, true)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={`flex flex-col flex-1 h-full overflow-hidden relative ${revealResults ? 'animate-fade-in' : 'opacity-0'}`}>
            {/* Top opaque background behind header and buttons */}
            <div 
              className="absolute pointer-events-none z-10"
              style={{
                top: 0,
                left: '-20px',
                right: '-20px',
                height: 'calc(3.5rem + var(--sat, 0px) + 2px)',
                backgroundColor: 'var(--bg)'
              }}
            />
            {/* Top blur-fade overlay below the solid background */}
            <div 
              className="absolute pointer-events-none z-10"
              style={{
                top: 'calc(3.5rem + var(--sat, 0px) - 2px)',
                left: '-20px',
                right: '-20px',
                height: 'calc(3.5rem + 2px)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                maskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
                background: 'linear-gradient(to bottom, var(--bg) 0%, var(--bg-80) 40%, transparent 100%)'
              }}
            />
            <div className="flex-1 relative min-h-0 overflow-x-hidden">
              <div className="h-full overflow-y-auto overflow-x-hidden scroll-smooth show-scrollbar">
                <div 
                  className="space-y-6 pb-72 pt-24 px-2"
                  style={{ 
                    paddingTop: 'calc(6.5rem + var(--sat, 0px))',
                    paddingBottom: 'calc(11rem + var(--sab, 0px))'
                  }}
                >
                {dailyQs.slice(0, ACTIVE_QUESTIONS).map((question, i) => {
                  const m = myResults[i] || "—";
                  const p = partnerResults?.[i];

                  const formatWwe = (val: string) => {
                    if (i !== 3 || val === "—") return val;
                    if (val === 'Ich') return 'Ich';
                    if (val === 'Partner') return 'Du';
                    return val;
                  };

                  return (
                    <div key={i} className={revealResults ? "animate-fade-in-up" : "opacity-0"} style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="flex items-center mb-4 pl-4 pr-2">
                        <span className="text-[12px] font-bold text-[#2D264B] opacity-80 tracking-wider">{question?.q || "Frage"}</span>
                      </div>
                      <div className="flex items-stretch gap-2 w-full px-2">
                        {/* Partner Bubble */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 ml-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-100 bg-purple-50 flex items-center justify-center">
                              {(partnerProfile?.avatar_url || dashboardData?.partnerProfile?.avatar_url) ? (
                                <img src={partnerProfile?.avatar_url || dashboardData?.partnerProfile?.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Heart className="w-3.5 h-3.5 text-purple-200" />
                              )}
                            </div>
                            <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-wider">{partnerName}</span>
                          </div>
                          <div className={`p-4 min-h-[80px] rounded-[1.5rem] rounded-bl-none shadow-sm flex flex-col flex-1 ${i === 3 ? 'items-center justify-center text-center' : ''} ${!p ? 'bg-gray-50 border-2 border-dashed border-gray-200 opacity-60' : 'bg-purple-50 border border-purple-100'}`}>
                            {p ? (
                              <p className={`text-[11px] font-bold text-[#2D264B] opacity-90 leading-relaxed break-words ${i === 3 ? 'text-center' : ''}`}>
                                {i === 1 ? safeSplit(p, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : formatWwe(p)}
                              </p>
                            ) : <p className="text-[9px] font-black text-gray-300 italic mt-auto">Wartet...</p>}
                          </div>
                        </div>

                        {/* Ich Bubble */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mr-2 self-end">
                            <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-wider">Ich</span>
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-200 bg-purple-50 flex items-center justify-center">
                              {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-purple-300" />
                              )}
                            </div>
                          </div>
                          <div className={`p-4 min-h-[80px] rounded-[1.5rem] rounded-br-none bg-purple-50 border border-purple-100 shadow-sm flex flex-col flex-1 ${i === 3 ? 'items-center justify-center text-center' : ''}`}>
                            <p className={`text-[11px] font-bold text-[#2D264B] opacity-90 leading-relaxed break-words ${i === 3 ? 'text-center' : ''}`}>
                              {i === 1 ? safeSplit(m, " > ").map((it, idx) => (<span key={idx} className="block">{idx + 1}. {it}</span>)) : formatWwe(m)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
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

      {step < ACTIVE_QUESTIONS && (
        <div 
          className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-[90] pwa-quiz-next-btn-container" 
        >
          <button 
            onClick={handleNext} 
            disabled={isSubmitting || !(
              (step === 0 && selectedTot) || 
              (step === 1 && rankingOptions.length > 0) || 
              (step === 2 && textVal.trim().length > 0) ||
              (step === 3 && selectedWwe)
            )} 
            className="btn-static py-4 text-sm uppercase tracking-[0.15em] shadow-[var(--shadow-soft)] disabled:opacity-40 font-black group"
          >
            {isSubmitting ? (
              'Wird geteilt...'
            ) : (
              <>
                {step === ACTIVE_QUESTIONS - 1 ? (
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
        </div>
      )}

      {step >= ACTIVE_QUESTIONS && (
        <>
          <div 
            className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF]/95 to-transparent pointer-events-none z-[90]" 
            style={{ 
              maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)'
            }}
          />
          <div 
            className="fixed left-0 right-0 top-0 mx-auto w-full max-w-md z-[100] pointer-events-none pwa-questions-reset-header px-4" 
            style={{ paddingTop: 'calc(1rem + var(--sat, 0px))' }}
          >
            <div className="relative flex items-center justify-end gap-2 h-8 w-full">
              {/* Share Button */}
              <button 
                onClick={handleShareAnswers}
                disabled={isSharing}
                className="pointer-events-auto w-8 h-8 rounded-full bg-purple-50/80 backdrop-blur-sm border border-purple-100 shadow-sm text-[var(--secondary)] hover:text-[var(--secondary-dark)] active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              </button>

              {/* Journal Button */}
              <button 
                onClick={() => setShowJournalModal(true)}
                className="pointer-events-auto text-[8.5px] font-black text-[var(--secondary)] uppercase tracking-wider hover:text-[var(--secondary-dark)] active:scale-95 transition-all flex items-center gap-1.5 py-1.5 px-3 bg-purple-50/80 backdrop-blur-sm rounded-full border border-purple-100 shadow-sm"
              >
                Tagebuch <History className="w-4 h-4" />
              </button>
              
              {/* Reset Button */}
              <button 
                onClick={resetQuiz} 
                className="pointer-events-auto text-[8.5px] font-black text-red-400 uppercase tracking-wider hover:text-red-600 active:scale-95 transition-all flex items-center gap-1.5 py-1.5 px-3 bg-red-50/80 backdrop-blur-sm rounded-full border border-red-100 shadow-sm"
              >
                Neu starten <RefreshCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <JournalModal
            isOpen={showJournalModal}
            onClose={() => setShowJournalModal(false)}
            partnerName={partnerName}
            userId={profile?.id}
            partnerId={partnerId as string}
            partnerAvatar={partnerProfile?.avatar_url || dashboardData?.partnerProfile?.avatar_url}
            userAvatar={profile?.avatar_url}
            dayKey={dayKey}
          />
        </>
      )}
    </div>
    );
  } catch (e: any) {
    setInternalError(e.message);
    return null;
  }
}
