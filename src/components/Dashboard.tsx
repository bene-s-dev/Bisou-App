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
    if (isOpen) fetchStats();
  }, [isOpen, fetchStats]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-lg leading-tight">Beziehungs-Statistik</h3>
              <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">Die letzten 30 Tage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-purple-100 border-t-[var(--secondary)] rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Analysiere Daten...</p>
          </div>
        ) : stats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100">
                <p className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">Gemeinsame Fragen</p>
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
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A4468]">{userName.split(' ')[0]}</span>
                  <span className="text-xs font-black text-[var(--secondary)]">{stats.myHabit}:00 Uhr</span>
                </div>
                <div className="w-full h-1.5 bg-purple-50 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--secondary)] rounded-full" style={{ width: `${(stats.myHabit / 24) * 100}%` }} />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#4A4468]">{partnerName.split(' ')[0]}</span>
                  <span className="text-xs font-black text-[var(--secondary)]">{stats.partnerHabit}:00 Uhr</span>
                </div>
                <div className="w-full h-1.5 bg-purple-50 rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${(stats.partnerHabit / 24) * 100}%` }} />
                </div>
              </div>
              <p className="text-[9px] font-bold text-[var(--muted)] mt-4 text-center italic opacity-60">Durchschnittliche Uhrzeit eurer Antworten</p>
            </div>
            
            <button onClick={onClose} className="btn-action py-4 text-xs mt-4">Alles klar! ✨</button>
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
    const dateStr = d.toISOString().split('T')[0];
    return history.includes(dateStr);
  };

  return createPortal(
    <div className="modal-backdrop px-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-8">
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
                {active && <Flame className="w-2 h-2 text-orange-500 fill-orange-500 absolute -top-1 -right-1" />}
              </div>
            );
          })}
        </div>

        <div className="bg-purple-50 rounded-3xl p-6 text-center border-2 border-purple-100">
          <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-1">Längster Streak</p>
          <p className="text-2xl font-black text-[var(--secondary)]">{streakData?.longest_streak || 0} TAGE</p>
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

  const { meAnswered, partnerAnswered, myAnswers, partnerAnswers, dailyQs, myStreak, partnerStreak } = useMemo(() => {
    if (!dashboardData) return { meAnswered: false, partnerAnswered: false, myAnswers: [], partnerAnswers: [], dailyQs: [], myStreak: null, partnerStreak: null };
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
      partnerStreak: pS
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
    <div className="flex-1 flex flex-col animate-entrance">
      <div className="relative h-[110px] mb-8 flex flex-col items-center justify-center">
        <div className="flex -space-x-4">
          <div className="w-20 h-20 rounded-[2rem] skeleton border-2 border-white z-20" />
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
  );

  if (showComparison) {
    return (
      <div className="animate-entrance flex flex-col h-full overflow-visible">
        <div className="flex-1 overflow-visible flex flex-col">
          <button onClick={() => setShowComparison(false)} className="mb-8 text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] flex items-center gap-2 group">
            <span className="group-active:-translate-x-1 transition-transform">←</span> Zurück zum Dashboard
          </button>
          <h2 className="text-3xl font-black mb-8 text-[#1F1939] tracking-tight">Unsere Gedanken</h2>
          <div className="space-y-8 flex-1 overflow-visible">
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
        <div className="pb-6 pt-6">
          <button onClick={deleteMyOwn} className="btn-secondary w-full text-xs font-black uppercase tracking-widest py-4 border-2 border-[var(--card-border)]">
            Antworten korrigieren 📝
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-entrance flex flex-col flex-1 overflow-y-auto scrollbar-hide">
      <div className="flex-1 flex flex-col pt-8 pb-32">
        
        {/* Header: Avatars and Streaks */}
        <div className="flex flex-col items-center mb-8 shrink-0">
          {/* Avatars Row */}
          <div className="flex -space-x-4 mb-5">
            <div 
              onClick={() => partnerAvatar && setFullscreenImage(partnerAvatar)}
              className={`w-20 h-20 rounded-[2.2rem] border-2 border-white flex items-center justify-center overflow-hidden z-20 shadow-md transition-transform active:scale-95 ${hasPartner ? 'bg-white cursor-pointer' : 'bg-purple-50/50 border-dashed border-purple-200'}`}
            >
              {partnerAvatar ? (<img src={partnerAvatar} alt="P" className="w-full h-full object-cover" />) : (<UserIcon className="w-8 h-8 text-[var(--secondary)]" />)}
            </div>
            <div 
              onClick={() => userAvatar && setFullscreenImage(userAvatar)}
              className="w-20 h-20 rounded-[2.2rem] bg-white border-2 border-white flex items-center justify-center overflow-hidden z-10 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              {userAvatar ? (<img src={userAvatar} alt="U" className="w-full h-full object-cover" />) : (<UserIcon className="w-8 h-8 text-[var(--secondary)]" />)}
            </div>
          </div>

          {/* Names and Flames Row - Centered under Avatars */}
          <div className="w-full flex justify-center pt-2">
            <div className="flex w-40 justify-center"> {/* Width matches combined avatars area */}
              {/* Partner side (Left) */}
              <div className="flex-1 flex flex-col items-center min-w-0">
                <div 
                  onClick={() => hasPartner && setShowStreakModal('partner')}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-xl transition-all ${hasPartner ? 'active:scale-95 cursor-pointer hover:bg-orange-50/50' : 'opacity-40'}`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                  <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.1em] truncate max-w-[50px]">
                    {partnerName.split(' ')[0]}
                  </span>
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                </div>
                {hasPartner && (
                  <span className="text-[9px] font-black text-orange-600 mt-0.5">{partnerStreak?.current_streak || 0}</span>
                )}
              </div>

              {/* User side (Right) */}
              <div className="flex-1 flex flex-col items-center min-w-0">
                <div 
                  onClick={() => setShowStreakModal('user')}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl active:scale-95 cursor-pointer hover:bg-orange-50/50 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                  <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.1em] truncate max-w-[50px]">
                    {(userName || 'Ich').split(' ')[0]}
                  </span>
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                </div>
                <span className="text-[9px] font-black text-orange-600 mt-0.5">{myStreak?.current_streak || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Greeting Section */}
        <div className="mb-6 px-6">
          <h2 className="text-2xl font-black text-[#1F1939] leading-[1.1] tracking-tight text-left">
            {greeting},<br />
            <span className="text-[var(--secondary)]">{userName}</span>! ❤️
          </h2>
        </div>
        
        {!hasPartner ? (
          <div className="status-box flex flex-col items-center text-center p-6 mb-2">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-3 text-[var(--secondary)] border border-purple-100"><LinkIcon className="w-6 h-6" /></div>
            <p className="font-black text-base mb-1 text-[var(--text-main)]">Der erste Schritt</p>
            <button onClick={() => navigate('/profile?tab=partner')} className="btn-action py-2.5 px-6 text-[10px] font-black uppercase tracking-widest w-auto shadow-sm">Bisou-Partner verbinden</button>
          </div>
        ) : (
          <div className="status-box p-4 mb-2">
            <h3 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] text-center mb-4">Fragen von heute</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`status-dot ${meAnswered ? 'status-green' : 'status-red'}`} />
                  <span className="font-black text-xs text-[var(--text-main)] uppercase tracking-wide">Meine Antwort</span>
                </div>
                <span className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border-2 ${meAnswered ? 'bg-green-50 text-[var(--accent-green)] border-green-100' : 'bg-red-50 text-[var(--primary)] border-red-100'}`}>
                  {meAnswered ? 'Fertig' : 'Offen'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`status-dot ${partnerAnswered ? 'status-green' : 'status-orange'}`} />
                  <span className="font-black text-xs text-[var(--text-main)] uppercase tracking-wide">{partnerName}</span>
                </div>
                <span className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border-2 ${partnerAnswered ? 'bg-green-50 text-[var(--accent-green)] border-green-100' : 'bg-orange-50 text-orange-500 border-orange-100'}`}>
                  {partnerAnswered ? 'Fertig' : 'Wartet'}
                </span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t-2 border-purple-50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-widest">Neue Fragen in:</span>
                </div>
                <span className="font-mono font-black text-xs text-[var(--secondary)] tracking-widest">
                  {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                </span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={onStartQuestions} 
                  className="flex-1 btn-action py-3 text-xs font-black uppercase tracking-widest shadow-md"
                >
                  {meAnswered ? "Antworten ansehen ✨" : "Fragen starten"}
                </button>
                <button 
                  onClick={() => setShowStatsModal(true)} 
                  className="w-12 h-12 bg-white border-2 border-purple-100 rounded-2xl flex items-center justify-center text-[var(--secondary)] shadow-sm active:scale-95 transition-all"
                  title="Statistiken"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>
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
