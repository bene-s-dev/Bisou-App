import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';

interface MilestoneContextType {
  checkMilestones: () => Promise<void>;
  showTestMilestone: () => void;
}

const MilestoneContext = createContext<MilestoneContextType | undefined>(undefined);

export const MilestoneProvider: React.FC<{ 
  children: React.ReactNode;
  userId: string | undefined;
  partnerId: string | null | undefined;
  dashboardData: any;
}> = ({ children, userId, partnerId, dashboardData }) => {
  const [newMilestones, setNewMilestones] = useState<any[]>([]);
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([]);
  const [toastTimeLeft, setToastTimeLeft] = useState(10000);
  const [toastPaused, setToastPaused] = useState(false);
  const navigate = useNavigate();

  const currentNewMilestone = newMilestones[0];

  // Fetch all possible milestones once to have IDs for testing/mapping
  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from('milestones').select('id').limit(1);
      if (data) setAvailableMilestones(data);
    };
    fetchAll();
  }, []);

  const handleDismissMilestone = useCallback(async () => {
    const milestone = newMilestones[0];
    if (milestone && userId && !milestone.is_test) {
      // Mark as seen in database
      await supabase
        .from('unlocked_milestones')
        .update({ is_seen: true })
        .eq('id', milestone.id);
    }
    setNewMilestones(prev => prev.slice(1));
  }, [newMilestones, userId]);

  const showTestMilestone = useCallback(() => {
    // Use a real ID if available, otherwise fallback to dummy
    const realId = availableMilestones[0]?.id || 'test-milestone-' + Date.now();
    
    setNewMilestones(prev => [...prev, {
      id: 'test-notification-' + Date.now(),
      milestone_id: realId,
      milestones: {
        icon: '🎉',
        name: 'Test-Erfolg freigeschaltet!',
        description: 'Dies ist eine Vorschau des Toasts. Da wir eine echte ID nutzen, wird dieser Meilenstein im Profil golden markiert!'
      },
      unlocked_at: new Date().toISOString(),
      is_test: true
    }]);
  }, [availableMilestones]);

  const checkMilestones = useCallback(async () => {
    if (!userId || !partnerId) return;

    try {
      // Fetch user's unlocked milestones that haven't been seen yet
      const { data: umData, error: umError } = await supabase
        .from('unlocked_milestones')
        .select('*, milestones(*)')
        .eq('user_id', userId)
        .eq('is_seen', false);

      if (umError || !umData) return;

      if (umData.length > 0) {
        // Sort by unlocked_at ascending so we show them in order
        umData.sort((a, b) => new Date(a.unlocked_at).getTime() - new Date(b.unlocked_at).getTime());
        
        setNewMilestones(prev => {
          const existingIds = prev.map(m => m.id);
          const filtered = umData.filter(um => !existingIds.includes(um.id));
          return [...prev, ...filtered];
        });
      }
    } catch (err) {
      console.error("Error checking new milestones:", err);
    }
  }, [userId, partnerId]);

  useEffect(() => {
    checkMilestones();
  }, [userId, partnerId, dashboardData, checkMilestones]);

  useEffect(() => {
    if (currentNewMilestone) {
      setToastTimeLeft(10000);
      setToastPaused(false);
    }
  }, [currentNewMilestone?.id]);

  useEffect(() => {
    if (!currentNewMilestone || toastPaused) {
      return;
    }

    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      setToastTimeLeft(prev => {
        const next = prev - delta;
        if (next <= 0) {
          handleDismissMilestone();
          return 10000;
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [currentNewMilestone, toastPaused, handleDismissMilestone]);

  useEffect(() => {
    if (newMilestones.length > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#A29BFE', '#FF8A8A', '#FFD166', '#06D6A0']
      });
    }
  }, [newMilestones.length]);

  return (
    <MilestoneContext.Provider value={{ checkMilestones, showTestMilestone }}>
      {children}
      {currentNewMilestone && createPortal(
        <div 
          onMouseEnter={() => setToastPaused(true)}
          onMouseLeave={() => setToastPaused(false)}
          onTouchStart={() => setToastPaused(true)}
          onTouchEnd={() => setToastPaused(false)}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] w-[90%] max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-100/50 dark:border-purple-900/30 shadow-[0_10px_30px_rgba(162,155,254,0.15)] rounded-[2rem] p-4 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-5 duration-300 select-none touch-pan-y"
        >
          {/* Animated border progress frame */}
          <div className="absolute inset-0 pointer-events-none rounded-[2rem] overflow-visible">
            <svg width="100%" height="100%" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
              <defs>
                <linearGradient id="toast-border-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.45" />
                  <stop offset="50%" stopColor="#ec4899" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              <rect
                x="0" y="0" width="100%" height="100%" rx="32" fill="none"
                stroke="url(#toast-border-gradient)" strokeWidth="1.8"
                pathLength="100" strokeDasharray="100"
                strokeDashoffset={100 - (toastTimeLeft / 10000) * 100}
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center shrink-0 text-2xl border border-purple-100/50 dark:border-purple-900/30">
            {currentNewMilestone.milestones?.icon}
          </div>
          <div className="flex-1 text-left min-w-0">
            <h4 className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest leading-none mb-1">Meilenstein erreicht! 🏆</h4>
            <h3 className="text-xs font-black text-[#1F1939] dark:text-white truncate">{currentNewMilestone.milestones?.name}</h3>
            <p className="text-[9px] font-bold text-[#4A4468] dark:text-slate-300 opacity-80 leading-tight mt-0.5 line-clamp-2">{currentNewMilestone.milestones?.description}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0 z-10">
            <button 
              onClick={() => {
                const milestoneId = currentNewMilestone.milestone_id;
                handleDismissMilestone();
                navigate(`/profile?tab=partner&showMilestones=true&highlightMilestone=${milestoneId}`);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-[9px] font-black rounded-xl active:scale-95 transition-all uppercase tracking-widest border-none shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              Ansehen
            </button>
            <button 
              onClick={handleDismissMilestone}
              className="px-3 py-1.5 bg-transparent text-[var(--muted)] dark:text-slate-400 text-[8px] font-black hover:text-[var(--secondary)] dark:hover:text-white active:scale-95 transition-all uppercase tracking-widest border-2 border-[var(--card-border)] dark:border-slate-800 rounded-xl"
            >
              Schließen
            </button>
          </div>
        </div>,
        document.body
      )}
    </MilestoneContext.Provider>
  );
};

export const useMilestones = () => {
  const context = useContext(MilestoneContext);
  if (context === undefined) {
    throw new Error('useMilestones must be used within a MilestoneProvider');
  }
  return context;
};
