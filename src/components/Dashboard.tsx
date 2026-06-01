import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { GREETINGS, Question } from '../constants/questions';
import { User as UserIcon, Lock, Heart as HeartIcon, Clock, Sparkles, Flame, X, ChevronLeft, ChevronRight, Link as LinkIcon, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDailyKey, getTimeUntilReset } from '../lib/dateUtils';
import { useDialog } from './DialogProvider';

interface DashboardProps {
  userName: string;
  userAvatar?: string;
  partnerName: string;
  partnerAvatar?: string | null;
  partnerId?: string | null;
  dashboardData: any;
  onStartQuestions: () => void;
}

const getTimeIcon = (hour: number) => {
  if (hour >= 5 && hour < 11) return '☕️';
  if (hour >= 11 && hour < 14) return '☀️';
  if (hour >= 14 && hour < 18) return '🌤️';
  if (hour >= 18 && hour < 22) return '🌙';
  return '🦉';
};

const getTimeLabel = (hour: number) => {
  if (hour >= 5 && hour < 11) return 'Morgens';
  if (hour >= 11 && hour < 14) return 'Mittags';
  if (hour >= 14 && hour < 18) return 'Nachmittags';
  if (hour >= 18 && hour < 22) return 'Abends';
  return 'Nachts';
};

function StatsModal({ isOpen, onClose, partnerId, partnerName, userName }: { isOpen: boolean, onClose: () => void, partnerId: string, partnerName: string, userName: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalAnswers: number;
    agreementRate: number;
    myHabit: number;
    partnerHabit: number;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !partnerId) return;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: answers } = await supabase
        .from('answers')
        .select('*')
        .gte('day_key', dateStr)
        .in('user_id', [session.user.id, partnerId]);

      if (!answers) return;

      const myAnswers = answers.filter(a => a.user_id === session.user.id);
      const partnerAnswers = answers.filter(a => a.user_id === partnerId);

      // 1. Total Questions (Days where both answered)
      const daysWithBoth = myAnswers.filter(ma => 
        partnerAnswers.some(pa => pa.day_key === ma.day_key)
      );

      // 2. Agreement Rate (Only on Question 1 - TOT)
      let agreements = 0;
      daysWithBoth.forEach(ma => {
        const pa = partnerAnswers.find(p => p.day_key === ma.day_key);
        if (pa) {
          const myQ1 = ma.choice.split(' | ')[0];
          const partnerQ1 = pa.choice.split(' | ')[0];
          if (myQ1 === partnerQ1) agreements++;
        }
      });

      // 3. Habits (Avg Hour)
      const getAvgHour = (ans: any[]) => {
        if (ans.length === 0) return 0;
        const totalHours = ans.reduce((acc, a) => {
          const hour = new Date(a.created_at).getHours();
          return acc + hour;
        }, 0);
        return Math.round(totalHours / ans.length);
      };

      setStats({
        totalAnswers: daysWithBoth.length,
        agreementRate: daysWithBoth.length > 0 ? Math.round((agreements / daysWithBoth.length) * 100) : 0,
        myHabit: getAvgHour(myAnswers),
        partnerHabit: getAvgHour(partnerAnswers)
      });
    } catch (err) {
      console.error("Stats error:", err);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open to avoid showing old data before skeleton
      setLoading(true);
      setStats(null);
      
      const timer = setTimeout(() => {
        fetchStats();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4 will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-8 will-change-transform contain-layout">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-lg leading-tight">Eure Bisou-Statistik</h3>
              <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">Die letzten 30 Tage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-[92px] rounded-3xl skeleton" />
              <div className="h-[92px] rounded-3xl skeleton" />
            </div>
            <div className="bg-white border-2 border-purple-50 rounded-3xl p-6">
              <div className="w-32 h-3 rounded-full skeleton mb-6" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-[120px] rounded-2xl skeleton" />
                <div className="h-[120px] rounded-2xl skeleton" />
              </div>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100">
                <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">Gemeinsam Aktiv</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[var(--secondary)]">{stats.totalAnswers}</span>
                  <span className="text-[10px] font-bold text-[#4A4468]">Tage</span>
                </div>
              </div>
              <div className="bg-orange-50 rounded-3xl p-5 border border-orange-100">
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-2">Übereinstimmung</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-orange-500">{stats.agreementRate}%</span>
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-purple-50 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[var(--secondary)]" />
                <h4 className="text-[10px] font-black text-[#1F1939] uppercase tracking-widest">Antwort-Gewohnheiten</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center justify-center py-4 px-2 bg-purple-50 rounded-2xl border-2 border-purple-100 text-center">
                  <span className="text-2xl mb-1">{getTimeIcon(stats.myHabit)}</span>
                  <span className="text-lg font-black text-[#1F1939]">{stats.myHabit}:00</span>
                  <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.1em] mt-2">{userName.split(' ')[0]}</span>
                  <span className="text-[9px] font-bold text-[var(--muted)] mt-0.5">{getTimeLabel(stats.myHabit)}</span>
                </div>
                <div className="flex flex-col items-center justify-center py-4 px-2 bg-orange-50 rounded-2xl border-2 border-orange-100 text-center">
                  <span className="text-2xl mb-1">{getTimeIcon(stats.partnerHabit)}</span>
                  <span className="text-lg font-black text-[#1F1939]">{stats.partnerHabit}:00</span>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.1em] mt-2">{partnerName.split(' ')[0]}</span>
                  <span className="text-[9px] font-bold text-[var(--muted)] mt-0.5">{getTimeLabel(stats.partnerHabit)}</span>
                </div>
              </div>
              <p className="text-[9px] font-bold text-[var(--muted)] mt-4 text-center italic opacity-60">Durchschnittliche Uhrzeit eurer Antworten</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm font-bold text-[#4A4468]">Keine Daten für Statistiken verfügbar.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function StreakModal({ isOpen, onClose, streakData, partnerName }: { isOpen: boolean, onClose: () => void, streakData: any, partnerName: string }) {
  const [viewDate, setViewDate] = useState(new Date());
  
  if (!isOpen) return null;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });

  const history = streakData?.streak_history || [];
  
  const isDateActive = (day: number) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${date}`;
    return history.includes(dateStr);
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
            return (
              <div key={day} className={`aspect-square rounded-xl flex items-center justify-center relative transition-all ${active ? 'bg-orange-50 border-2 border-orange-100' : 'bg-gray-50 border-2 border-transparent'}`}>
                <span className={`text-[10px] font-black ${active ? 'text-orange-500' : 'text-[#8E89AA]'}`}>{day}</span>
                {active && <Flame className="w-4 h-4 text-orange-500 fill-orange-500 absolute -top-1.5 -right-1.5 drop-shadow-sm" />}
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
  onStartQuestions 
}: DashboardProps) {
  const { showAlert, showConfirm } = useDialog();
  const [showComparison, setShowComparison] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isPartnerHovered, setIsPartnerHovered] = useState(false);

  const navigate = useNavigate();
  const dayKey = getDailyKey();
  const hasPartner = !!partnerId;

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
    const { answers, questions, streaks } = dashboardData;
    const me = answers.find((a: any) => a.user_id !== partnerId);
    const other = partnerId ? answers.find((a: any) => a.user_id === partnerId) : null;
    
    // Explicitly identify streaks
    const myS = streaks?.find((s: any) => s.user_id !== partnerId);
    const pS = partnerId ? streaks?.find((s: any) => s.user_id === partnerId) : null;

    return {
      meAnswered: !!me,
      partnerAnswered: !!other,
      myAnswers: me ? me.choice.split(" [")[0].split(" | ") : [],
      partnerAnswers: other ? other.choice.split(" [")[0].split(" | ") : null,
      dailyQs: questions as Question[],
      myStreak: myS,
      partnerStreak: pS,
      myTime: me ? new Date(me.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null,
      partnerTime: other ? new Date(other.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null
    };
  }, [dashboardData, partnerId]);

  const deleteMyOwn = async () => {
    showConfirm(
      "Möchtest du deine heutigen Antworten wirklich löschen und neu starten?",
      async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await supabase.from('answers').delete().eq('day_key', dayKey).eq('user_id', user.id);
        } catch (err) {
          showAlert("Fehler beim Löschen der Antworten.", "error");
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
                  <div className="text-[10px] font-black text-[#8E89AA] uppercase tracking-[0.2em] mb-3 px-1">{q.q}</div>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="res-bubble p-5 border-2 border-[var(--card-border)] rounded-[2rem] bg-white shadow-sm">
                      <b className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] mb-2 block">ICH</b>
                      <span className="font-bold text-xs text-[var(--text-main)] leading-relaxed">{myAnswers[i] || '—'}</span>
                    </div>
                    <div className={`res-bubble p-5 border-2 border-[var(--card-border)] rounded-[2rem] bg-white shadow-sm ${!partnerAnswered ? 'bg-purple-50/20 border-dashed opacity-60' : ''}`}>
                      <b className="text-[9px] font-black text-[#8E89AA] uppercase tracking-[0.2em] mb-2 block">{partnerName.toUpperCase()}</b>
                      <span className={`font-bold text-xs text-[var(--text-main)] leading-relaxed ${!partnerAnswered ? 'text-purple-200 italic' : ''}`}>
                        {partnerAnswered ? partnerAnswers?.[i] : 'Wartet...'}
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
      <div className="flex-1 flex flex-col pt-[72px] pb-20 sm:pb-32 overflow-hidden">
        
        {/* Header: Avatars and Streaks */}
        <div className="flex flex-col items-center mb-5 sm:mb-7 shrink-0">
          <div className="relative flex flex-col items-center">
            {/* Avatars Row with Flame Pills attached */}
            <div className="flex -space-x-4">
              {/* Partner Avatar (on the left, with soft gradient mask on the right edge) */}
              <div 
                className="relative z-20 w-20 h-20 sm:w-24 sm:h-24"
                onMouseEnter={() => setIsPartnerHovered(true)}
                onMouseLeave={() => setIsPartnerHovered(false)}
              >
                {/* Unclipped shadow element behind the masked avatar */}
                <div className="absolute inset-0 rounded-[2rem] sm:rounded-[2.4rem] shadow-md pointer-events-none -z-10" />
                <div 
                  onClick={() => partnerAvatar && setFullscreenImage(partnerAvatar)}
                  className={`w-full h-full rounded-[2rem] sm:rounded-[2.4rem] border-2 border-white flex items-center justify-center overflow-hidden transition-transform active:scale-95 ${hasPartner ? 'bg-white cursor-pointer' : 'bg-purple-50/50 border-dashed border-purple-200'}`}
                  style={{
                    maskImage: isPartnerHovered 
                      ? 'linear-gradient(to right, black 80%, rgba(0,0,0,0.85) 100%)'
                      : 'linear-gradient(to right, black 80%, rgba(0,0,0,0.4) 100%)',
                    WebkitMaskImage: isPartnerHovered 
                      ? 'linear-gradient(to right, black 80%, rgba(0,0,0,0.85) 100%)'
                      : 'linear-gradient(to right, black 80%, rgba(0,0,0,0.4) 100%)',
                  }}
                >
                  {partnerAvatar ? (<img src={partnerAvatar} alt="P" className="w-full h-full object-cover" />) : (<UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--secondary)]" />)}
                </div>
                {/* Partner Flame Pill (Bottom Left, slightly overlapping) */}
                <div 
                  onClick={() => hasPartner && setShowStreakModal('partner')}
                  className={`absolute bottom-0 right-[85%] z-30 flex items-center gap-1 px-2.5 py-1 bg-orange-50 border-2 border-orange-100 rounded-full transition-all shadow-sm ${hasPartner ? 'active:scale-95 cursor-pointer hover:bg-orange-100' : 'opacity-40'}`}
                >
                  <span className="text-[11px] font-black text-orange-600">{hasPartner ? (partnerStreak?.current_streak || 0) : 0}</span>
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                </div>
              </div>

              {/* User Avatar (on the right) */}
              <div className="relative z-10">
                <div 
                  onClick={() => userAvatar && setFullscreenImage(userAvatar)}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] sm:rounded-[2.4rem] bg-white border-2 border-white flex items-center justify-center overflow-hidden z-20 shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  {userAvatar ? (<img src={userAvatar} alt="U" className="w-full h-full object-cover" />) : (<UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--secondary)]" />)}
                </div>
                {/* User Flame Pill (Bottom Right, slightly overlapping) */}
                <div 
                  onClick={() => setShowStreakModal('user')}
                  className="absolute bottom-0 left-[85%] z-30 flex items-center gap-1 px-2.5 py-1 bg-orange-50 border-2 border-orange-100 rounded-full active:scale-95 cursor-pointer hover:bg-orange-100 transition-all shadow-sm"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                  <span className="text-[11px] font-black text-orange-600">{myStreak?.current_streak || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center w-full mt-3 px-2">
              <div className="w-1/2 flex justify-end pr-0 min-w-0">
                <span className="text-[10px] font-black text-[#4A4468] uppercase tracking-[0.1em] text-center min-w-[80px] sm:min-w-[96px] -mr-2 whitespace-nowrap">
                  {partnerName}
                </span>
              </div>
              <div className="w-1/2 flex justify-start pl-0 min-w-0">
                <span className="text-[10px] font-black text-[#4A4468] uppercase tracking-[0.1em] text-center min-w-[80px] sm:min-w-[96px] -ml-2 whitespace-nowrap">
                  {userName || 'Ich'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="mb-6 pl-1 pr-6 relative">
          <div className="float-right w-1/2 h-[1.2em] pointer-events-none" />
          <h2 className="text-xl font-black text-[#1F1939] tracking-tight text-left leading-[1.2]">
            {rawGreeting}, <span className="text-[var(--secondary)]">{userName}</span>{isQuestion ? '?' : '!'} ❤️
          </h2>
        </div>
        
        {!hasPartner ? (
          <div className="status-box flex flex-col items-center text-center p-6 mb-2">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-3 text-[var(--secondary)] border border-purple-100"><LinkIcon className="w-6 h-6" /></div>
            <p className="font-black text-base mb-1 text-[var(--text-main)]">Der erste Schritt</p>
            <button onClick={() => navigate('/profile?tab=partner')} className="btn-primary py-2.5 px-6 text-[10px] font-black uppercase tracking-widest w-auto shadow-sm">Bisou-Partner verbinden</button>
          </div>
        ) : (
          <div className="status-box pt-4 px-4 pb-3 mb-2">
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

            <div className="pt-4 mt-4 border-t-2 border-purple-50 flex flex-col gap-3">
              <button 
                onClick={onStartQuestions} 
                className="w-full btn-static h-12 !p-0 text-xs font-black uppercase tracking-widest shadow-none"
              >
                {meAnswered ? "Antworten ansehen ✨" : "Fragen starten"}
              </button>

              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                    <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Neue Fragen in:</span>
                    <span className="font-mono font-black text-xs text-[var(--secondary)] tracking-widest ml-1">
                      {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>

                  <button 
                    onClick={() => setShowStatsModal(true)} 
                    className="p-2 bg-purple-50 rounded-xl text-[var(--secondary)] active:scale-95 transition-all border border-purple-100 shadow-sm"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <StatsModal 
        isOpen={showStatsModal} 
        onClose={() => setShowStatsModal(false)} 
        partnerId={partnerId || ''} 
        partnerName={partnerName}
        userName={userName}
      />

      <StreakModal 
        isOpen={!!showStreakModal} 
        onClose={() => setShowStreakModal(null)} 
        streakData={showStreakModal === 'user' ? myStreak : partnerStreak}
        partnerName={partnerName}
      />

      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-full max-h-full animate-in zoom-in-95 duration-300">
            <img 
              src={fullscreenImage} 
              alt="Fullscreen Avatar" 
              className="max-w-full max-h-[80vh] rounded-[3rem] shadow-2xl border-4 border-white/20 object-contain"
            />
            <button 
              className="absolute -top-12 right-0 p-3 text-white/70 hover:text-white transition-colors"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
