import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import StatsModal from './StatsModal';
import { supabase } from '../lib/supabase';
import { GREETINGS, Question } from '../constants/questions';
import { User as UserIcon, Clock, Flame, X, ChevronLeft, ChevronRight, Link as LinkIcon, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { getTimeUntilReset } from '../lib/dateUtils';
import { useDialog } from './DialogProvider';
import { capitalizeName } from '../lib/stringUtils';
import { translateError } from '../lib/translations';
import { useMilestones } from './MilestoneProvider';
import StreakModal from './StreakModal';

interface DashboardProps {
  userName: string;
  userAvatar?: string;
  partnerName: string;
  partnerAvatar?: string | null;
  partnerId?: string | null;
  dashboardData: any;
  dayKey: string;
  onStartQuestions: () => void;
  onRefreshData?: () => Promise<void>;
}

export default function Dashboard({ 
  userName, 
  userAvatar, 
  partnerName, 
  partnerAvatar, 
  partnerId, 
  dashboardData,
  dayKey,
  onStartQuestions,
  onRefreshData
}: DashboardProps) {
  const { showAlert, showConfirm } = useDialog();
  const [showComparison, setShowComparison] = useState(false);
  const [countdown, setCountdown] = useState(() => {
    const remaining = getTimeUntilReset();
    return { hours: remaining.hours, minutes: remaining.minutes, seconds: remaining.seconds };
  });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isFullscreenPartner, setIsFullscreenPartner] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [isPartnerHovered, setIsPartnerHovered] = useState(false);

  const [stats, setStats] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_bisou_stats_v3');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [loadingStats, setLoadingStats] = useState(!stats);

  useEffect(() => {
    if (fullscreenImage) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [fullscreenImage]);

  const fetchStats = useCallback(async () => {
    try {
      const hasCached = !!localStorage.getItem('cached_bisou_stats_v3');
      if (!hasCached) {
        setLoadingStats(true);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session || !partnerId) {
        if (!hasCached) setLoadingStats(false);
        return;
      }

      const { data: statsData, error: statsError } = await supabase.functions.invoke('calculate-stats', {
        body: { 
          userId: session.user.id, 
          partnerId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (statsError) throw statsError;

      if (statsData) {
        setStats(statsData);
        localStorage.setItem('cached_bisou_stats_v3', JSON.stringify(statsData));
      }
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (partnerId) {
      fetchStats();
    } else {
      setLoadingStats(false);
    }
  }, [partnerId, dashboardData, fetchStats]);

  const navigate = useNavigate();
  const hasPartner = !!partnerId;
  const { showTestMilestone } = useMilestones();

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = getTimeUntilReset();
      setCountdown({ hours: remaining.hours, minutes: remaining.minutes, seconds: remaining.seconds });
      if (remaining.totalSeconds === 0) window.location.reload();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const seed = new Date(dayKey).getDate() + new Date(dayKey).getMonth() + new Date(dayKey).getFullYear();
    return GREETINGS[seed % GREETINGS.length];
  }, [dayKey]);

  const { rawGreeting, isQuestion } = useMemo(() => {
    const isQuestion = greeting.endsWith('?');
    const rawGreeting = greeting.replace(/\?$/, '').replace(/,$/, '').trim();
    return { rawGreeting, isQuestion };
  }, [greeting]);

  const { meAnswered, partnerAnswered, myAnswers, partnerAnswers, dailyQs, myStreak, partnerStreak, myTime, partnerTime } = useMemo(() => {
    if (!dashboardData) return { meAnswered: false, partnerAnswered: false, myAnswers: [], partnerAnswers: [], dailyQs: [], myStreak: null, partnerStreak: null, myTime: null, partnerTime: null };
    const { answers = [], questions = [], streaks = [] } = dashboardData;
    
    const safeAnswers = Array.isArray(answers) ? answers : [];
    const safeStreaks = Array.isArray(streaks) ? streaks : [];
    const safeQuestions = Array.isArray(questions) ? questions : [];

    const me = safeAnswers.find((a: any) => a.user_id !== partnerId);
    const other = partnerId ? safeAnswers.find((a: any) => a.user_id === partnerId) : null;
    
    // Explicitly identify streaks
    const myS = safeStreaks.find((s: any) => s.user_id !== partnerId);
    const pS = partnerId ? safeStreaks.find((s: any) => s.user_id === partnerId) : null;

    return {
      meAnswered: !!me,
      partnerAnswered: !!other,
      myAnswers: me && me.choice ? me.choice.split(" [")[0].split(" | ") : [],
      partnerAnswers: other && other.choice ? other.choice.split(" [")[0].split(" | ") : null,
      dailyQs: safeQuestions as Question[],
      myStreak: myS,
      partnerStreak: pS,
      myTime: me && me.created_at ? new Date(me.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null,
      partnerTime: other && other.created_at ? new Date(other.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null
    };
  }, [dashboardData, partnerId]);

  const yesterdayKey = useMemo(() => {
    const parts = dayKey.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [dayKey]);

  const isMyStreakFrozen = useMemo(() => {
    const freezes = myStreak?.freeze_history || [];
    return freezes.includes(yesterdayKey) && myStreak?.last_answer_date === yesterdayKey;
  }, [myStreak, yesterdayKey]);

  const isPartnerStreakFrozen = useMemo(() => {
    const freezes = partnerStreak?.freeze_history || [];
    return freezes.includes(yesterdayKey) && partnerStreak?.last_answer_date === yesterdayKey;
  }, [partnerStreak, yesterdayKey]);

  const handleNudge = async () => {
    if (!partnerId) return;
    
    setIsNudging(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) return;
      
      const userId = session.user.id;

      // Fetch latest profile info for accurate cooldown check
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, last_nudge_at, nudge_count, partner_id')
        .eq('id', userId)
        .maybeSingle();
        
      if (profileErr || !profile) {
        throw new Error("Profil konnte nicht geladen werden.");
      }

      // Cooldown progression: increments by 20s (first 20s, then 40s, then 60s, etc.)
      const BASE_COOLDOWN_MS = 20 * 1000;
      const RESET_WINDOW_MS = 30 * 60 * 1000; // reset progression after 30 minutes of inactivity
      
      const dbLastNudgeTime = profile.last_nudge_at ? new Date(profile.last_nudge_at).getTime() : 0;
      const dbNudgeCount = profile.nudge_count || 0;
      
      const lastNudgeTimeStr = localStorage.getItem(`last_nudge_${profile.id}`);
      const localLastNudgeTime = lastNudgeTimeStr ? parseInt(lastNudgeTimeStr, 10) : 0;
      const localNudgeCount = parseInt(localStorage.getItem(`nudge_count_${profile.id}`) || '0', 10);
      
      // Use the most recent of the two (DB vs LocalStorage)
      const lastNudgeTime = Math.max(dbLastNudgeTime, localLastNudgeTime);
      let nudgeCount = lastNudgeTime === dbLastNudgeTime ? dbNudgeCount : localNudgeCount;
      
      if (lastNudgeTime > 0) {
        const elapsed = Date.now() - lastNudgeTime;
        
        // Reset progression count if the user has been inactive for more than 30 minutes
        if (elapsed > RESET_WINDOW_MS) {
          nudgeCount = 0;
        }
        
        if (nudgeCount > 0) {
          const requiredCooldown = nudgeCount * BASE_COOLDOWN_MS;
          if (elapsed < requiredCooldown) {
            const remainingMs = requiredCooldown - elapsed;
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            const timeString = minutes > 0 
              ? `${minutes} Min. und ${seconds} Sek.` 
              : `${seconds} Sek.`;
            showAlert(`Hör auf, deinen Bisou-Partner zu nerven! Nächster Anstupster möglich in: ${timeString}`, "error");
            return;
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: profile.id,
          partner_id: profile.partner_id,
          type: 'nudge'
        }
      });

      if (error) {
        let detailMsg = error.message;
        try {
          const errText = await error.context.text();
          const errJson = JSON.parse(errText);
          if (errJson && errJson.error) {
            detailMsg = errJson.error;
          } else if (errJson && errJson.message) {
            detailMsg = errJson.message;
          } else {
            detailMsg = errText;
          }
        } catch (_) {}
        throw new Error(detailMsg);
      }

      if (data?.skipped) {
        showAlert(`${partnerName ? capitalizeName(partnerName) : 'Partner'} hat Benachrichtigungen nicht aktiviert.`, "info");
      } else {
        showAlert(`${partnerName ? capitalizeName(partnerName) : 'Partner'} wurde angestupst! ❤️`, "success");
        // Save timestamp and increment count ONLY for successful, non-skipped nudge actions
        const nextNudgeTime = Date.now();
        const nextNudgeCount = nudgeCount + 1;
        localStorage.setItem(`last_nudge_${profile.id}`, nextNudgeTime.toString());
        localStorage.setItem(`nudge_count_${profile.id}`, nextNudgeCount.toString());
        
        // Update the database to persist nudge info (this will also trigger milestones updates)
        await supabase.from('profiles').update({
          last_nudge_at: new Date(nextNudgeTime).toISOString(),
          nudge_count: nextNudgeCount
        }).eq('id', profile.id);
      }
    } catch (err: any) {
      showAlert(translateError(err.message), "error");
    } finally {
      setIsNudging(false);
    }
  };

  const deleteMyOwn = async () => {
    showConfirm(
      <span>
        Möchtest du deine heutigen Antworten wirklich löschen und neu starten?{" "}
        <span className="block mt-2">
          <strong className="text-red-500 dark:text-red-400">Hinweis:</strong> Das Zurücksetzen ist<br /> nur{" "}
          <strong>einmal alle 7 Tage</strong> möglich!
        </span>
      </span>,
      async () => {
        try {
          const { error } = await supabase.rpc('reset_today_answers', {
            day_key_param: dayKey
          });
          if (error) throw new Error(error.message);
          
          if (onRefreshData) {
            await onRefreshData();
          }
          navigate('/questions');
        } catch (err: any) {
          console.error("Fehler beim Zurücksetzen der Antworten:", err);
          showAlert(translateError(err.message), "error");
        }
      },
      { title: "Antworten löschen", confirmLabel: "Ja, löschen", cancelLabel: "Abbrechen" }
    );
  };

  if (!dashboardData) return (
    <div className="animate-entrance flex flex-col flex-1 overflow-hidden relative">
      <div className="flex-1 flex flex-col pt-[72px] pb-20 sm:pb-32 overflow-hidden">
        <div className="relative h-[110px] mb-8 flex flex-col items-center justify-center">
          <div className="flex -space-x-4">
            <div className="w-20 h-20 rounded-[2rem] skeleton border-2 border-white z-20 opacity-70" />
            <div className="w-20 h-20 rounded-[2rem] skeleton border-2 border-white z-10" />
          </div>
        </div>
        <div className="mb-6 space-y-2">
          <div className="w-32 h-7 rounded-xl skeleton" />
          <div className="w-48 h-7 rounded-xl skeleton" />
        </div>
        <div className="space-y-4 mb-8">
          <div className="h-20 rounded-[24px] skeleton" />
          <div className="h-20 rounded-[24px] skeleton" />
        </div>
        <div className="mt-auto pb-6 pt-2"><div className="h-16 rounded-[22px] skeleton" /></div>
      </div>
    </div>
  );

  if (showComparison) {
    return (
      <div className="animate-entrance flex flex-col h-full overflow-hidden relative">

        {/* Header area with solid background + soft bottom edge */}
        <div className="relative z-20 shrink-0">
          <div className="bg-[#F8F7FF] pt-2 pb-2 px-1">
            <button onClick={() => setShowComparison(false)} className="mb-4 text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] flex items-center gap-2 group">
              <span className="group-active:-translate-x-1 transition-transform">←</span> Zurück zum Dashboard
            </button>
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight">Unsere Gedanken</h2>
          </div>
          {/* Soft fade-out edge below header */}
          <div 
            className="h-8 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none"
          />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 relative -mt-8">
          <div className="h-full pr-1 overflow-y-auto scroll-smooth show-scrollbar">
            <div className="space-y-8 pb-40 pt-8">
              {dailyQs.map((q, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-[10px] font-black text-[#8E89AA] tracking-wider mb-3 px-1">{q.q}</div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="res-bubble p-5 border-2 border-[var(--card-border)] rounded-[2rem] bg-white shadow-sm">
                      <b className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] mb-2 block">ICH</b>
                      <span className="font-bold text-xs text-[var(--text-main)] opacity-90 leading-relaxed">{myAnswers[i] || '—'}</span>
                    </div>
                    <div className={`res-bubble p-5 border-2 border-[var(--card-border)] rounded-[2rem] bg-white shadow-sm ${(!partnerAnswered || !partnerAnswers?.[i]) ? 'bg-purple-50/20 border-dashed opacity-60' : ''}`}>
                      <b className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] mb-2 block">{partnerName.toUpperCase()}</b>
                      <span className={`font-bold text-xs text-[var(--text-main)] opacity-90 leading-relaxed ${(!partnerAnswered || !partnerAnswers?.[i]) ? 'text-purple-200 italic' : ''}`}>
                        {(partnerAnswered && partnerAnswers?.[i]) ? partnerAnswers[i] : 'Wartet...'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom button area with solid background + soft top edge */}
        <div className="relative z-20 shrink-0">
          {/* Soft fade-in edge above button */}
          <div 
            className="h-12 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none"
          />
          <div className="bg-[#F8F7FF] pb-6 pt-2 px-1">
            <button onClick={deleteMyOwn} className="btn-secondary w-full text-xs font-black uppercase tracking-widest py-4 border-2 border-[var(--card-border)]">
              Antworten korrigieren 📝
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-entrance flex flex-col flex-1 overflow-hidden relative">
      {((import.meta.env.DEV && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) || localStorage.getItem('bisou_dev_mode') === 'true') && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2">
          <div className="bg-orange-500/15 backdrop-blur-md border border-orange-200/50 py-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm">
            <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[7px] font-black text-orange-600 uppercase tracking-[0.2em] whitespace-nowrap">Dev Mode</span>
          </div>
          <button 
            onClick={() => {
              const current = localStorage.getItem('mock_ios_mode') === 'true';
              localStorage.setItem('mock_ios_mode', (!current).toString());
              window.location.reload();
            }}
            className={`py-1 px-2.5 rounded-full text-[7px] font-black uppercase tracking-[0.1em] shadow-sm border transition-all active:scale-95 ${
              localStorage.getItem('mock_ios_mode') === 'true'
                ? 'bg-purple-600 border-purple-400 text-white'
                : 'bg-white/80 backdrop-blur-sm border-purple-200 text-purple-600 hover:bg-purple-50'
            }`}
          >
            {localStorage.getItem('mock_ios_mode') === 'true' ? 'iOS Mock: AN' : 'iOS Mock: AUS'}
          </button>
        </div>
      )}
      <div 
        className="flex-1 flex flex-col pt-[72px] pb-20 sm:pb-32 overflow-hidden"
        style={{
          paddingTop: 'calc(72px + var(--sat, 0px))',
          paddingBottom: 'calc(80px + var(--sab, 0px))'
        }}
      >
        
        {/* Header: Avatars and Streaks */}
        <div className="flex flex-col items-center mb-8 sm:mb-10 shrink-0">
          <div className="relative flex flex-col items-center">
            {/* Avatars Row with Flame Pills attached */}
            <div className="flex -space-x-4">
              {/* Partner Avatar (on the left, with soft gradient mask on the right edge) */}
              <div 
                className="relative z-20 w-[88px] h-[88px] sm:w-[106px] sm:h-[106px]"
                onMouseEnter={() => setIsPartnerHovered(true)}
                onMouseLeave={() => setIsPartnerHovered(false)}
              >
                {/* Unclipped shadow element behind the masked avatar */}
                <div className="absolute inset-0 rounded-[2.2rem] sm:rounded-[2.6rem] shadow-md pointer-events-none -z-10" />
                <div 
                  onClick={() => {
                    if (!hasPartner) return;
                    setFullscreenImage(partnerAvatar || 'placeholder');
                    setIsFullscreenPartner(true);
                  }}
                  className={`w-full h-full rounded-[2.2rem] sm:rounded-[2.6rem] border-2 border-white flex items-center justify-center overflow-hidden transition-transform active:scale-95 ${hasPartner ? 'bg-white cursor-pointer' : 'bg-purple-50/50 border-dashed border-purple-200'}`}
                  style={{
                    maskImage: isPartnerHovered 
                      ? 'linear-gradient(to right, black 80%, rgba(0,0,0,0.85) 100%)'
                      : 'linear-gradient(to right, black 80%, rgba(0,0,0,0.4) 100%)',
                    WebkitMaskImage: isPartnerHovered 
                      ? 'linear-gradient(to right, black 80%, rgba(0,0,0,0.85) 100%)'
                      : 'linear-gradient(to right, black 80%, rgba(0,0,0,0.4) 100%)',
                  }}
                >
                  {partnerAvatar ? (<img src={partnerAvatar} alt="P" className="w-full h-full object-cover" />) : (<UserIcon className="w-9 h-9 sm:w-11 sm:h-11 text-[var(--secondary)]" />)}
                </div>
                {/* Partner Flame Pill (Bottom Left, slightly overlapping) */}
                <div 
                  onClick={() => hasPartner && setShowStreakModal('partner')}
                  className={`absolute bottom-0 right-[80%] z-30 flex items-center gap-1 px-2.5 py-[3.5px] rounded-full transition-all shadow-sm ${
                    isPartnerStreakFrozen 
                      ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' 
                      : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
                  } ${hasPartner ? 'active:scale-95 cursor-pointer' : 'opacity-40'}`}
                >
                  <span className={`text-[11px] font-black leading-none ${isPartnerStreakFrozen ? 'text-blue-600' : 'text-orange-600'}`}>
                    {hasPartner ? (partnerStreak?.current_streak || 0) : 0}
                  </span>
                  <Flame className={`w-3.5 h-3.5 shrink-0 ${isPartnerStreakFrozen ? 'text-blue-500 fill-blue-500' : 'text-orange-500 fill-orange-500'}`} />
                </div>
              </div>
 
              {/* User Avatar (on the right) */}
              <div className="relative z-10 w-[88px] h-[88px] sm:w-[106px] sm:h-[106px]">
                <div 
                  onClick={() => {
                    setFullscreenImage(userAvatar || 'placeholder');
                    setIsFullscreenPartner(false);
                  }}
                  className="w-full h-full rounded-[2.2rem] sm:rounded-[2.6rem] bg-white border-2 border-white flex items-center justify-center overflow-hidden z-20 shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  {userAvatar ? (<img src={userAvatar} alt="U" className="w-full h-full object-cover" />) : (<UserIcon className="w-9 h-9 sm:w-11 sm:h-11 text-[var(--secondary)]" />)}
                </div>
                {/* User Flame Pill (Bottom Right, slightly overlapping) */}
                <div 
                  onClick={() => setShowStreakModal('user')}
                  className={`absolute bottom-0 left-[80%] z-30 flex items-center gap-1 px-2.5 py-[3.5px] rounded-full active:scale-95 cursor-pointer transition-all shadow-sm ${
                    isMyStreakFrozen
                      ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100'
                      : 'bg-orange-50 border border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 shrink-0 ${isMyStreakFrozen ? 'text-blue-500 fill-blue-500' : 'text-orange-500 fill-orange-500'}`} />
                  <span className={`text-[11px] font-black leading-none ${isMyStreakFrozen ? 'text-blue-600' : 'text-orange-600'}`}>
                    {myStreak?.current_streak || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="mb-6 pl-1 pr-6 relative">
          <div className="float-right w-1/2 h-[1.2em] pointer-events-none" />
          <h2 className="text-xl font-black text-[#1F1939] tracking-tight text-left leading-[1.2]">
            {rawGreeting}, <span className="text-[var(--secondary)]">{capitalizeName(userName)}</span>{isQuestion ? '?' : '!'} ❤️
          </h2>
        </div>
        
        {!hasPartner ? (
          <div className="status-box flex flex-col items-center text-center p-6 mb-2">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-3 text-[var(--secondary)] border border-purple-100"><LinkIcon className="w-6 h-6" /></div>
            <p className="font-black text-base mb-1 text-[var(--text-main)]">Der erste Schritt</p>
            <button onClick={() => navigate('/profile?tab=partner')} className="btn-primary py-2.5 px-6 text-[10px] font-black uppercase tracking-widest w-auto shadow-sm">Bisou-Partner verbinden</button>
          </div>
        ) : (
          <div className="status-box pt-4 px-4 pb-1 mb-2">
            <h3 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] text-center mb-4">Fragen von heute</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`status-dot ${meAnswered ? 'status-green-dot' : 'status-orange-dot'}`} />
                  <span className="font-black text-xs text-[var(--text-main)] uppercase tracking-wide">Ich</span>
                </div>
                <span className={`status-pill ${meAnswered ? 'pill-green' : 'pill-orange'}`}>
                  {meAnswered ? (
                    <>
                      antwort gesendet <span className="ml-1.5 opacity-50 font-bold">{myTime}</span>
                    </>
                  ) : 'noch keine antwort'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`status-dot ${partnerAnswered ? 'status-green-dot' : 'status-orange-dot'}`} />
                  <span className="font-black text-xs text-[var(--text-main)] uppercase tracking-wide">{partnerName}</span>
                </div>
                <span className={`status-pill ${partnerAnswered ? 'pill-green' : 'pill-orange'}`}>
                  {partnerAnswered ? (
                    <>
                      antwort gesendet <span className="ml-1.5 opacity-50 font-bold">{partnerTime}</span>
                    </>
                  ) : 'noch keine antwort'}
                </span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t-2 border-purple-50 flex flex-col gap-5">
              <div className="flex items-start gap-2.5">
                <div className="flex-1 flex flex-col items-center gap-3">
                  <button 
                    onClick={onStartQuestions} 
                    className="w-full btn-static-animated h-12 !p-0 text-xs font-black uppercase tracking-widest shadow-none"
                  >
                    {meAnswered ? "Antworten ansehen ✨" : "Fragen starten ✨"}
                  </button>
                  
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Neue Fragen in:</span>
                    <span className="font-mono font-black text-xs text-[var(--secondary)] tracking-widest">
                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowStatsModal(true)} 
                  className="p-3 bg-purple-50 rounded-[18px] text-[var(--secondary)] active:scale-95 transition-all border-2 border-purple-100 shadow-sm stats-icon-pulse shrink-0"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1 pb-1">
                <svg 
                  className="w-2.5 h-2.5 text-[var(--secondary)] opacity-60" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z"/>
                </svg>
                <p className="text-[7.5px] font-bold text-[var(--muted)] text-center opacity-40">
                  InfiniteFlow
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <StatsModal 
        key={showStatsModal ? 'stats-open' : 'stats-closed'}
        isOpen={showStatsModal} 
        onClose={() => setShowStatsModal(false)} 
        partnerName={partnerName}
        userName={userName}
        stats={stats}
        loading={loadingStats}
      />

      <StreakModal 
        isOpen={!!showStreakModal} 
        onClose={() => setShowStreakModal(null)} 
        myStreakData={myStreak}
        partnerStreakData={partnerStreak}
        initialTab={showStreakModal === 'partner' ? 'partner' : 'user'}
      />

      {fullscreenImage && createPortal(
        <div 
          className="modal-backdrop z-[3000] animate-in fade-in duration-300 flex flex-col items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full max-w-[280px] aspect-square">
              {fullscreenImage === 'placeholder' ? (
                <div className="w-[280px] h-[280px] rounded-[3rem] bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center border-4 border-white/20">
                  <UserIcon className="w-24 h-24 text-[var(--secondary)]" />
                </div>
              ) : (
                <img 
                  src={fullscreenImage} 
                  alt="Fullscreen Avatar" 
                  className="w-[280px] h-[280px] rounded-[3rem] shadow-2xl border-4 border-white/20 object-cover"
                />
              )}
              <button 
                className="absolute -top-12 right-0 p-3 text-white/70 hover:text-white transition-colors"
                onClick={() => setFullscreenImage(null)}
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {isFullscreenPartner && (
              <button
                onClick={handleNudge}
                disabled={isNudging}
                className="px-6 py-3.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest border-none shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isNudging && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Anstupsen 👋</span>
              </button>
            )}

            {!isFullscreenPartner && (
              <button
                onClick={() => {
                  setFullscreenImage(null);
                  navigate('/profile?tab=main&editAvatar=true');
                }}
                className="px-6 py-3.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest border-none shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span>Profilbild ändern 📸</span>
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {import.meta.env.DEV && (
        <button 
          onClick={showTestMilestone}
          className="fixed top-4 left-4 z-[99999] px-3 py-1.5 bg-purple-600/90 hover:bg-purple-700 hover:scale-105 active:scale-95 text-white text-[9px] font-black uppercase rounded-xl shadow-lg transition-all"
        >
          Vorschau Erfolg 🏆
        </button>
      )}
    </div>
  );
}
