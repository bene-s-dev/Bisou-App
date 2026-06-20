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

function StreakModal({ isOpen, onClose, streakData }: { isOpen: boolean, onClose: () => void, streakData: any }) {
  const [viewDate, setViewDate] = useState(new Date());
  
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
              <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">
                Aktueller Streak: {streakData?.current_streak || 0} { (streakData?.current_streak === 1) ? 'Flamme' : 'Flammen' }
              </p>
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
                  <Flame className="w-4 h-4 text-blue-500 fill-blue-500 absolute -top-1.5 -right-1.5 drop-shadow-sm animate-pulse" />
                ) : active ? (
                  <Flame className="w-4 h-4 text-orange-500 fill-orange-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="bg-purple-50 rounded-3xl p-6 text-center border-2 border-purple-100">
          <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">Längster Streak</p>
          <p className="text-2xl font-black text-[var(--secondary)]">
            {streakData?.longest_streak || 0} {(streakData?.longest_streak || 0) === 1 ? 'TAG' : 'TAGE'}
          </p>
        </div>
        
        <p className="text-[9px] font-bold text-[var(--muted)] text-center leading-relaxed mt-4 px-2">
          ❄️ Deine Serie wird 2x im Monat automatisch eingefroren, wenn du einen Tag vergisst. Gefrorene Tage werden mit einer blauen Flamme markiert.
        </p>
      </div>
    </div>,
    document.body
  );
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
      {/* Dev Mode Badge (Visible in local DEV or if user-enabled dev mode in localStorage) */}
      {((import.meta.env.DEV && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) || localStorage.getItem('bisou_dev_mode') === 'true') && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="bg-orange-500/15 backdrop-blur-md border border-orange-200/50 py-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm">
            <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[7px] font-black text-orange-600 uppercase tracking-[0.2em] whitespace-nowrap">Dev Mode</span>
          </div>
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
                  onClick={() => partnerAvatar && setFullscreenImage(partnerAvatar)}
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
                  className={`absolute bottom-0 right-[80%] z-30 flex items-center gap-[3px] px-1.5 py-[2px] rounded-full transition-all shadow-sm ${
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
                  onClick={() => userAvatar && setFullscreenImage(userAvatar)}
                  className="w-full h-full rounded-[2.2rem] sm:rounded-[2.6rem] bg-white border-2 border-white flex items-center justify-center overflow-hidden z-20 shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  {userAvatar ? (<img src={userAvatar} alt="U" className="w-full h-full object-cover" />) : (<UserIcon className="w-9 h-9 sm:w-11 sm:h-11 text-[var(--secondary)]" />)}
                </div>
                {/* User Flame Pill (Bottom Right, slightly overlapping) */}
                <div 
                  onClick={() => setShowStreakModal('user')}
                  className={`absolute bottom-0 left-[80%] z-30 flex items-center gap-[3px] px-1.5 py-[2px] rounded-full active:scale-95 cursor-pointer transition-all shadow-sm ${
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
        streakData={showStreakModal === 'user' ? myStreak : partnerStreak}
      />

      {fullscreenImage && createPortal(
        <div 
          className="modal-backdrop z-[3000] animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative w-full max-w-[280px] aspect-square animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
            <img 
              src={fullscreenImage} 
              alt="Fullscreen Avatar" 
              className="w-full h-full rounded-[3rem] shadow-2xl border-4 border-white/20 object-cover"
            />
            <button 
              className="absolute -top-12 right-0 p-3 text-white/70 hover:text-white transition-colors"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
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
