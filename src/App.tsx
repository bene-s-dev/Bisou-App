import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Home, MessageCircle, User as UserIcon, Lock, LogOut } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation, Navigate, NavLink } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// Import modular components
import LandingPage from './landingpage/LandingPage';
import PublicLayout from './components/PublicLayout';
import Login from './components/Login';
import Intro from './components/Intro';
import Dashboard from './components/Dashboard';
import Questions from './components/Questions';
import Profile from './components/Profile';
import ResetPassword from './components/ResetPassword';
import LoadingSkeleton from './components/LoadingSkeleton';
import { getDailyKey } from './lib/dateUtils';
import { FALLBACK_QUESTIONS } from './constants/questions';
import { DialogProvider } from './components/DialogProvider';

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

  if (!profile.intro_completed && location.pathname !== '/intro') {
    return <Navigate to="/intro" replace />;
  }

  const showHeader = ['/profile', '/dashboard', '/questions', '/intro'].includes(location.pathname);

  return (
    <div className="h-[100svh] w-screen overflow-hidden relative text-[#1F1939] select-none bg-[#F8F7FF] flex flex-col">
      <div className="bg-aura" />
      
      {showHeader && (
        <header className="px-4 z-20 absolute left-0 right-0 top-0 max-w-md mx-auto w-full pointer-events-none" style={{ paddingTop: 'calc(1.5rem + var(--sat))' }}>
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
              <button 
                onClick={onLogout} 
                className="flex flex-col items-center gap-1 group pointer-events-auto"
                title="Abmelden"
              >
                <div className="p-2 rounded-full bg-white border border-red-100 text-[var(--primary)] shadow-sm hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
                    <LogOut className="w-4 h-4" />
                </div>
                <span className="text-[7px] font-black uppercase tracking-widest text-red-400 group-hover:text-red-600 leading-none">Logout</span>
              </button>
            )}
          </div>
        </header>
      )}

      <main 
        className={`flex-1 flex flex-col relative z-10 px-4 max-w-md mx-auto w-full overflow-hidden ${profile.intro_completed ? 'pb-0' : 'pb-8'}`}
        style={{ paddingTop: 'calc(1.5rem + var(--sat))' }}
      >
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </div>
      </main>

      {/* Blurry fade transition at the bottom */}
      {profile.intro_completed && location.pathname !== '/intro' && !location.search.includes('tab=intro') && (
        <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF]/90 to-transparent pointer-events-none z-[90] backdrop-blur-[1px]" />
      )}

      {profile.intro_completed && location.pathname !== '/intro' && !location.search.includes('tab=intro') && (
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
            <button onClick={() => { setShowLockedModal(false); navigate('/profile'); }} className="btn-action py-4 text-base font-black">Zum Profil ✨</button>
            <button onClick={() => setShowLockedModal(false)} className="w-full mt-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[#1F1939] transition-colors py-2">Schließen</button>
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
  const [profile, setProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const fetchLock = React.useRef<string | null>(null);
  const navigate = useNavigate();
  const dayKey = getDailyKey();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const fetchProfile = useCallback(async (userId: string, bypassLock = false) => {
    // Basic debounce/concurrency control
    if (!bypassLock && fetchLock.current === userId + dayKey) return;
    fetchLock.current = userId + dayKey;

    try {
      setLoading(true);
      // 1. Get profile and today's questions in parallel
      const [profileRes, questionsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, partner:partner_id(id, display_name, avatar_url)')
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
          const { data: genData, error: genError } = await supabase.functions.invoke('generate-questions', {
            body: { day_key: dayKey }
          });
          if (!genError) qData = genData?.questions;
        } catch (err) {
          console.error("Failed to generate questions:", err);
        }
      }

      const currentQs = (qData && qData.tot && qData.ranking && qData.text) 
        ? [qData.tot, qData.ranking, qData.text] 
        : [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text];

      // 3. Robust Profile Handling (Handle missing profile case)
      if (!profileData) {
        // We use the metadata from the session if profile is missing
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const newProfile = {
            id: userId,
            display_name: session.user.user_metadata?.display_name || 'Nutzer',
            partner_code: 'CB-' + userId.substring(0, 6).toUpperCase(),
            intro_completed: false
          };

          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select('*, partner:partner_id(id, display_name, avatar_url)')
            .maybeSingle();

          if (inserted) {
            profileData = inserted;
          } else {
            // Last resort retry
            const { data: retryData } = await supabase.from('profiles').select('*, partner:partner_id(id, display_name, avatar_url)').eq('id', userId).maybeSingle();
            profileData = retryData;
          }
        }
      }

      if (profileData) {
        setProfile(profileData);
        setPartnerProfile(profileData.partner || null);

        const userIds = [userId];
        if (profileData.partner_id) userIds.push(profileData.partner_id);

        const [answersRes, streaksRes] = await Promise.all([
          supabase.from('answers').select('*').in('user_id', userIds).eq('day_key', dayKey),
          supabase.from('streaks').select('*').in('user_id', userIds).in('partner_id', userIds)
        ]);

        setDashboardData({
          answers: answersRes.data || [],
          questions: currentQs,
          streaks: streaksRes.data || []
        });
        
        // Mark successful data sync
        localStorage.setItem('last_sync_timestamp', new Date().toISOString());
      }
    } catch (e: any) {
      console.error("Critical Profile Error:", e);
      setDashboardData((prev: any) => prev || { answers: [], questions: [FALLBACK_QUESTIONS.tot, FALLBACK_QUESTIONS.ranking, FALLBACK_QUESTIONS.text] });
    } finally {
      fetchLock.current = null;
      setLoading(false);
    }
  }, [dayKey]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (mounted) {
        if (s) {
          setSession(s);
          fetchProfile(s.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (s) {
          setSession(s);
          fetchProfile(s.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setPartnerProfile(null);
        setDashboardData(null);
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [fetchProfile]);


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

  if (loading && !profile) return <LoadingSkeleton />;

  return (
    <DialogProvider>
      <Routes>
        {/* Public Routes with Persistent Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={session && profile ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/signin" element={session && profile ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setLoading(true)} initialMode="login" />} />
          <Route path="/signup" element={session && profile ? <Navigate to="/dashboard" replace /> : <Login onLogin={() => setLoading(true)} initialMode="register" />} />
        </Route>
        
        <Route path="/reset-password" element={<div className="h-screen w-screen relative bg-[#F8F7FF] overflow-y-auto pt-12 px-4"><div className="bg-aura" /><ResetPassword onComplete={() => navigate('/signin')} /></div>} />
        
        {/* Protected Routes Wrapper */}
        {session && profile ? (
          <Route path="/*" element={
            <AppLayout profile={profile} partnerProfile={partnerProfile} showLockedModal={showLockedModal} setShowLockedModal={setShowLockedModal} onLogout={handleLogout}>
              <Routes>
                <Route path="intro" element={<Intro onComplete={handleIntroComplete} deferredPrompt={deferredPrompt} onInstall={handleInstallClick} />} />
                <Route path="dashboard" element={<Dashboard 
                  userName={profile.display_name} 
                  userAvatar={profile.avatar_url} 
                  partnerName={partnerProfile?.display_name || 'Partner'} 
                  partnerAvatar={partnerProfile?.avatar_url}
                  partnerId={profile.partner_id}
                  dashboardData={dashboardData}
                  onStartQuestions={() => {
                    if (!profile.partner_id) setShowLockedModal(true);
                    else navigate('/questions');
                  }} 
                />} />
                <Route path="questions" element={profile.partner_id ? <Questions 
                  userName={profile.display_name} 
                  partnerName={partnerProfile?.display_name || 'Partner'} 
                  partnerId={profile.partner_id} 
                  dashboardData={dashboardData}
                  onComplete={refreshData} 
                /> : <Navigate to="/dashboard" replace />} />
                <Route path="profile" element={<Profile 
                  profile={profile} 
                  partnerProfile={partnerProfile} 
                  onLogout={handleLogout} 
                  deferredPrompt={deferredPrompt}
                  onInstall={handleInstallClick}
                />} />
                {/* Default within protected area */}
                <Route path="*" element={profile.intro_completed ? <Navigate to="/dashboard" replace /> : <Navigate to="/intro" replace />} />
              </Routes>
            </AppLayout>
          } />
        ) : (
          /* Fallback for unauthenticated access to protected routes */
          <Route path="*" element={!loading ? <Navigate to="/" replace /> : <LoadingSkeleton />} />
        )}
      </Routes>
    </DialogProvider>
  );
}

