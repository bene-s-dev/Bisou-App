import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, MessageCircle, User as UserIcon, Lock, LogOut, Sun, Moon } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate, NavLink } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Import modular components
import PublicLayout from './components/PublicLayout';
import LoadingSkeleton from './components/LoadingSkeleton';
import ScalingContainer from './components/ScalingContainer';

// Lazy load modular page components for Code Splitting (saves bandwidth)
const LandingPage = React.lazy(() => import('./landingpage/LandingPage'));
const Login = React.lazy(() => import('./components/Login'));
const Intro = React.lazy(() => import('./components/Intro'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const Questions = React.lazy(() => import('./components/Questions'));
const Profile = React.lazy(() => import('./components/Profile'));
import ResetPassword from './components/ResetPassword';
import { getDailyKey, isStreakActive } from './lib/dateUtils';
import { FALLBACK_QUESTIONS } from './constants/questions';
import { DialogProvider, useDialog } from './components/DialogProvider';

// Create a safe broadcast channel wrapper to prevent crashes in restricted environments (e.g. iOS in-app browsers)
class SafeAuthChannel {
  private channel: BroadcastChannel | null = null;

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('bisou_auth_sync');
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or restricted in this environment:', e);
    }
  }

  postMessage(message: any) {
    try {
      this.channel?.postMessage(message);
    } catch (e) {
      console.warn('Failed to postMessage on BroadcastChannel:', e);
    }
  }

  addEventListener(type: string, listener: (e: any) => void) {
    try {
      this.channel?.addEventListener(type, listener);
    } catch (e) {
      console.warn('Failed to addEventListener on BroadcastChannel:', e);
    }
  }

  removeEventListener(type: string, listener: (e: any) => void) {
    try {
      this.channel?.removeEventListener(type, listener);
    } catch (e) {
      console.warn('Failed to removeEventListener on BroadcastChannel:', e);
    }
  }
}

const authChannel = new SafeAuthChannel();

// Separate Layout component to prevent remounting on navigation
function AppLayout({ 
  children, 
  profile, 
  partnerProfile,
  showLockedModal,
  setShowLockedModal,
  onLogout
}: { 
  children: React.ReactNode; 
  profile: any; 
  partnerProfile: any;
  showLockedModal: boolean;
  setShowLockedModal: (val: boolean) => void;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert } = useDialog();

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_dark_mode') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setIsDarkMode(localStorage.getItem('app_dark_mode') === 'true');
    };
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_dark_mode') handleToggle();
    };
    
    window.addEventListener('dark-mode-toggle', handleToggle);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('dark-mode-toggle', handleToggle);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const isPublicPath = ['/', '/signin', '/signup', '/reset-password'].includes(location.pathname);
  const showHeader = ['/profile', '/dashboard', '/questions', '/intro', '/intro-replay'].includes(location.pathname);

  useEffect(() => {
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    
    if (isDarkMode && !isPublicPath) {
      document.documentElement.classList.add('dark');
      themeMetas.forEach(meta => meta.setAttribute('content', '#0C0A15'));
    } else {
      document.documentElement.classList.remove('dark');
      themeMetas.forEach(meta => meta.setAttribute('content', '#F8F7FF'));
    }
  }, [isDarkMode, isPublicPath]);

  if (!profile.intro_completed && location.pathname !== '/intro') {
    return <Navigate to="/intro" replace />;
  }

  return (
    <div className={`h-full w-screen overflow-hidden relative text-[#1F1939] bg-[var(--bg)] flex flex-col transition-colors duration-300 ${(isDarkMode && !isPublicPath) ? 'dark' : ''}`}>
      <main 
        className={`flex-1 flex flex-col relative z-10 mx-auto w-full px-6 pwa-main-container ${isPublicPath ? 'max-w-5xl' : 'max-w-[460px]'} ${profile.intro_completed ? 'pb-0' : 'pb-8'} ${['/dashboard', '/profile', '/questions', '/intro', '/intro-replay'].includes(location.pathname) ? 'overflow-hidden' : 'overflow-y-auto scrollbar-soft'}`}
      >
        <ScalingContainer targetWidth={400} align="top">
          <div className={`flex-1 flex flex-col relative w-full h-full ${location.pathname === '/questions' ? '' : 'px-4'}`}>
            {showHeader && (
              <>
                <header className="absolute left-0 right-0 top-0 z-20 px-2 pointer-events-none pwa-app-header">
                  <div className="flex items-start justify-between">
                    <button 
                      onClick={() => navigate('/')}
                      className="group transition-transform active:scale-95 pointer-events-auto"
                    >
                      <h1 className="text-2xl font-semibold text-[var(--text-main)] tracking-tight group-hover:text-[var(--primary)] transition-colors select-none" style={{ fontFamily: 'Fraunces, serif' }}>
                        Bisou
                      </h1>
                    </button>

                    {location.pathname === '/profile' && (
                      <div className="flex items-center gap-3 pointer-events-auto">
                        {/* Theme Toggle Button */}
                        <button
                          onClick={() => {
                            const nextMode = !isDarkMode;
                            localStorage.setItem('app_dark_mode', String(nextMode));
                            window.dispatchEvent(new Event('dark-mode-toggle'));
                            showAlert(nextMode ? "Dunkler Modus aktiviert 🌙" : "Heller Modus aktiviert ☀️", "success");
                          }}
                          className="flex flex-col items-center gap-1 group"
                          title={isDarkMode ? "Heller Modus" : "Dunkler Modus"}
                        >
                          <div className="p-2 rounded-full bg-white border border-[var(--card-border)] text-[var(--secondary)] shadow-sm hover:bg-purple-50/30 transition-all active:scale-90 flex items-center justify-center">
                            {isDarkMode ? (
                              <Sun className="w-4 h-4 text-amber-500 animate-in spin-in-12 duration-300" />
                            ) : (
                              <Moon className="w-4 h-4 text-indigo-500 animate-in spin-in-12 duration-300" />
                            )}
                          </div>
                          <span className="text-[7px] font-black uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--secondary)] leading-none">
                            {isDarkMode ? "Hell" : "Dunkel"}
                          </span>
                        </button>

                        {/* Logout Button */}
                        <button 
                          onClick={onLogout} 
                          className="flex flex-col items-center gap-1 group"
                          title="Abmelden"
                        >
                          <div className="p-2 rounded-full bg-white border border-red-100 text-[var(--primary)] shadow-sm hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
                              <LogOut className="w-4 h-4" />
                          </div>
                          <span className="text-[7px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-600 leading-none">Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </header>
              </>
            )}
            {children}
          </div>
        </ScalingContainer>
      </main>

      {/* Blurry fade transition at the bottom */}
      {profile.intro_completed && !['/intro', '/intro-replay', '/questions'].includes(location.pathname) && (
        <div 
          className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF]/95 to-transparent pointer-events-none z-[90]" 
          style={{ 
            maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.8) 40%, transparent 100%)'
          }}
        />
      )}

      {profile.intro_completed && !['/intro', '/intro-replay'].includes(location.pathname) && (
        <nav className="nav-dock">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <Home className="w-6 h-6" />
            <span className="nav-label">Start</span>
          </NavLink>

          {profile.partner_id ? (
            <NavLink to="/questions" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <MessageCircle className="w-6 h-6" />
              <span className="nav-label">Fragen&Antworten</span>
            </NavLink>
          ) : (
            <div 
              onClick={() => setShowLockedModal(true)}
              className="nav-item cursor-pointer"
            >
              <Lock className="w-6 h-6 text-red-500" />
              <span className="nav-label">Fragen&Antworten</span>
            </div>
          )}

          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <UserIcon className="w-6 h-6" />
            <span className="nav-label">Profil</span>
          </NavLink>
        </nav>
      )}

      {showLockedModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowLockedModal(false)} />
          <div className="modal-content p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Lock className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 tracking-tight">Bereich gesperrt</h3>
            <p className="text-sm text-[#4A4468] font-semibold leading-relaxed mb-8 px-4">
              Du kannst den Fragenbereich nur mit einem <span className="text-[var(--secondary)] font-black">Bisou-Partner</span> öffnen.
            </p>
            <button onClick={() => { setShowLockedModal(false); navigate('/profile'); }} className="btn-static py-4 text-base font-black">Zum Profil ✨</button>            <button onClick={() => setShowLockedModal(false)} className="w-full mt-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[#1F1939] transition-colors py-2">Schließen</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_dark_mode') === 'true');

  // One-time cache buster: clear stale question cache when app version changes
  useEffect(() => {
    const APP_VERSION = 'v3-wwe'; // bump this string on breaking question schema changes
    const storedVersion = localStorage.getItem('app_cache_version');
    if (storedVersion !== APP_VERSION) {
      localStorage.removeItem('last_question_day_key');
      localStorage.removeItem('last_question_fetch');
      localStorage.setItem('app_cache_version', APP_VERSION);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setIsDarkMode(localStorage.getItem('app_dark_mode') === 'true');
    };
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_dark_mode') handleToggle();
    };
    
    window.addEventListener('dark-mode-toggle', handleToggle);
    window.addEventListener('storage', handleStorage);
    
    return () => {
      window.removeEventListener('dark-mode-toggle', handleToggle);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);
  const [profile, setProfile] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [partnerProfile, setPartnerProfile] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_partner_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [dashboardData, setDashboardData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_dashboard_data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);

  const fetchLock = React.useRef<string | null>(null);
  const initialLoadDone = React.useRef(false);
  const lastFetchTimestamp = React.useRef<number>(Date.now());
  const navigate = useNavigate();
  const location = useLocation();
  const [dayKey, setDayKey] = useState(getDailyKey);
  const dayKeyRef = useRef(dayKey);

  useEffect(() => {
    dayKeyRef.current = dayKey;
  }, [dayKey]);

  // Root-level dark mode manager
  useEffect(() => {
    const isPublicPath = ['/', '/signin', '/signup', '/reset-password'].includes(location.pathname);
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    
    if (isDarkMode && !isPublicPath) {
      document.documentElement.classList.add('dark');
      themeMetas.forEach(meta => meta.setAttribute('content', '#0C0A15'));
    } else {
      document.documentElement.classList.remove('dark');
      themeMetas.forEach(meta => meta.setAttribute('content', '#F8F7FF'));
    }
  }, [isDarkMode, location.pathname]);

  useEffect(() => {
    // If it was captured early, use it
    if ((window as any).deferredPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const customHandler = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('pwa-install-prompt', customHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('pwa-install-prompt', customHandler);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      // Mark intro as completed so the PWA doesn't restart the intro on first launch
      if (session) {
        setProfile(prev => prev ? { ...prev, intro_completed: true } : null);
        await supabase.from('profiles').update({ intro_completed: true }).eq('id', session.user.id);
      }
    }
  };

  const recoverLocalAnswers = useCallback(async (userId: string) => {
    try {
      const dayKeys: string[] = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        const parts = formatter.formatToParts(d);
        const y = parts.find(p => p.type === 'year')?.value;
        const m = parts.find(p => p.type === 'month')?.value;
        const dayVal = parts.find(p => p.type === 'day')?.value;
        dayKeys.push(`${y}-${m}-${dayVal}`);
      }

      const candidates = dayKeys.filter(key => {
        try {
          const progress = localStorage.getItem(`quiz_progress_${key}`);
          if (!progress) return false;
          const parsed = JSON.parse(progress);
          return parsed && (parsed.selectedTot || parsed.textVal || (parsed.myResults && parsed.myResults.length > 0));
        } catch {
          return false;
        }
      });

      if (candidates.length === 0) return;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('answers')
        .select('day_key')
        .eq('user_id', userId)
        .gte('day_key', sevenDaysAgoStr);

      const existingKeys = new Set((existing || []).map(a => a.day_key));
      const missingKeys = candidates.filter(key => !existingKeys.has(key));

      for (const key of missingKeys) {
        console.log(`Auto-recovering answer for date: ${key}`);
        const saved = localStorage.getItem(`quiz_progress_${key}`);
        if (!saved) continue;
        const progress = JSON.parse(saved);

        const { data: qData } = await supabase
          .from('daily_questions')
          .select('questions')
          .eq('day_key', key)
          .maybeSingle();

        if (qData && qData.questions) {
          const q = qData.questions;
          const dailyQs: any[] = [];
          if (q.tot) dailyQs.push(q.tot);
          if (q.ranking) dailyQs.push(q.ranking);
          if (q.text) dailyQs.push(q.text);
          if (q.wwe) dailyQs.push(q.wwe);

          const activeCount = dailyQs.length;
          const finalResults: string[] = [];
          if (activeCount >= 1) finalResults.push(progress.selectedTot || progress.myResults?.[0] || "");
          if (activeCount >= 2) finalResults.push(progress.myResults?.[1] || "");
          if (activeCount >= 3) finalResults.push(progress.textVal || progress.myResults?.[2] || "");
          if (activeCount >= 4) finalResults.push(progress.selectedWwe || progress.myResults?.[3] || "");

          if (finalResults.filter(Boolean).length > 0) {
            const sig = dailyQs.map(item => `[${item.q}]`).join("");
            const choiceStr = finalResults.join(" | ") + " " + sig;

            const { error: insertError } = await supabase.from('answers').insert([{
              user_id: userId,
              choice: choiceStr,
              day_key: key
            }]);

            if (!insertError) {
              console.log(`Successfully recovered answer for ${key}`);
            } else {
              console.error(`Failed to insert recovered answer for ${key}:`, insertError);
            }
          }
        }
      }
    } catch (err) {
      console.error("Auto-recovery error:", err);
    }
  }, []);

  const fetchProfile = useCallback(async (userId: string, bypassLock = false) => {
    // Prevent truly concurrent in-flight fetches only
    const lockKey = userId + dayKey;
    if (!bypassLock && fetchLock.current === lockKey) return;
    fetchLock.current = lockKey;

    try {
      // Only show full loading skeleton on initial load, not on background re-fetches
      if (!initialLoadDone.current) setLoading(true);
      // 1. Get profile and today's questions in parallel
      const [profileRes, questionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('daily_questions')
          .select('questions')
          .eq('day_key', dayKey)
          .maybeSingle()
      ]);

      if (profileRes.error) throw profileRes.error;
      
      let profileData = profileRes.data;
      let qData = questionsRes.data?.questions;

      // 2. If no questions exist for today, trigger the Edge Function (non-blocking if possible, but here we wait for data)
      if (!qData) {
        try {
          const genPromise = supabase.functions.invoke('generate-questions', {
            body: { day_key: dayKey }
          });
          
          // Wait up to 30 seconds — Gemini generation can take time
          const timeoutPromise = new Promise<null>((resolve) => 
            setTimeout(() => resolve(null), 30000)
          );

          const result: any = await Promise.race([genPromise, timeoutPromise]);
          if (result && !result.error) {
            qData = result.data?.questions;
          } else if (!result) {
            // Timed out — fire in background so next reload gets real questions
            console.warn("Question generation timed out — running in background");
            supabase.functions.invoke('generate-questions', { body: { day_key: dayKey } }).catch(() => {});
          }
        } catch (err) {
          console.error("Failed to generate questions:", err);
        }
      }

      if (qData) {
        const lastDayKey = localStorage.getItem('last_question_day_key');
        if (lastDayKey !== dayKey) {
          localStorage.setItem('last_question_fetch', new Date().toISOString());
          localStorage.setItem('last_question_day_key', dayKey);
        }
      }

      const currentQs = (qData && qData.tot && qData.ranking && qData.text) 
        ? [qData.tot, qData.ranking, qData.text, ...(qData.wwe ? [qData.wwe] : [])] 
        : [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text];

      // 3. Robust Profile Handling (Handle missing profile case)
      if (!profileData) {
        // We use the metadata from the session if profile is missing
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session;
        if (currentSession?.user) {
          const newProfile = {
            id: userId,
            display_name: currentSession.user.user_metadata?.display_name || 'Nutzer',
            partner_code: 'CB-' + userId.substring(0, 6).toUpperCase(),
            intro_completed: false
          };

          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select('*')
            .maybeSingle();

          if (inserted) {
            profileData = inserted;
          } else if (insertError && (insertError.code === '23505' || insertError.message.includes('unique'))) {
            // Already exists, likely created by another tab/instance. Fetch it.
            const { data: retryData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            profileData = retryData;
          } else {
            // Last resort retry
            const { data: retryData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
            profileData = retryData;
          }
        }
      }

      if (profileData) {
        setProfile(profileData);
        localStorage.setItem('cached_profile', JSON.stringify(profileData));
        await recoverLocalAnswers(userId);
        
        let pProfile = null;
        if (profileData.partner_id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', profileData.partner_id)
            .maybeSingle();
          pProfile = pData;
        }
        setPartnerProfile(pProfile);
        localStorage.setItem('cached_partner_profile', JSON.stringify(pProfile));

        const userIds = [userId];
        if (profileData.partner_id) userIds.push(profileData.partner_id);

        const [answersRes, streaksRes] = await Promise.all([
          supabase.from('answers').select('*').in('user_id', userIds).eq('day_key', dayKey),
          supabase.from('streaks').select('*').in('user_id', userIds).in('partner_id', userIds)
        ]);

        const rawStreaks = streaksRes.data || [];
        const processedStreaks = await Promise.all(rawStreaks.map(async (s: any) => {
          if (s.current_streak > 0 && !isStreakActive(s.last_answer_date, dayKey)) {
            // Update the database to reflect the reset in the background
            supabase.from('streaks').update({ current_streak: 0 }).eq('id', s.id).then(({ error }) => {
              if (error) console.error("Error resetting broken streak in db:", error);
            });
            return { ...s, current_streak: 0 };
          }
          return s;
        }));

        const dashData = {
          answers: answersRes.data || [],
          questions: currentQs,
          streaks: processedStreaks
        };
        setDashboardData(dashData);
        localStorage.setItem('cached_dashboard_data', JSON.stringify(dashData));
        
        // Mark successful data sync
        localStorage.setItem('last_sync_timestamp', new Date().toISOString());
        lastFetchTimestamp.current = Date.now();
      }
    } catch (e: any) {
      console.error("Critical Profile Error:", e);
      setDashboardData((prev: any) => prev || { answers: [], questions: [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text] });
    } finally {
      fetchLock.current = null;
      initialLoadDone.current = true;
      setLoading(false);
    }
  }, [dayKey]);

  // Fetch profile and data whenever dayKey or session changes
  useEffect(() => {
    if (session?.user.id) {
      fetchProfile(session.user.id);
    }
  }, [dayKey, session?.user.id, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const handleSession = async (s: Session | null) => {
      if (!mounted) return;
      if (s) {
        setSession(s);
      } else {
        setLoading(false);
      }
    };

    supabase.auth.getSession()
      .then((res) => {
        handleSession(res?.data?.session || null);
      })
      .catch((err) => {
        console.error("Auth session error:", err);
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        handleSession(s);
      } else if (event === 'TOKEN_REFRESHED') {
        if (s) setSession(s);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setPartnerProfile(null);
        setDashboardData(null);
        setLoading(false);
        initialFetchStarted = false;
        localStorage.removeItem('cached_profile');
        localStorage.removeItem('cached_partner_profile');
        localStorage.removeItem('cached_dashboard_data');
        localStorage.removeItem('cached_bisou_stats_v3');
        // Broadcast to other tabs
        authChannel.postMessage({ type: 'SIGNED_OUT' });
      }
    });

    // Cross-tab sync via BroadcastChannel
    const handleAuthMessage = (e: MessageEvent) => {
      if (e.data.type === 'SIGNED_OUT' && mounted) {
        setSession(null);
        setProfile(null);
        setPartnerProfile(null);
        setDashboardData(null);
        setLoading(false);
        initialFetchStarted = false;
        localStorage.removeItem('cached_profile');
        localStorage.removeItem('cached_partner_profile');
        localStorage.removeItem('cached_dashboard_data');
        localStorage.removeItem('cached_bisou_stats_v3');
        if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/signin')) {
           navigate('/signin', { replace: true });
        }
      }
    };
    authChannel.addEventListener('message', handleAuthMessage);

    const handleSyncOnWake = () => {
      if (mounted && session?.user.id) {
        const freshDayKey = getDailyKey();
        let dayChanged = false;
        if (freshDayKey !== dayKeyRef.current) {
          setDayKey(freshDayKey);
          dayChanged = true;
        }

        if (dayChanged || Date.now() - lastFetchTimestamp.current > 3000) {
          if (!dayChanged) {
            fetchProfile(session.user.id, true);
          }
        }
      }
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSyncOnWake();
      }
    };
    
    const handleFocus = () => {
      handleSyncOnWake();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Reload app when Service Worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    return () => { 
      mounted = false; 
      subscription.unsubscribe(); 
      authChannel.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchProfile, session?.user.id, navigate]);


  // --- Realtime Sync Subscriptions ---
  useEffect(() => {
    if (!session?.user.id) return;

    // 1. Subscribe to MY profile changes (name, partner_id, avatar, etc.)
    const myProfileChannel = supabase
      .channel(`my-profile-${session.user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${session.user.id}` 
      }, () => fetchProfile(session.user.id))
      .subscribe();

    // 2. Subscribe to TODAY'S answers (mine and partner's)
    const answersChannel = supabase
      .channel(`daily-answers-${dayKey}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'answers', 
        filter: `day_key=eq.${dayKey}` 
      }, () => fetchProfile(session.user.id))
      .subscribe();

    // 2.5 Subscribe to TODAY'S questions (in case they are generated while user is online)
    const questionsChannel = supabase
      .channel(`daily-questions-${dayKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_questions',
        filter: `day_key=eq.${dayKey}`
      }, () => fetchProfile(session.user.id))
      .subscribe();

    return () => {
      supabase.removeChannel(myProfileChannel);
      supabase.removeChannel(answersChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, [session?.user.id, dayKey, fetchProfile]);

  // 3. Subscribe to PARTNER'S profile changes (name, avatar) - dynamic
  useEffect(() => {
    if (!session?.user.id || !profile?.partner_id) return;

    const partnerProfileChannel = supabase
      .channel(`partner-profile-${profile.partner_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${profile.partner_id}` 
      }, () => fetchProfile(session.user.id))
      .subscribe();

    return () => {
      supabase.removeChannel(partnerProfileChannel);
    };
  }, [session?.user.id, profile?.partner_id, fetchProfile]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Clear local state immediately for a snappier feel
      setSession(null);
      setProfile(null);
      setPartnerProfile(null);
      setDashboardData(null);
      initialLoadDone.current = false;
      localStorage.removeItem('cached_profile');
      localStorage.removeItem('cached_partner_profile');
      localStorage.removeItem('cached_dashboard_data');
      localStorage.removeItem('cached_bisou_stats_v3');
      
      // Broadcast logout to other tabs BEFORE calling signOut (to avoid race with storage events)
      authChannel.postMessage({ type: 'SIGNED_OUT' });

      // Perform signOut, but don't let it block indefinitely
      try {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
        ]);
      } catch (e) {
        console.warn("Sign out call timed out or failed, but continuing with local logout.");
      }

      navigate('/signin', { replace: true });
    } catch (err) {
      console.error("Logout-Fehler:", err);
      window.location.href = '/signin';
    } finally {
      setLoading(false);
    }
  };

  const handleIntroComplete = async () => {
    if (session) {
      setLoading(true); 
      // Optimistic update to prevent guard redirect
      setProfile(prev => prev ? { ...prev, intro_completed: true } : null);
      
      await supabase.from('profiles').update({ intro_completed: true }).eq('id', session.user.id);
      await fetchProfile(session.user.id, true);
      navigate('/dashboard');
    }
  };

  const refreshData = async () => {
    if (session) await fetchProfile(session.user.id, true);
  };

  if (loading && (!profile || !session)) return <LoadingSkeleton />;

  return (
    <DialogProvider>
      <React.Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          {/* Public Routes with Persistent Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={session && profile ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
            <Route path="/signin" element={session && profile ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setLoading(true)} initialMode="login" />} />
            <Route path="/signup" element={session && profile ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setLoading(true)} initialMode="register" />} />
            <Route path="/reset-password" element={<ResetPassword onComplete={() => navigate('/signin')} />} />
          </Route>
          
          {/* Protected Routes Wrapper */}
          {session && profile ? (
            <Route path="/*" element={
              <AppLayout profile={profile} partnerProfile={partnerProfile} showLockedModal={showLockedModal} setShowLockedModal={setShowLockedModal} onLogout={handleLogout}>
                <Routes>
                  <Route path="intro" element={<Intro onComplete={handleIntroComplete} deferredPrompt={deferredPrompt} onInstall={handleInstallClick} />} />
                  <Route path="intro-replay" element={<Intro onComplete={() => navigate('/profile')} deferredPrompt={deferredPrompt} onInstall={handleInstallClick} isReplay={true} />} />
                  <Route path="dashboard" element={<Dashboard 
                    userName={profile.display_name} 
                    userAvatar={profile.avatar_url} 
                    partnerName={partnerProfile?.display_name || 'Partner'} 
                    partnerAvatar={partnerProfile?.avatar_url}
                    partnerId={profile.partner_id}
                    dashboardData={dashboardData}
                    dayKey={dayKey}
                    onStartQuestions={() => {
                      if (!profile.partner_id) setShowLockedModal(true);
                      else navigate('/questions');
                    }} 
                    onRefreshData={refreshData}
                  />} />
                  <Route path="questions" element={profile.partner_id ? <Questions 
                    profile={profile}
                    partnerProfile={partnerProfile}
                    userName={profile.display_name} 
                    partnerName={partnerProfile?.display_name || 'Partner'} 
                    partnerId={profile.partner_id} 
                    dashboardData={dashboardData}
                    dayKey={dayKey}
                    onComplete={refreshData} 
                  /> : <Navigate to="/dashboard" replace />} />
                  <Route path="profile" element={<Profile 
                    profile={profile} 
                    partnerProfile={partnerProfile} 
                    userEmail={session?.user?.email}
                    user={session?.user}
                    onLogout={handleLogout} 
                    deferredPrompt={deferredPrompt}
                    onInstall={handleInstallClick}
                    onProfileUpdate={(updatedProfile) => {
                      setProfile(updatedProfile);
                      localStorage.setItem('cached_profile', JSON.stringify(updatedProfile));
                    }}
                  />} />
                  {/* Default within protected area: if intro finished, go dashboard, else intro */}
                  <Route path="*" element={profile.intro_completed ? <Navigate to="/dashboard" replace /> : <Navigate to="/intro" replace />} />
                </Routes>
              </AppLayout>
            } />
          ) : (
            /* Fallback for unauthenticated access to protected routes */
            <Route path="*" element={!loading ? <Navigate to="/" replace /> : <LoadingSkeleton />} />
          )}
        </Routes>
      </React.Suspense>
    </DialogProvider>
  );
}
