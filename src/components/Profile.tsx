import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Pencil, Check, Bell, BellOff, Info, X, User as UserIcon, ChevronLeft, ChevronRight, Trash2, Share2, Share, Copy, Smartphone, Users, Sparkles, Settings, Flame, ShieldCheck, Mail, RefreshCcw, Grid, BarChart3, Trophy, History, Sun, Moon, LogOut, FileText } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';
import DeleteAccountModal from './DeleteAccountModal';
import StatsModal from './StatsModal';
import StreakModal from './StreakModal';
import JournalModal from './JournalModal';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translateError } from '../lib/translations';
import { capitalizeName } from '../lib/stringUtils';
import { getDailyKey, isStreakActive } from '../lib/dateUtils';
import { User } from '@supabase/supabase-js';


interface ProfileProps {
  profile: any;
  partnerProfile: any;
  userEmail?: string;
  user?: User | null;
  onLogout: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  onProfileUpdate?: (updatedProfile: any) => void;
}

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

function MilestonesModal({ 
  isOpen, 
  onClose, 
  milestones, 
  unlockedMilestones, 
  loadingMilestones,
  highlightId,
  shouldScroll
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  milestones: any[]; 
  unlockedMilestones: any[]; 
  loadingMilestones: boolean;
  highlightId?: string | null;
  shouldScroll?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && highlightId && shouldScroll && containerRef.current && !loadingMilestones) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const element = containerRef.current?.querySelector(`[data-milestone-id="${highlightId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, highlightId, shouldScroll, loadingMilestones]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop px-4 z-[9999] will-change-[opacity,backdrop-filter]">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="modal-content p-6 max-h-[90vh] overflow-hidden w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[var(--secondary)]" />
            </div>
            <div>
              <h3 className="font-black text-[#1F1939] text-base leading-tight">Eure Erfolge & Meilensteine</h3>
              <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">
                {unlockedMilestones.length} von {milestones.length} freigeschaltet
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 bg-purple-50 rounded-full text-[var(--muted)] hover:bg-purple-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-purple-50 rounded-full overflow-hidden border border-purple-100/50 mb-4 shrink-0">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 to-[var(--secondary)] rounded-full transition-all duration-500" 
            style={{ width: `${milestones.length > 0 ? (unlockedMilestones.length / milestones.length) * 100 : 0}%` }}
          />
        </div>

        {/* Achievements Grid */}
        <div 
          ref={containerRef} 
          className="flex-1 min-h-0 grid grid-cols-1 gap-3 overflow-y-auto px-4 py-2 security-scrollbar pb-4 touch-pan-y overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loadingMilestones && milestones.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={`skeleton-${i}`}
                className="border border-purple-50/10 rounded-2xl p-3 flex items-center gap-3 animate-pulse"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/50 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="w-1/2 h-2.5 bg-slate-100 dark:bg-slate-800/50 rounded mb-2" />
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/50 rounded mb-1" />
                  <div className="w-3/4 h-2 bg-slate-100 dark:bg-slate-800/50 rounded" />
                </div>
              </div>
            ))
          ) : (
            milestones.map(m => {
              const unlocked = unlockedMilestones.find(um => um.milestone_id === m.id);
              const isHighlighted = highlightId === m.id && shouldScroll;
              return (
                <div 
                  key={m.id} 
                  data-milestone-id={m.id}
                  className={`border rounded-2xl p-3 flex items-center gap-3 transition-all duration-700 mx-1.5 ${
                    isHighlighted 
                      ? 'border-amber-400 bg-amber-50/30 shadow-[0_0_20px_rgba(251,191,36,0.55)] scale-[1.03] z-10 ring-2 ring-amber-400/35' 
                      : unlocked 
                        ? 'border-purple-100 bg-purple-50/5' 
                        : 'border-purple-50/20 opacity-40 grayscale-[0.5]'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                    isHighlighted
                      ? 'bg-amber-100 border-amber-200 text-amber-600 shadow-inner'
                      : unlocked 
                        ? 'bg-purple-50 border-purple-100/30 text-white' 
                        : 'bg-slate-50 border-slate-100 grayscale'
                  } ${isHighlighted ? 'animate-bounce-subtle' : ''}`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-[11px] font-black truncate ${isHighlighted ? 'text-amber-900' : 'text-[#1F1939]'}`}>{m.name}</h4>
                      {unlocked && (
                        <span className={`text-[7px] font-black px-1 rounded-[4px] border shrink-0 ${isHighlighted ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-100'}`}>
                          {isHighlighted ? 'NEU! ✨' : '✓'}
                        </span>
                      )}
                    </div>
                    <p className={`text-[9px] font-bold leading-tight mt-0.5 ${isHighlighted ? 'text-amber-800/80' : 'text-[#4A4468]'}`}>{m.description}</p>
                    {unlocked && (
                      <p className={`text-[7px] font-semibold mt-1 flex items-center gap-0.5 ${isHighlighted ? 'text-amber-700/60' : 'text-[#6A6588]'}`}>
                        <span>📅</span> {new Date(unlocked.unlocked_at).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Profile({ 

  profile: initialProfile, 
  partnerProfile, 
  userEmail: propEmail,
  user: initialUser,
  onLogout,
  deferredPrompt,
  onInstall,
  onProfileUpdate
}: ProfileProps) {
  const { showAlert, showConfirm } = useDialog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'main') as 'main' | 'partner' | 'settings' | 'info' | 'install';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  
  const [profile, setProfile] = useState<any>(initialProfile);
  const [user, setUser] = useState<User | null>(initialUser || null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('app_dark_mode') === 'true');

  useEffect(() => {
    const handleToggle = () => {
      setIsDarkMode(localStorage.getItem('app_dark_mode') === 'true');
    };
    window.addEventListener('dark-mode-toggle', handleToggle);
    return () => window.removeEventListener('dark-mode-toggle', handleToggle);
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    localStorage.setItem('app_dark_mode', String(nextMode));
    window.dispatchEvent(new Event('dark-mode-toggle'));
    showAlert(nextMode ? "Dunkler Modus aktiviert 🌙" : "Heller Modus aktiviert ☀️", "success");
  };
  
  // Milestones State
  const [milestones, setMilestones] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cached_milestones');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [unlockedMilestones, setUnlockedMilestones] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cached_unlocked_milestones');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loadingMilestones, setLoadingMilestones] = useState(false);

  const updateProfile = (newProfile: any) => {
    setProfile(newProfile);
    onProfileUpdate?.(newProfile);
  };
  
  const refreshUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const latestUser = data?.user;
    if (latestUser) {
      setUser(latestUser);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  useEffect(() => {
    setProfile(initialProfile);
    setNewName(initialProfile?.display_name || '');
  }, [initialProfile]);

  useEffect(() => {
    setUser(initialUser || null);
  }, [initialUser]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(initialProfile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [partnerCodeInput, setPartnerCodeInput] = useState('CB-');
  const [isLinking, setIsLinking] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAboutAppModal, setShowAboutAppModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showMilestonesModal, setShowMilestonesModal] = useState(false);
  const [highlightedMilestoneId, setHighlightedMilestoneId] = useState<string | null>(null);
  const [mustScrollToMilestone, setMustScrollToMilestone] = useState(false);

  useEffect(() => {
    if (showMilestonesModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      // Reset highlighting when closing
      setHighlightedMilestoneId(null);
      setMustScrollToMilestone(false);
    }
    return () => document.body.classList.remove('modal-open');
  }, [showMilestonesModal]);

  useEffect(() => {
    if (activeTab === 'partner' && searchParams.get('showMilestones') === 'true') {
      const highlight = searchParams.get('highlightMilestone');
      const shouldScroll = searchParams.get('scroll') === 'true';
      
      setHighlightedMilestoneId(highlight);
      setMustScrollToMilestone(shouldScroll);
      setShowMilestonesModal(true);
      
      const newParams: any = { tab: 'partner' };
      setSearchParams(newParams, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get('editAvatar') === 'true') {
      setShowAvatarMenu(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('editAvatar');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [stats, setStats] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_bisou_stats_v3');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });
  const [loadingStats, setLoadingStats] = useState(!stats);
  const [partnerDetails, setPartnerDetails] = useState<{
    createdAt: string | null;
    streak: number;
    partnerSince: string | null;
    streakData: any;
  }>({ createdAt: null, streak: 0, partnerSince: null, streakData: null });
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [myStreakData, setMyStreakData] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<{
    online: boolean | 'checking';
    latency: number | null;
    storageItems: number;
    lastChecked: string | null;
  }>({ online: 'checking', latency: null, storageItems: 0, lastChecked: null });

  const devTapsRef = useRef(0);
  const lastToggleTimeRef = useRef<number>(0);
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('bisou_dev_mode') === 'true');
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const devTimeoutRef = useRef<any>(null);

  const handleDevTap = () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 500) {
      devTapsRef.current += 1;
      if (devTapsRef.current >= 5) {
        const newState = !isDevMode;
        setIsDevMode(newState);
        localStorage.setItem('bisou_dev_mode', String(newState));
        showAlert(newState ? "Debug-Modus aktiviert 🛠️" : "Debug-Modus deaktiviert", "info");
        devTapsRef.current = 0;
      }
    } else {
      devTapsRef.current = 1;
    }
    lastToggleTimeRef.current = now;
  };

  const handleHardResetApp = async () => {
    showConfirm(
      "Dies löscht alle Service Worker und den Cache der App. Die Seite wird danach neu geladen.",
      async () => {
        try {
          setLoading(true);
          // 1. Unregister Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister();
            }
          }
          // 2. Clear Caches
          if ('caches' in window) {
            const keys = await caches.keys();
            for (const key of keys) {
              await caches.delete(key);
            }
          }
          // 3. Reload
          window.location.reload();
        } catch (e) {
          showAlert("Fehler beim Zurücksetzen", "error");
        } finally {
          setLoading(false);
        }
      },
      { title: "App Hard-Reset", confirmLabel: "Jetzt zurücksetzen", cancelLabel: "Abbrechen" }
    );
  };

  const handleRunDiagnostics = async () => {
    try {
      const logs: string[] = [];
      logs.push(`=== BİSOU SYSTEM-DIAGNOSE ===`);
      logs.push(`Zeitstempel: ${new Date().toLocaleString('de-DE')}`);
      logs.push(`Origin: ${window.location.origin}`);
      logs.push(`Protocol: ${window.location.protocol}`);
      logs.push(`User Agent: ${navigator.userAgent}`);
      
      // PWA Mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      logs.push(`PWA Standalone: ${isStandalone ? 'Ja' : 'Nein'}`);
      
      // Notifications
      logs.push(`\n[NOTIFICATIONS]`);
      if ('Notification' in window) {
        logs.push(`Notification.permission: ${Notification.permission}`);
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const status = await navigator.permissions.query({ name: 'notifications' });
            logs.push(`Permission Query State: ${status.state}`);
          } catch (e: any) {
            logs.push(`Permission Query State: Fehler (${e.message})`);
          }
        } else {
          logs.push(`Permission Query API: Nicht unterstützt`);
        }
      } else {
        logs.push(`Notification API: Nicht unterstützt`);
      }

      // Service Worker
      logs.push(`\n[SERVICE WORKER]`);
      if ('serviceWorker' in navigator) {
        logs.push(`ServiceWorker support: Ja`);
        const regs = await navigator.serviceWorker.getRegistrations();
        logs.push(`Aktive Registrierungen: ${regs.length}`);
        for (const [index, reg] of regs.entries()) {
          logs.push(`  Reg #${index + 1}:`);
          logs.push(`    Scope: ${reg.scope}`);
          logs.push(`    Active: ${reg.active ? `Ja (${reg.active.state})` : 'Nein'}`);
          logs.push(`    Installing: ${reg.installing ? 'Ja' : 'Nein'}`);
          logs.push(`    Waiting: ${reg.waiting ? 'Ja' : 'Nein'}`);
          
          if (reg.pushManager) {
            logs.push(`    PushManager support: Ja`);
            try {
              const sub = await reg.pushManager.getSubscription();
              if (sub) {
                logs.push(`    Subscription: Aktiv`);
                logs.push(`    Endpoint: ${sub.endpoint.substring(0, 50)}...`);
                logs.push(`    Keys present: ${sub.toJSON().keys ? Object.keys(sub.toJSON().keys || {}).join(', ') : 'Keine'}`);
              } else {
                logs.push(`    Subscription: Keine`);
              }
            } catch (err: any) {
              logs.push(`    Subscription Error: ${err.message}`);
            }
          } else {
            logs.push(`    PushManager support: Nein`);
          }
        }
      } else {
        logs.push(`ServiceWorker support: Nein`);
      }

      // Local Storage
      logs.push(`\n[STORAGE & DATABASE]`);
      logs.push(`LocalStorage Keys: ${Object.keys(localStorage).length}`);
      let totalSize = 0;
      for (let x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          totalSize += (localStorage[x].length + x.length) * 2; // approximation in bytes
        }
      }
      logs.push(`LocalStorage geschätzte Größe: ${(totalSize / 1024).toFixed(2)} KB`);
      
      // Supabase connectivity check
      const start = performance.now();
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
        const latency = performance.now() - start;
        logs.push(`Supabase Verbindung: ${error ? `Fehler (${error.message})` : `Online (${latency.toFixed(1)}ms Latency)`}`);
      } catch (err: any) {
        logs.push(`Supabase Verbindung: Fehler (${err.message})`);
      }

      setDiagnosticInfo(logs.join('\n'));
      showAlert("Diagnose abgeschlossen! 📋", "success");
    } catch (e: any) {
      console.error(e);
      showAlert("Diagnose-Fehler: " + e.message, "error");
    }
  };

  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(isPWA);

  useEffect(() => {
    if (isPWA) {
      localStorage.setItem('pwa_installed', 'true');
      setIsAlreadyInstalled(true);
    } else if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((apps: any[]) => {
        if (apps && apps.length > 0) {
          localStorage.setItem('pwa_installed', 'true');
          setIsAlreadyInstalled(true);
        } else {
          localStorage.removeItem('pwa_installed');
          setIsAlreadyInstalled(false);
        }
      }).catch((err: any) => {
        console.log("Error checking installed apps:", err);
      });
    } else {
      setIsAlreadyInstalled(false);
    }
  }, [isPWA]);

  const isIOSLocal = localStorage.getItem('mock_ios_mode') === 'true' || ((/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !(window as any).chrome);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isDesktopLocal = !isIOSLocal && !isAndroid;



  const [userEmail, setUserEmail] = useState<string>(propEmail || '');
  const [emailInput, setEmailInput] = useState<string>(propEmail || '');
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);

  useEffect(() => {
    const currentEmail = user?.email || propEmail || '';
    setUserEmail(currentEmail);
    if (!isEditingEmail) setEmailInput(currentEmail);
  }, [user?.email, propEmail, isEditingEmail]);

  // Sync / monitor email confirmation status
  useEffect(() => {
    if (user?.new_email) {
      const interval = setInterval(async () => {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session?.user && !session.user.new_email) {
          // Email confirmed! Force a reload or update local state
          window.location.reload();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.new_email]);



  const handleUpdateEmail = async () => {
    if (!emailInput.trim() || emailInput.trim() === userEmail) {
      setIsEditingEmail(false);
      return;
    }

    // Check if it's a social login (cannot change email)
    if (user?.app_metadata?.provider && user.app_metadata.provider !== 'email') {
      showAlert("E-Mail von Google/Apple Logins kann nicht geändert werden.", "error");
      setIsEditingEmail(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim())) {
      showAlert("Bitte gib eine gültige E-Mail-Adresse ein.", "error");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      console.log("Attempting to update email to:", emailInput.trim());
      
      const { data, error } = await supabase.auth.updateUser({ 
        email: emailInput.trim() 
      }, {
        emailRedirectTo: window.location.origin + '/profile'
      });
      
      if (error) throw error;
      
      console.log("Update requested. Supabase response:", data);
      
      // Immediately refresh local user state
      await refreshUser();
      
      showAlert("Links an BEIDE Adressen gesendet! Bitte in beiden Mails bestätigen.", "success");
      setIsEditingEmail(false);
    } catch (err: any) {
      console.error("Email update failed:", err);
      showAlert(translateError(err.message), "error");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      const fetchStreaks = async () => {
        try {
          const dayKey = getDailyKey();
          try {
            await supabase.rpc('check_and_freeze_streak', { p_today: dayKey });
          } catch (rpcErr) {
            console.error("Failed to run check_and_freeze_streak RPC:", rpcErr);
          }

          const queries = [
            supabase.from('streaks').select('current_streak, last_answer_date, freeze_history, longest_streak, streak_history').eq('user_id', profile.id).maybeSingle()
          ];

          if (profile.partner_id) {
            queries.push(
              supabase.from('profiles').select('created_at').eq('id', profile.partner_id).single()
            );
            queries.push(
              supabase.from('streaks').select('current_streak, last_answer_date, freeze_history, longest_streak, streak_history').eq('user_id', profile.partner_id).eq('partner_id', profile.id).maybeSingle()
            );
          }

          const results = await Promise.all(queries);
          
          if (results[0]?.data) {
            setMyStreakData(results[0].data);
          }

          if (profile.partner_id && results[1]?.data) {
            const partnerRes = results[1];
            const streakRes = results[2];
            let streakVal = streakRes?.data?.current_streak || 0;
            if (streakVal > 0 && !isStreakActive(streakRes?.data?.last_answer_date, dayKey, streakRes?.data?.freeze_history)) {
              streakVal = 0;
            }

            setPartnerDetails({
              createdAt: partnerRes.data.created_at,
              streak: streakVal,
              partnerSince: null,
              streakData: streakRes?.data || null
            });
          }
        } catch (err) {
          console.error("Error fetching streak and partner details:", err);
        }
      };
      fetchStreaks();
    }
  }, [profile?.id, profile?.partner_id]);

  const fetchStats = useCallback(async () => {
    try {
      const hasCached = !!localStorage.getItem('cached_bisou_stats_v3');
      if (!hasCached) {
        setLoadingStats(true);
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      const partnerId = profile?.partner_id;
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
  }, [profile?.partner_id]);

  useEffect(() => {
    if (profile?.partner_id) {
      fetchStats();
    }
  }, [profile?.partner_id, fetchStats]);

  // Load Milestones Effect
  useEffect(() => {
    if (profile?.id && profile?.partner_id) {
      const fetchMilestoneData = async () => {
        // Only show spinner on initial load when there is no cached data yet
        if (milestones.length === 0) {
          setLoadingMilestones(true);
        }
        try {
          const [mRes, umRes] = await Promise.all([
            supabase.from('milestones').select('*').order('trigger_type', { ascending: true }).order('trigger_value', { ascending: true }),
            supabase.from('unlocked_milestones').select('*').eq('user_id', profile.id)
          ]);
          if (mRes.data) {
            setMilestones(mRes.data);
            localStorage.setItem('cached_milestones', JSON.stringify(mRes.data));
          }
          if (umRes.data) {
            setUnlockedMilestones(umRes.data);
            localStorage.setItem('cached_unlocked_milestones', JSON.stringify(umRes.data));
          }
        } catch (err) {
          console.error("Error fetching milestones:", err);
        } finally {
          setLoadingMilestones(false);
        }
      };
      fetchMilestoneData();
    }
  }, [profile?.id, profile?.partner_id]);

  const handleVersionClick = () => {
    // Ignore all taps during the 2-second cooldown after activation/deactivation
    if (Date.now() - lastToggleTimeRef.current < 2000) {
      return;
    }

    // If the final/success message is currently displayed, do not count taps, just reset the hide timer
    if (devMessage === "Entwicklermodus freigeschaltet! 🎉" || devMessage === "Entwicklermodus deaktiviert 🔒") {
      if (devTimeoutRef.current) {
        clearTimeout(devTimeoutRef.current);
      }
      devTimeoutRef.current = setTimeout(() => {
        setDevMessage(null);
        devTapsRef.current = 0;
      }, 3000);
      return;
    }

    if (devTimeoutRef.current) {
      clearTimeout(devTimeoutRef.current);
    }

    devTapsRef.current += 1;
    const currentTaps = devTapsRef.current;

    // Set a timeout to clear the message and reset taps if user stops tapping
    devTimeoutRef.current = setTimeout(() => {
      setDevMessage(null);
      devTapsRef.current = 0;
    }, 3000);

    if (isDevMode) {
      if (currentTaps >= 5) {
        handleLeaveDevMode();
      } else {
        const stepsRemaining = 5 - currentTaps;
        setDevMessage(`Noch ${stepsRemaining} ${stepsRemaining === 1 ? 'Schritt' : 'Schritte'} zum Deaktivieren! 🔒`);
      }
    } else {
      if (currentTaps >= 5) {
        setIsDevMode(true);
        localStorage.setItem('bisou_dev_mode', 'true');
        devTapsRef.current = 0;
        lastToggleTimeRef.current = Date.now();
        setDevMessage("Entwicklermodus freigeschaltet! 🎉");
      } else if (currentTaps >= 2) {
        const stepsRemaining = 5 - currentTaps;
        setDevMessage(`In ${stepsRemaining} ${stepsRemaining === 1 ? 'Schritt' : 'Schritten'} bist du Entwickler! 💻`);
      }
    }
  };

  const handleLeaveDevMode = () => {
    if (devTimeoutRef.current) {
      clearTimeout(devTimeoutRef.current);
    }
    setIsDevMode(false);
    localStorage.removeItem('bisou_dev_mode');
    devTapsRef.current = 0;
    lastToggleTimeRef.current = Date.now();
    setDevMessage("Entwicklermodus deaktiviert 🔒");
    devTimeoutRef.current = setTimeout(() => {
      setDevMessage(null);
    }, 3000);
  };

  // Load and check push subscription status when profile is ready or when visiting the notifications tab
  useEffect(() => {
    const checkCurrentSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }
      
      const permission = Notification.permission;
      setPushPermission(permission);
      
      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            // Check if it exists in Supabase
            const { data } = await supabase
              .from('push_subscriptions')
              .select('id')
              .eq('user_id', profile?.id)
              .maybeSingle();
              
            if (data) {
              setPushEnabled(true);
            } else {
              setPushEnabled(false);
              // Unsubscribe locally to keep in sync if DB has no record
              await subscription.unsubscribe().catch(() => {});
            }
          } else {
            setPushEnabled(false);
          }
        } catch (err) {
          console.error("Error checking push status:", err);
        }
      } else {
        setPushEnabled(false);
      }
    };

    if (profile?.id && activeTab === 'settings') {
      checkCurrentSubscription();
      
      // Also check when window gets focus (user might have changed settings in browser)
      window.addEventListener('focus', checkCurrentSubscription);
      return () => window.removeEventListener('focus', checkCurrentSubscription);
    }
  }, [profile?.id, activeTab]);

  const executePushToggle = async (targetState: boolean) => {
    setIsPushLoading(true);
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error("Service Worker nicht unterstützt");
      }

      // 1. Ensure Service Worker is registered and active
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        // Fallback: Try to register the default Vite PWA worker or the push worker
        registration = await navigator.serviceWorker.register('/sw.js').catch(() => 
          navigator.serviceWorker.register('/sw-push.js')
        );
      }

      // Wait for registration to be active with a timeout
      if (!registration.active) {
        const readyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Service Worker Zeitüberschreitung")), 15000));
        registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      }

      let subscription = await registration.pushManager.getSubscription();

      if (!targetState) {
        if (subscription) await subscription.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('user_id', profile.id);
        setPushEnabled(false);
        showAlert("Benachrichtigungen deaktiviert 🔒", "success");
      } else {
        if (!subscription) {
          const { data: vapidData, error: vapidError } = await supabase.functions.invoke('send-push-notification', { method: 'GET' });
          if (vapidError || !vapidData?.vapidPublicKey) throw new Error("VAPID-Schlüssel fehlt");
          
          const convertedKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);
          subscription = await registration.pushManager.subscribe({ 
            userVisibleOnly: true, 
            applicationServerKey: convertedKey 
          });
        }
        const { error } = await supabase.from('push_subscriptions').upsert({ 
          user_id: profile.id, 
          subscription: subscription.toJSON() 
        }, { onConflict: 'user_id' });
        
        if (error) throw error;
        setPushEnabled(true);
        showAlert("Benachrichtigungen aktiviert! 🔔", "success");
      }
    } catch (err: any) {
      console.error("Push toggle error:", err);
      showAlert("Fehler: " + (err.message || "Benachrichtigung konnte nicht aktiviert werden"), "error");
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleTogglePush = () => {
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      showAlert("Benachrichtigungen erfordern eine sichere HTTPS-Verbindung.", "error");
      return;
    }

    if (!('Notification' in window)) {
      showAlert("Browser unterstützt keine Mitteilungen.", "error");
      return;
    }

    const currentPermission = Notification.permission;

    if (currentPermission === 'denied') {
      showAlert("Bitte aktiviere Benachrichtigungen in deinen Browser-Einstellungen.", "error");
      return;
    }

    const isIOS = localStorage.getItem('mock_ios_mode') === 'true' || ((/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !(window as any).chrome);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isIOS && !isStandalone) {
      showAlert("Benachrichtigungen auf iPhones nur im 'Zum Home-Bildschirm hinzugefügt'-Modus aktivierbar.", "error");
      setActiveTab('install');
      return;
    }

    if (currentPermission === 'default') {
      try {
        let handled = false;
        const handlePermission = (p: NotificationPermission) => {
          if (handled) return;
          handled = true;
          setPushPermission(p);
          if (p === 'granted') {
            executePushToggle(true);
          } else if (p === 'default') {
            showAlert("Die Anfrage wurde ignoriert oder geschlossen.", "info");
          }
        };

        const req = Notification.requestPermission(handlePermission);
        if (req && typeof req.then === 'function') {
          req.then(handlePermission).catch(err => {
            console.error("Permission request error", err);
            showAlert("Fehler bei der Berechtigungsanfrage.", "error");
          });
        }
      } catch (err: any) {
        console.error("Permission request crash:", err);
        showAlert("Dein Browser hat ein Problem mit der Berechtigungsanfrage.", "error");
      }
    } else {
      executePushToggle(!pushEnabled);
    }
  };

  useEffect(() => {
    return () => {
      if (devTimeoutRef.current) {
        clearTimeout(devTimeoutRef.current);
      }
    };
  }, []);

  // System Status Check - now called when AboutAppModal is opened
  const checkSystemStatus = useCallback(async () => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
      const end = performance.now();
      
      let storageMB = 0;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        storageMB = (estimate.usage || 0) / (1024 * 1024);
      } else {
        // Fallback for older browsers (localStorage only)
        let storageSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) storageSize += (localStorage.getItem(key)?.length || 0) * 2;
        }
        storageMB = storageSize / (1024 * 1024);
      }

      setSystemStatus({
        online: !error,
        latency: Math.round(end - start),
        storageItems: Number(storageMB.toFixed(2)),
        lastChecked: new Date().toLocaleTimeString()
      });
    } catch (e) {
      setSystemStatus(prev => ({ ...prev, online: false, lastChecked: new Date().toLocaleTimeString() }));
    }
  }, []);

  useEffect(() => {
    if (showAboutAppModal) { // Trigger only when modal is open
      checkSystemStatus();
      const interval = setInterval(checkSystemStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [showAboutAppModal, checkSystemStatus]);

  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim() || partnerCodeInput === 'CB-') return;
    setIsLinking(true);
    try {
      const { error } = await supabase.rpc('link_partners', { partner_code_to_link: partnerCodeInput.trim() });
      if (error) throw error;
      showAlert("Erfolgreich verknüpft! ❤️", "success");
      setPartnerCodeInput('CB-');
    } catch (err: any) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      showAlert(translateError(err.message), "error");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = () => {
    showConfirm(
      "Eure gemeinsame Serie und alle verknüpften Daten werden für euch beide nicht mehr sichtbar sein.",
      async () => {
        setLoading(true);
        try {
          const { error } = await supabase.rpc('unlink_partners');
          if (error) throw error;
          showAlert("Verbindung getrennt.", "info");
        } catch (err: any) {
          showAlert(translateError(err.message), "error");
        } finally {
          setLoading(false);
        }
      },
      { title: "Partner wirklich trennen?", confirmLabel: "Ja, trennen", cancelLabel: "Abbrechen", type: "error" }
    );
  };

  const handleNudge = async () => {
    if (!profile?.id || !profile?.partner_id) return;
    
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

    setIsNudging(true);
    try {
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
        showAlert(`${partnerProfile?.display_name ? capitalizeName(partnerProfile.display_name) : 'Partner'} hat Benachrichtigungen nicht aktiviert.`, "info");
      } else {
        showAlert(`${partnerProfile?.display_name ? capitalizeName(partnerProfile.display_name) : 'Partner'} wurde angestupst! ❤️`, "success");
        // Save timestamp and increment count ONLY for successful, non-skipped nudge actions
        const nextNudgeTime = Date.now();
        const nextNudgeCount = nudgeCount + 1;
        localStorage.setItem(`last_nudge_${profile.id}`, nextNudgeTime.toString());
        localStorage.setItem(`nudge_count_${profile.id}`, nextNudgeCount.toString());
        if (onProfileUpdate) {
          onProfileUpdate({
            ...profile,
            last_nudge_at: new Date(nextNudgeTime).toISOString(),
            nudge_count: nextNudgeCount
          });
        }
      }
    } catch (err: any) {
      showAlert(translateError(err.message), "error");
    } finally {
      setIsNudging(false);
    }
  };

  const handleShareCode = async () => {
    if (!profile?.partner_code) return;
    const shareText = `Hey! Lass uns Bisou zusammen nutzen. Mein Partner-Code ist: ${profile.partner_code}\n\nHier anmelden: ${window.location.origin}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Bisou Partner-Code', text: shareText });
      } catch (err) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showAlert("Code in Zwischenablage kopiert! 📋", "success");
      } catch (err) {}
    }
  };

  const handleUpdateName = async () => {
    const capitalized = capitalizeName(newName);
    if (!capitalized || capitalized === profile?.display_name) {
      setIsEditingName(false);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: capitalized }).eq('id', profile.id);
      if (error) throw error;
      updateProfile({ ...profile, display_name: capitalized });
      setNewName(capitalized);
      setIsEditingName(false);
      showAlert("Name aktualisiert!", "success");
    } catch (err: any) {
      showAlert(translateError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = () => {
    // Schließe zuerst das Bild-Menü, damit es nicht über dem Dialog liegt
    setShowAvatarMenu(false);

    showConfirm(
      "Möchtest du dein aktuelles Profilbild wirklich entfernen?", 
      async () => {
        setLoading(true);
        try {
          const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
          if (updateError) throw updateError;

          updateProfile({ ...profile, avatar_url: null });
          showAlert("Bild gelöscht.", "info");
        } catch (err) {
          showAlert("Fehler beim Löschen.", "error");
        } finally {
          setLoading(false);
        }
      }, 
      { title: "Profilbild löschen?", confirmLabel: "Ja, weiter" }
    );
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null);
    setLoading(true);
    try {
      const fileName = `${profile.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;

      updateProfile({ ...profile, avatar_url: publicUrl });
      showAlert("Profilbild aktualisiert!", "success");
    } catch (err: any) {
      console.error("Upload error:", err);
      showAlert(translateError(err.message), "error");
    } finally {
      setLoading(false);
      setShowAvatarMenu(false);
    }
  };

  const getDaysConnected = () => {
    if (!profile?.partner_id || !profile?.partner_since) return 0;
    const start = new Date(profile.partner_since);
    const now = new Date();
    
    // Normalize both dates to midnight to compute calendar days difference
    const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffMs = nowZero.getTime() - startZero.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays + 1); // Connection day is Day 1
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'partner':
        return (
          <div className="flex flex-col items-center gap-2 animate-entrance w-full relative" key="partner">

            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-center mb-1 relative z-10">
              {profile?.partner_id ? 'PARTNER' : 'PARTNER VERBINDEN'}
            </h2>
            {profile?.partner_id ? (
              <div className="w-full flex flex-col gap-2 relative z-10">
                <div className="relative bg-white border-2 border-purple-50 rounded-[1.8rem] p-5 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-[1rem] bg-purple-50 flex items-center justify-center border-2 border-white shadow-md overflow-hidden relative shrink-0">
                        {partnerProfile?.avatar_url ? (
                          <img src={partnerProfile.avatar_url} alt="P" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-[var(--secondary)]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-[#1F1939] truncate leading-tight">
                          {partnerProfile?.display_name ? capitalizeName(partnerProfile.display_name) : 'Dein Partner'}
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--muted)] leading-tight mt-0.5">
                          Verbunden seit: {getDaysConnected()} {getDaysConnected() === 1 ? 'Tag' : 'Tagen'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleNudge}
                      disabled={isNudging}
                      className="bg-purple-50 hover:bg-purple-100 text-[var(--secondary)] active:scale-95 disabled:opacity-50 transition-all rounded-full py-1.5 px-3 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider border border-purple-100/50 shadow-sm shrink-0"
                    >
                      {isNudging && (
                        <div className="w-2.5 h-2.5 border-2 border-[var(--secondary)] border-t-transparent rounded-full animate-spin" />
                      )}
                      <span>Anstupsen 👋</span>
                    </button>
                  </div>

                </div>

                <div className="p-1 text-center">
                  <button 
                    onClick={handleUnlink}
                    className="w-auto px-4 py-1 text-red-400 hover:text-red-500 font-black text-[9px] uppercase tracking-[0.2em] transition-colors"
                  >
                    Partnerverbindung trennen
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-2 relative z-10">
                <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-4 flex flex-col items-center text-center gap-2 shadow-sm">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-[#1F1939]">Teile deinen Code</h3>
                    <p className="text-[10px] font-bold text-[#4A4468] leading-tight opacity-70 px-2">
                      Teile diesen persönlichen Code mit deinem Partner.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full mt-1">
                    <div className="flex-1 bg-purple-50/50 border-2 border-purple-100 rounded-2xl p-2 flex items-center justify-center relative">
                      <span className="text-base font-black text-[var(--secondary)] tracking-[0.2em] pt-0.5">{profile?.partner_code || '---'}</span>
                      <button onClick={() => { navigator.clipboard.writeText((profile?.partner_code || '').split('-')[1] || ''); showAlert("Code kopiert!", "success"); }} className="absolute right-2 p-1.5 bg-purple-50 text-[var(--secondary)] rounded-xl hover:bg-purple-100 transition-all active:scale-90 flex items-center justify-center shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={handleShareCode} className="w-10 h-10 rounded-xl bg-[var(--secondary)] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-4 flex flex-col items-center text-center gap-2 shadow-sm">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-[#1F1939]">Code eingeben</h3>
                    <p className="text-[10px] font-bold text-[#4A4468] leading-tight opacity-70 px-2">
                      Gib hier den erhaltenen Partner-Code ein.
                    </p>
                  </div>

                  <div className={`flex items-center gap-2 w-full mt-1 ${shouldShake ? 'animate-shake' : ''}`}>
                    <input 
                      type="text" 
                      value={partnerCodeInput}
                      onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                      placeholder="CB-XXXXXX"
                      className="flex-1 bg-white border-2 border-purple-100 rounded-2xl p-2 text-center text-base font-black text-[var(--secondary)] tracking-[0.2em] focus:border-[var(--secondary)] outline-none transition-colors"
                    />
                    <button 
                      onClick={handleLinkPartner}
                      disabled={isLinking || !partnerCodeInput.includes('-')}
                      className="w-10 h-10 rounded-xl bg-[var(--secondary)] text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shrink-0"
                    >
                      {isLinking ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto animate-entrance" key="settings">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center mb-1">Einstellungen</h2>
            
            {/* E-Mail ändern Card */}
            <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] py-2.5 px-5 flex items-center justify-between gap-3 shadow-sm text-left w-full">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider block leading-none mb-0.5">E-Mail-Adresse</span>
                  {!isEditingEmail ? (
                    <div className="flex flex-col">
                      <div className="text-xs font-black text-[#1F1939] truncate pt-0.5">{userEmail || 'Laden...'}</div>
                      {user?.new_email && (
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="text-[8px] font-bold text-amber-500 uppercase tracking-tight animate-pulse">
                            Warte auf Bestätigung: {user.new_email}
                          </div>
                          <div className="text-[7px] font-bold text-[var(--muted)] leading-tight italic">
                            Info: Du musst den Link in der <b>alten</b> und der <b>neuen</b> Mail anklicken.
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdateEmail()}
                      disabled={isUpdatingEmail}
                      className="w-full bg-purple-50/50 border-2 border-purple-100 rounded-xl px-2.5 py-1 text-xs font-bold text-[#1F1939] outline-none focus:border-[var(--secondary)] transition-colors mt-0.5"
                      placeholder="neue@email.de"
                      autoFocus
                    />
                  )}
                </div>
              </div>
              {!isEditingEmail ? (
                <button 
                  onClick={() => { setEmailInput(userEmail); setIsEditingEmail(true); }}
                  className="w-7 h-7 rounded-full bg-white border border-[var(--card-border)] text-[var(--secondary)] flex items-center justify-center shadow-sm active:scale-90 transition-all shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={handleUpdateEmail}
                    disabled={isUpdatingEmail}
                    className="p-1 bg-green-50 text-green-500 hover:bg-green-100 rounded-xl transition-all active:scale-90 flex items-center justify-center border border-green-100"
                  >
                    {isUpdatingEmail ? (
                      <div className="w-3.5 h-3.5 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button 
                    onClick={() => setIsEditingEmail(false)}
                    disabled={isUpdatingEmail}
                    className="p-1 bg-red-50 text-red-400 hover:bg-red-100 rounded-xl transition-all active:scale-90 flex items-center justify-center border border-red-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Benachrichtigungen toggle card */}
            <button 
              onClick={() => handleTogglePush()}
              disabled={isPushLoading}
              className="w-full flex items-center justify-between py-3 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                  {pushPermission === 'denied' ? <BellOff className="w-4 h-4 text-red-500" /> : <Bell className="w-4 h-4 text-[var(--secondary)]" />}
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider block leading-none mb-0.5">Mitteilungen</span>
                  <span className="text-xs font-black text-[#1F1939]">
                    {isPushLoading 
                      ? 'Wird aktualisiert...' 
                      : pushPermission === 'denied' 
                        ? 'In Browsereinstellungen blockiert 🔒' 
                        : pushEnabled 
                          ? 'Benachrichtigungen an' 
                          : 'Benachrichtigungen aus'}
                  </span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${pushEnabled && pushPermission !== 'denied' ? 'bg-indigo-200' : 'bg-slate-200'}`}>
                <div className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-all ${pushEnabled && pushPermission !== 'denied' ? 'left-[19px]' : 'left-[3px]'}`} />
              </div>
            </button>

            {/* Dark Mode toggle card */}
            <button 
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between py-3 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                  {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div className="text-left">
                  <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider block leading-none mb-0.5">Erscheinungsbild</span>
                  <span className="text-xs font-black text-[#1F1939]">{isDarkMode ? 'Dunkler Modus' : 'Heller Modus'}</span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${isDarkMode ? 'bg-indigo-200' : 'bg-slate-200'}`}>
                <div className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-all ${isDarkMode ? 'left-[19px]' : 'left-[3px]'}`} />
              </div>
            </button>

            {/* App installieren */}
            {!isPWA && !isAlreadyInstalled && (
              <button 
                onClick={() => setActiveTab('install')}
                className="w-full flex items-center justify-between py-3 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#1F1939]">App installieren</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
              </button>
            )}

            {/* Link to Info Page */}
            <button 
              onClick={() => setActiveTab('info')}
              className="w-full flex items-center justify-between py-3 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wide text-[#1F1939]">Info & Mehr</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
            </button>
          </div>
        );

      case 'info':
        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto animate-entrance" key="info">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center mb-1">Informationen</h2>
            {[
              { id: 'about', label: 'Über die App', icon: Info, action: () => setShowAboutAppModal(true) },
              { id: 'services', label: 'Verwendete Dienste', icon: Settings, action: () => setShowServices(true) },
              { id: 'security', label: 'Wie wir deine Daten schützen', icon: ShieldCheck, action: () => setShowSecurityModal(true) },
              { id: 'docs', label: 'Erklärung der App (PDF)', icon: FileText, download: true, href: '/Bisou_App_Systemdokumentation.pdf' },
              { id: 'intro', label: 'Einführung nochmal ansehen', icon: Sparkles, action: () => navigate('/intro-replay') },
              { id: 'more-apps', label: 'Weitere Apps von benelabs', icon: Grid, action: () => window.open('https://benelabs.de', '_blank') },
              { id: 'logout', label: 'Abmelden', icon: LogOut, action: onLogout },
              { id: 'delete', label: 'Account löschen', icon: Trash2, isDanger: true, action: () => { setShowDeleteModal(true); window.history.pushState({ modal: 'delete' }, ''); } }
            ].map(item => {
              const className = `w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 shadow-sm transition-all ${
                item.isDanger ? 'border-red-50 hover:border-red-200' : 'border-purple-50 hover:border-purple-200'
              }`;

              if (item.download) {
                return (
                  <a 
                    key={item.id} 
                    href={item.href}
                    download="Bisou_App_Systemdokumentation.pdf"
                    className={className}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[11px] font-black uppercase tracking-wide text-[#1F1939]">{item.label}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
                  </a>
                );
              }

              return (
                <button 
                  key={item.id} 
                  onClick={item.action}
                  className={className}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.isDanger ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-[var(--secondary)]'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`text-[11px] font-black uppercase tracking-wide ${item.isDanger ? 'text-red-500' : 'text-[#1F1939]'}`}>{item.label}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${item.isDanger ? 'text-red-400' : 'text-[var(--secondary)]'}`} />
                </button>
              );
            })}
          </div>
        );

      case 'install':
        const isIOSLocalInstall = localStorage.getItem('mock_ios_mode') === 'true' || ((/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !(window as any).chrome);
        const isAndroidLocalInstall = /Android/i.test(navigator.userAgent);
        
        return (
          <div className="flex flex-col items-center gap-2 animate-entrance w-full max-w-md mx-auto" key="install">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center mb-1">App Installation</h2>
            <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-5 flex flex-col items-center text-center gap-4 shadow-sm w-full">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-[var(--secondary)] border-2 border-white shadow-sm">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#1F1939]">Bisou auf dem Homescreen</h3>
                  <p className="text-[10px] font-bold text-[#4A4468] leading-tight opacity-70">
                    Nutze Bisou ohne Browser-Leiste, direkt von deinem Startbildschirm.
                  </p>
                </div>

                {isIOSLocalInstall ? (
                  <div className="space-y-3 w-full text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                      <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Tippe in deinem Safari-Browser auf das Teilen-Icon <span className="inline-block p-1 bg-purple-50 rounded text-[var(--secondary)] mx-1"><Share className="w-3 h-3 inline align-middle -mt-0.5" /></span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                      <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Suche in den Optionen nach <span className="text-[var(--secondary)] font-black">"Zum Home-Bildschirm"</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {deferredPrompt ? (
                      <div className="flex flex-col gap-4">
                         <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider leading-relaxed text-center">
                            Dein Gerät unterstützt die direkte Installation.
                         </p>
                        <button 
                          onClick={onInstall} 
                          className="btn-primary py-4 px-6 text-[10px] font-black uppercase tracking-widest w-full shadow-lg"
                        >
                          App jetzt installieren ✨
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider leading-relaxed text-center">
                          {isAndroidLocalInstall ? 'Tippe auf die drei Punkte (Menü) in Chrome und wähle "App installieren".' : 'Dein Browser unterstützt die direkte Installation vermutlich nicht.'}
                        </p>
                        {!isAndroidLocalInstall && (
                           <div className="flex items-center gap-3 text-left">
                            <div className="w-5 h-5 rounded-full bg-[var(--secondary)] text-white text-[9px] font-black flex items-center justify-center shrink-0">!</div>
                            <p className="text-[9px] font-bold text-[#1F1939] uppercase tracking-wider">Nutze Chrome oder Safari für das beste Erlebnis.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        );

      default: {
        const isAdmin = profile?.display_name?.toLowerCase() === 'bene' || profile?.id === '438bce53-5c85-4035-82a1-d6fbd23bc1e8';

        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto animate-entrance" key="main">
            {[
              { id: 'partner', label: profile?.partner_id ? 'Partner' : 'Partner verbinden', icon: Users, action: () => setActiveTab('partner') },
              { id: 'journal', label: 'Tagebuch', icon: History, action: () => setShowJournalModal(true) },
              { id: 'streak', label: 'Serie', icon: Flame, action: () => setShowStreakModal(true) },
              { id: 'score', label: 'Übereinstimmung', icon: BarChart3, action: () => setShowStatsModal(true) },
              { id: 'milestones', label: 'Meilensteine', icon: Trophy, action: () => setShowMilestonesModal(true) },
              { id: 'settings', label: 'Einstellungen', icon: Settings, action: () => setActiveTab('settings') }
            ].filter((item): item is any => !!item).map(item => (
              <button 
                key={item.id} 
                onClick={item.action} 
                className="w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#1F1939]">
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
              </button>
            ))}

            {isAdmin && (
              <button 
                onClick={() => window.location.href = '/admin.html'}
                className="w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 border-purple-50 hover:border-purple-200 shadow-sm transition-all cursor-pointer mt-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 text-[var(--secondary)]">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#1F1939]">Admin-Bereich</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--secondary)]" />
              </button>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="animate-entrance flex flex-col h-full bg-[#F8F7FF] relative">
      <header 
        className="pt-4 pb-0 flex flex-col items-center gap-4 shrink-0 relative z-10 w-full"
        style={{ paddingTop: 'calc(1rem + var(--sat, 0px))' }}
      >
        <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-full relative h-[40px]">
            {/* The heading and back button were removed per request, preserving height to avoid shifting */}
          </div>

          {/* Profile Avatar */}
          <div className="relative">
            <div 
              onClick={() => setShowAvatarMenu(true)}
              className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center border-2 border-white shadow-md overflow-hidden relative group cursor-pointer active:scale-95 transition-all"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-8 h-8 text-purple-200" />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <button 
              onClick={() => setShowAvatarMenu(true)}
              className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-white border border-[var(--card-border)] text-[var(--secondary)] flex items-center justify-center shadow-sm active:scale-90 transition-all z-30"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative group">
            {isEditingName ? (
              <div className="flex items-center gap-2 bg-white border-2 border-[var(--secondary)] rounded-full px-4 py-1.5 shadow-md animate-in zoom-in-95 duration-200">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                  className="bg-transparent text-sm font-black text-[var(--secondary)] uppercase tracking-[0.1em] outline-none w-32 pt-0.5"
                />
                <button onClick={handleUpdateName} className="p-1 text-green-500 hover:bg-green-50 rounded-full transition-colors">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-red-400 hover:bg-red-50 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div 
                  onClick={() => setIsEditingName(true)}
                  className="flex items-center justify-center px-8 py-2.5 bg-white border-2 border-[var(--card-border)] rounded-full shadow-sm"
                >
                  <span className="text-sm font-black text-[var(--secondary)] uppercase tracking-[0.1em] pt-0.5">
                    {profile?.display_name ? capitalizeName(profile.display_name) : 'User'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="absolute -right-2 -bottom-1 w-7 h-7 rounded-full bg-white border border-[var(--card-border)] text-[var(--secondary)] flex items-center justify-center shadow-sm active:scale-90 transition-all z-30"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="w-[60%] h-[2px] bg-purple-100 mb-4 mx-auto shrink-0" />
        </div>
      </header>

      <div 
        className="flex-1 overflow-y-auto scrollbar-soft pb-32 pt-0"
        style={{ paddingBottom: 'calc(8rem + var(--sab, 0px))' }}
      >
        {renderContent()}
      </div>



      {showAvatarMenu && createPortal(
        <div className="modal-backdrop items-end pb-10 px-4">
          <div className="absolute inset-0" onClick={() => setShowAvatarMenu(false)} />
          <div className="modal-content p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <h3 className="text-sm font-black text-[#1F1939] uppercase tracking-widest">Profilbild anpassen</h3>
              </div>
              
              <button onClick={() => { document.getElementById('avatar-upload')?.click(); setTimeout(() => setShowAvatarMenu(false), 100); }} className="w-full py-4 rounded-2xl bg-purple-50 text-[var(--secondary)] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-purple-100 transition-all active:scale-95">
                <Camera className="w-5 h-5" /> 
                {profile?.avatar_url ? 'Neues Bild wählen' : 'Bild hochladen'}
              </button>

              {profile?.avatar_url && (
                <button onClick={handleDeleteImage} className="w-full py-4 rounded-2xl bg-red-50 text-red-500 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 transition-all active:scale-95">
                  <Trash2 className="w-5 h-5" /> Bild löschen
                </button>
              )}

              <button onClick={() => setShowAvatarMenu(false)} className="w-full py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[var(--text-main)] transition-colors mt-2">Abbrechen</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selectedImage && createPortal(
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setSelectedImage(null)}
        />,
        document.body
      )}

      
            {showAboutAppModal && createPortal(
        <div className="modal-backdrop">
          <div className="absolute inset-0" onClick={() => setShowAboutAppModal(false)} />
          <div 
            className="modal-content p-8 h-[calc(100svh-32px)] max-h-[calc(100svh-32px)] w-full max-w-md flex flex-col relative" 
            onClick={e => e.stopPropagation()}
          >
             <button onClick={() => setShowAboutAppModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
               <X className="w-4 h-4 text-[var(--secondary)]" />
             </button>
             
             <div className="flex flex-col items-center gap-4 mb-6 pt-4 shrink-0">
               <button 
                 onClick={handleDevTap}
                 className="w-16 h-16 bg-purple-50 rounded-[2rem] flex items-center justify-center text-[var(--secondary)] border-2 border-white shadow-sm active:scale-95 transition-transform cursor-pointer outline-none focus:outline-none focus:ring-2 focus:ring-[var(--secondary)] focus:ring-offset-2"
               >
                 <Info className="w-8 h-8 pointer-events-none" />
               </button>
               <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center">Über die App</h3>
             </div>

             <div className="flex-1 overflow-y-scroll pr-1 pb-12 show-scrollbar space-y-6">
                <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-4 py-5 border-2 border-purple-100 w-full max-w-md overflow-hidden mx-auto shadow-sm">
                  <div className="grid grid-cols-[auto_1fr_12px] gap-x-3 gap-y-3 items-center">
                 {/* Entwickler */}
                 <div className="contents">
                   <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Entwickler:</span>
                   <div className="flex justify-end border-b border-purple-50/50 pb-2 col-span-2">
                     <span className="text-xs font-black text-[#1F1939]">Benedikt S.</span>
                   </div>
                 </div>

                 {/* Version */}
                 <div className="contents cursor-pointer" onClick={handleVersionClick}>
                   <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50 select-none">Version:</span>
                   <div className="flex justify-end border-b border-purple-50/50 pb-2 col-span-2">
                     <span className="text-xs font-black text-[#1F1939] select-none">1.2.0</span>
                   </div>
                 </div>

                 {isDevMode && (
                   <>
                     {/* Gerät */}
                     <div className="contents">
                       <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Läuft auf:</span>
                       <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2 col-span-2">
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${isDesktopLocal ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                           Desktop
                         </span>
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] tracking-wider transition-all ${isIOSLocal ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                           iOS
                         </span>
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${isAndroid ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                           Android
                         </span>
                       </div>
                     </div>

                     {/* Modus */}
                     <div className="contents">
                       <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Läuft als:</span>
                       <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2 col-span-2">
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                           PWA
                         </span>
                         <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${!isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                           Web
                         </span>
                       </div>
                     </div>

                    {/* Server */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Serververbindung:</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider">
                          {(() => {
                            if (systemStatus.online === 'checking') return '...';
                            if (systemStatus.online) {
                              const latency = systemStatus.latency ?? 0;
                              if (latency <= 150) return 'schnell';
                              if (latency <= 250) return 'okay';
                              return 'langsam';
                            }
                            return 'offline';
                          })()}
                        </span>
                        {systemStatus.latency && (
                          <span className="text-[9px] font-black tabular-nums tracking-wider text-blue-600">
                            {systemStatus.latency}ms
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-end border-b border-purple-50/50 pb-2">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] transition-all duration-500 shrink-0 ${
                          (() => {
                            if (systemStatus.online === 'checking') return 'bg-amber-400 shadow-amber-200 animate-pulse';
                            if (systemStatus.online) {
                              const latency = systemStatus.latency ?? 0;
                              if (latency <= 150) return 'bg-green-500 shadow-green-200 animate-pulse';
                              if (latency <= 250) return 'bg-yellow-500 shadow-yellow-200 animate-pulse';
                              return 'bg-red-500 shadow-red-200 animate-pulse';
                            }
                            return 'bg-gray-400 shadow-gray-200';
                          })()
                        }`} />
                      </div>
                    </div>

                    {/* Speicher */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Lokaler Speicher:</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black tabular-nums tracking-wider text-blue-600">
                          {(() => {
                            const mb = systemStatus.storageItems;
                            return mb < 0.1 ? (mb * 1024).toFixed(1) + 'KB' : mb.toFixed(2) + 'MB';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-end border-b border-purple-50/50 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-200 animate-pulse shrink-0" />
                      </div>
                    </div>

                    {/* Sync */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] tracking-wider pb-2 border-b border-purple-50/50">Letzter Cache-Sync:</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black text-blue-600 tracking-wider">
                          {(() => {
                            const lastSync = localStorage.getItem('last_sync_timestamp');
                            if (!lastSync) return '??';
                            const diffMs = Date.now() - new Date(lastSync).getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            if (diffMins <= 5) return 'jetzt';
                            if (diffMins < 60) return `${diffMins}m`;
                            const diffHours = Math.floor(diffMins / 60);
                            if (diffHours < 24) return `${diffHours}h`;
                            return `${Math.floor(diffHours / 24)}d`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-end border-b border-purple-50/50 pb-2">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 ${
                          (() => {
                            const lastSync = localStorage.getItem('last_sync_timestamp');
                            if (!lastSync) return 'bg-gray-400 shadow-gray-200';
                            const diffMins = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
                            if (diffMins <= 5) return 'bg-green-500 shadow-green-200';
                            if (diffMins <= 10) return 'bg-yellow-500 shadow-yellow-200';
                            return 'bg-red-500 shadow-red-200';
                          })()
                        }`} />
                      </div>
                    </div>

                    {/* AI Core */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] tracking-wider">Fragen zuletzt abgerufen:</span>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[9px] font-black text-blue-600 tracking-wider">
                          {(() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'Unbekannt';
                            const date = new Date(lastFetch);
                            const today = new Date();
                            const isToday = date.toDateString() === today.toDateString();
                            const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                            return isToday ? `Heute, ${timeStr}` : `${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, ${timeStr}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 ${
                          (() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'bg-red-500 shadow-red-200';
                            const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
                            return hoursSince <= 24 ? 'bg-blue-500 shadow-blue-200' : 'bg-red-500 shadow-red-200';
                          })()
                        }`} />
                      </div>
                    </div>

                  </>
                )}
              </div>
            </div>

            {/* Developer Push Test Card */}
            {isDevMode && (
              <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-6 py-5 border-2 border-purple-100 w-full max-w-md mx-auto shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <h4 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] text-center border-b border-purple-50/50 pb-2">
                  Entwickler-Optionen
                </h4>

                <button
                  onClick={handleHardResetApp}
                  className="w-full py-3.5 rounded-2xl bg-purple-50 text-[var(--secondary)] font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-purple-100 transition-all active:scale-95 border border-purple-100 shadow-sm cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>App Hard-Reset</span>
                </button>
                
                <button
                  onClick={handleRunDiagnostics}
                  className="w-full py-3.5 rounded-2xl bg-purple-50 text-[var(--secondary)] font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-purple-100 transition-all active:scale-95 border border-purple-100 shadow-sm cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>System-Diagnose ausführen</span>
                </button>

                {diagnosticInfo && (
                  <div className="flex flex-col gap-2 p-4 bg-purple-950/95 text-[10px] text-green-400 font-mono rounded-2xl w-full border border-purple-900 shadow-inner relative max-h-[300px] overflow-y-scroll show-scrollbar animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-purple-900 pb-1.5 mb-1.5 sticky top-0 bg-purple-950/95 z-10">
                      <span className="font-bold text-purple-200 uppercase tracking-wider">Diagnose-Log</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(diagnosticInfo);
                            showAlert("Diagnose-Log kopiert! 📋", "success");
                          }}
                          className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 hover:bg-purple-800 transition-colors uppercase font-black text-[8px] tracking-wider cursor-pointer"
                        >
                          Kopieren
                        </button>
                        <button
                          onClick={() => setDiagnosticInfo(null)}
                          className="px-2 py-0.5 rounded bg-red-950 text-red-400 hover:bg-red-900 transition-colors uppercase font-black text-[8px] tracking-wider cursor-pointer"
                        >
                          Schließen
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap leading-relaxed select-text text-left">{diagnosticInfo}</pre>
                  </div>
                )}




              </div>
            )}
            <p className="text-[9px] font-semibold text-[#4A4468] opacity-70 text-center leading-relaxed px-6">
              Tippe 5x auf die Versionsnummer, um den Entwicklermodus ein- oder auszuschalten 💻
            </p>
          </div>
          </div>
        </div>,
        document.body
      )}


      {showServices && createPortal(
        <div className="modal-backdrop">
          <div className="absolute inset-0" onClick={() => setShowServices(false)} />
          <div 
            className="modal-content p-8 h-[calc(100svh-32px)] max-h-[calc(100svh-32px)] w-full max-w-md flex flex-col relative" 
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowServices(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>
            <div className="flex flex-col items-center text-center gap-4 mb-6 pt-4 shrink-0">
              <div className="w-16 h-16 bg-purple-50 rounded-[2rem] flex items-center justify-center text-[var(--secondary)] border-2 border-white shadow-sm">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center leading-tight">Verwendete Dienste</h3>
            </div>
            
            <div className="flex-1 overflow-y-scroll pr-1 pb-12 show-scrollbar space-y-4">
              {/* Supabase */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest">Infrastruktur & Auth</span>
                <span className="text-xs font-black text-[#1F1939]">Supabase Cloud Backend</span>
                <p className="text-[11px] font-semibold text-[#4A4468] leading-relaxed">
                  Sichere relationale PostgreSQL-Datenbank zur Speicherung von Benutzer- und Spieldaten mit integrierter Row-Level-Security (RLS), Supabase Auth für verschlüsselte Logins sowie Supabase Storage für Medien.
                </p>
              </div>

              {/* Gemini & Claude / Antigravity CLI */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest">Entwicklung & KI-Assistenz</span>
                <span className="text-xs font-black text-[#1F1939]">Antigravity CLI (Gemini & Claude)</span>
                <p className="text-[11px] font-semibold text-[#4A4468] leading-relaxed">
                  Agentenbasierte Entwicklungsumgebung zur Optimierung und Generierung des Quellcodes. Nutzt Google Gemini und Anthropic Claude zur automatisierten Assistenz, Codestrukturierung und Fehlerbehebung.
                </p>
              </div>

              {/* GitHub */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest">Versionsverwaltung</span>
                <span className="text-xs font-black text-[#1F1939]">GitHub Repository</span>
                <p className="text-[11px] font-semibold text-[#4A4468] leading-relaxed">
                  Zentrale Code-Ablage und Versionskontrolle über Git. Dient als Ausgangspunkt für automatisiertes Deployment, kollaboratives Arbeiten und Revisionsverfolgung.
                </p>
              </div>

              {/* Vercel */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col gap-1.5 text-left">
                <span className="text-[9px] font-black text-[var(--secondary)] uppercase tracking-widest">Hosting & Deployment</span>
                <span className="text-xs font-black text-[#1F1939]">Vercel Edge Platform</span>
                <p className="text-[11px] font-semibold text-[#4A4468] leading-relaxed">
                  Müheloses Hosting und CI/CD-Deployment. Die Webanwendung wird über das weltweite Edge-Netzwerk von Vercel mit minimalen Ladezeiten und hoher Zuverlässigkeit bereitgestellt.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showSecurityModal && createPortal(
        <div className="modal-backdrop">
          <div className="absolute inset-0" onClick={() => setShowSecurityModal(false)} />
          <div 
            className="modal-content p-8 h-[calc(100svh-32px)] max-h-[calc(100svh-32px)] w-full max-w-md flex flex-col relative" 
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowSecurityModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 mb-6 pt-4 shrink-0">
              <div className="w-16 h-16 bg-purple-50 rounded-[2rem] flex items-center justify-center border-2 border-white shadow-sm text-[var(--secondary)]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#1F1939] leading-tight uppercase tracking-tighter">
                Wie wir deine Daten schützen:
              </h3>
            </div>

            <div className="space-y-6 text-left overflow-y-scroll pr-2 security-scrollbar flex-1 pb-12">
              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0 mt-2" />
                <p className="text-xs font-semibold text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Strikte Datensparsamkeit:</span> Vollständiger Verzicht auf persistente Cookies, Tracking-Pixel oder Analytics-Tools. Es werden keinerlei personenbezogene Stammdaten (wie Nachnamen, Telefonnummern oder Adressen) erhoben.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0 mt-2" />
                <p className="text-xs font-semibold text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Standardkonforme Verschlüsselung:</span> Verschlüsselte Datenübertragung via TLS 1.3 gemäß den Richtlinien des <a href="https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.html" target="_blank" rel="noopener noreferrer" className="text-[var(--secondary)] underline underline-offset-2 decoration-2 decoration-purple-200 hover:decoration-purple-400 transition-all font-black">BSI (TR-02102-2)</a>, fortlaufend unabhängig überprüft und mit Bestnoten validiert.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0 mt-2" />
                <p className="text-xs font-semibold text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Isolierte Datenspeicherung:</span> Kryptographisch abgesicherte Speicherung von Datensätzen direkt auf Datenbankebene, strikt voneinander isoliert durch den Einsatz von Row-Level-Security (RLS).
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] shrink-0 mt-2" />
                <p className="text-xs font-semibold text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Verfügbarkeit & Netzwerksicherheit:</span> Georedundantes Hosting auf zertifizierten Tier-IV-Servern mit maximaler Ausfallsicherheit und umfassendem Schutz gegen DDoS- und Brute-Force-Angriffe über globale Gateways.
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {devMessage && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xs bg-white/95 dark:bg-[#17122A]/95 backdrop-blur-md border-2 border-purple-100 dark:border-[var(--card-border)] rounded-[2rem] shadow-[0_15px_40px_rgba(124,58,237,0.2)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.5)] px-5 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-[#201B3A] border border-purple-100 dark:border-[var(--card-border)] flex items-center justify-center shrink-0">
            <span className="text-lg">💻</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[9px] font-black uppercase tracking-wider text-[var(--secondary)]">System</h3>
            <p className="text-[11px] font-bold text-[#1F1939] dark:text-[var(--text-main)] leading-snug mt-0.5">{devMessage}</p>
          </div>
        </div>,
        document.body
      )}

      <DeleteAccountModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={async () => {
          try {
            const { error } = await supabase.rpc('delete_user_account');
            if (error) throw error;
            
            setShowDeleteModal(false);
            onLogout();
          } catch (err: any) {
            showAlert(translateError(err.message), "error");
          }
        }} 
      />

      <StatsModal 
        isOpen={showStatsModal} 
        onClose={() => setShowStatsModal(false)} 
        partnerName={partnerProfile?.display_name || 'Partner'}
        userName={profile?.display_name || 'Ich'}
        stats={stats}
        loading={loadingStats}
      />

      <MilestonesModal 
        isOpen={showMilestonesModal} 
        onClose={() => setShowMilestonesModal(false)}
        milestones={milestones}
        unlockedMilestones={unlockedMilestones}
        loadingMilestones={loadingMilestones}
        highlightId={highlightedMilestoneId}
        shouldScroll={mustScrollToMilestone}
      />

      <StreakModal 
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        myStreakData={myStreakData}
        partnerStreakData={partnerDetails.streakData}
        initialTab="user"
      />

      <JournalModal
        isOpen={showJournalModal}
        onClose={() => setShowJournalModal(false)}
        partnerName={partnerProfile?.display_name || 'Partner'}
        userId={profile?.id}
        partnerId={profile?.partner_id}
        partnerAvatar={partnerProfile?.avatar_url}
        userAvatar={profile?.avatar_url}
        dayKey={getDailyKey()}
      />

      <input 
        type="file" 
        id="avatar-upload" 
        className="hidden" 
        accept="image/*" 
        onChange={handleAvatarSelect} 
      />
    </div>
  );
}
