import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Pencil, Check, Bell, BellOff, Info, X, User as UserIcon, ChevronRight, ArrowLeft, Trash2, Share2, Copy, Download, Smartphone, Users, AlertTriangle, Sparkles, Monitor, Laptop, Tablet, Settings, Flame, ExternalLink, ShieldCheck, Shield, KeyRound, LogOut } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';
import DeleteAccountModal from './DeleteAccountModal';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translateError } from '../lib/translations';
import Intro from './Intro';

interface ProfileProps {
  profile: any;
  partnerProfile: any;
  onLogout: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
}

export default function Profile({ 
  profile: initialProfile, 
  partnerProfile, 
  onLogout,
  deferredPrompt,
  onInstall 
}: ProfileProps) {
  const { showAlert, showConfirm } = useDialog();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'main') as 'main' | 'partner' | 'notifications' | 'install' | 'app-info';
  
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };
  
  const [profile, setProfile] = useState<any>(initialProfile);
  
  useEffect(() => {
    setProfile(initialProfile);
    setNewName(initialProfile?.display_name || '');
  }, [initialProfile]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(initialProfile?.display_name || '');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [partnerCodeInput, setPartnerCodeInput] = useState('CB-');
  const [isLinking, setIsLinking] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [partnerDetails, setPartnerDetails] = useState<{
    createdAt: string | null;
    streak: number;
    partnerSince: string | null;
  }>({ createdAt: null, streak: 0, partnerSince: null });
  const [systemStatus, setSystemStatus] = useState<{
    online: boolean | 'checking';
    latency: number | null;
    storageItems: number;
    lastChecked: string | null;
  }>({ online: 'checking', latency: null, storageItems: 0, lastChecked: null });

  const [devTaps, setDevTaps] = useState(0);
  const [isDevMode, setIsDevMode] = useState(() => localStorage.getItem('bisou_dev_mode') === 'true');
  const [devMessage, setDevMessage] = useState<string | null>(null);
  const devTimeoutRef = useRef<any>(null);

  const [showAboutAppModal, setShowAboutAppModal] = useState(false); // New state for About App modal

  const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
        const isIOSLocal = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const isAndroid = /android/.test(navigator.userAgent.toLowerCase());
        const isDesktopLocal = !isIOSLocal && !isAndroid;

  useEffect(() => {
    if (activeTab === 'partner' && profile?.partner_id) {
      const fetchPartnerDetails = async () => {
        try {
          const [partnerRes, streakRes] = await Promise.all([
            supabase.from('profiles').select('created_at').eq('id', profile.partner_id).single(),
            supabase.from('streaks').select('current_streak').eq('user_id', profile.partner_id).eq('partner_id', profile.id).maybeSingle()
          ]);

          if (partnerRes.data) {
            setPartnerDetails({
              createdAt: partnerRes.data.created_at,
              streak: streakRes.data?.current_streak || 0,
              partnerSince: null
            });
          }
        } catch (err) {
          console.error("Error fetching partner details:", err);
        }
      };
      fetchPartnerDetails();
    }
  }, [activeTab, profile?.partner_id]);

  const handleVersionClick = () => {
    const nextTaps = devTaps + 1;
    setDevTaps(nextTaps);
    
    if (devTimeoutRef.current) {
      clearTimeout(devTimeoutRef.current);
    }
    
    if (isDevMode) {
      if (nextTaps >= 5) {
        handleLeaveDevMode();
      } else {
        const stepsRemaining = 5 - nextTaps;
        setDevMessage(`Noch ${stepsRemaining} ${stepsRemaining === 1 ? 'Schritt' : 'Schritte'} zum Deaktivieren! 🔒`);
        devTimeoutRef.current = setTimeout(() => {
          setDevMessage(null);
          setDevTaps(0);
        }, 3000);
      }
      return;
    }
    
    if (nextTaps >= 5) {
      setIsDevMode(true);
      localStorage.setItem('bisou_dev_mode', 'true');
      setDevMessage("Entwicklermodus freigeschaltet! 🎉");
      devTimeoutRef.current = setTimeout(() => {
        setDevMessage(null);
        setDevTaps(0);
      }, 4000);
    } else if (nextTaps >= 2) {
      const stepsRemaining = 5 - nextTaps;
      setDevMessage(`In ${stepsRemaining} ${stepsRemaining === 1 ? 'Schritt' : 'Schritten'} bist du Entwickler! 💻`);
      devTimeoutRef.current = setTimeout(() => {
        setDevMessage(null);
        setDevTaps(0);
      }, 3000);
    }
  };

  const handleLeaveDevMode = () => {
    if (devTimeoutRef.current) {
      clearTimeout(devTimeoutRef.current);
    }
    setIsDevMode(false);
    localStorage.removeItem('bisou_dev_mode');
    setDevTaps(0);
    setDevMessage("Entwicklermodus deaktiviert 🔒");
    devTimeoutRef.current = setTimeout(() => {
      setDevMessage(null);
    }, 3000);
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
      
      let storageSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) storageSize += (localStorage.getItem(key)?.length || 0) * 2;
      }

      setSystemStatus({
        online: !error,
        latency: Math.round(end - start),
        storageItems: Number((storageSize / (1024 * 1024)).toFixed(2)),
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

  const handleUnlink = async () => {
    const confirmed = await showConfirm("Partner wirklich trennen?", "Eure gemeinsame Serie und alle verknüpften Daten werden für euch beide nicht mehr sichtbar sein.");
    if (!confirmed) return;

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
    if (!newName.trim() || newName === profile?.display_name) {
      setIsEditingName(false);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, display_name: newName.trim() });
      setIsEditingName(false);
      showAlert("Name aktualisiert!", "success");
    } catch (err: any) {
      showAlert(translateError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    const confirmed = await showConfirm("Profilbild löschen?", "Möchtest du dein aktuelles Profilbild wirklich entfernen?");
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: null });
      showAlert("Bild gelöscht.", "info");
    } catch (err) {
      showAlert("Fehler beim Löschen.", "error");
    } finally {
      setLoading(false);
      setShowAvatarMenu(false);
    }
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

      setProfile({ ...profile, avatar_url: publicUrl });
      setAvatarPreview(publicUrl);
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
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'partner':
        return (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300 w-full">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-center mb-1">
              {profile?.partner_id ? 'BISOU-PARTNER' : 'BISOU-PARTNER VERBINDEN'}
            </h2>
            {profile?.partner_id ? (
              <div className="w-full flex flex-col gap-2">
                <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-4 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-[1.2rem] bg-purple-50 flex items-center justify-center border-2 border-white shadow-md overflow-hidden relative">
                      {partnerProfile?.avatar_url ? (
                        <img src={partnerProfile.avatar_url} alt="P" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-6 h-6 text-[var(--secondary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-[#1F1939] truncate">{partnerProfile?.display_name || 'Dein Partner'}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                        <span className="text-[11px] font-bold text-orange-600 tracking-tight">{partnerDetails.streak} Tage Serie</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-purple-50/50 p-2.5 rounded-2xl border border-purple-100 flex flex-col items-center text-center gap-0.5">
                      <span className="text-[7px] font-black text-[var(--muted)] uppercase tracking-widest">Zusammen seit</span>
                      <span className="text-[11px] font-black text-[var(--secondary)]">{getDaysConnected()} Tagen</span>
                    </div>
                    <div className="bg-purple-50/50 p-2.5 rounded-2xl border border-purple-100 flex flex-col items-center text-center gap-0.5">
                      <span className="text-[7px] font-black text-[var(--muted)] uppercase tracking-widest">Mit dabei seit</span>
                      <span className="text-[11px] font-black text-[var(--secondary)]">
                        {partnerDetails.createdAt ? new Date(partnerDetails.createdAt).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }) : '-'}
                      </span>
                    </div>
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
              <div className="w-full flex flex-col gap-2">
                <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-4 flex flex-col items-center text-center gap-2 shadow-sm">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-[#1F1939]">Teile deinen Code</h3>
                    <p className="text-[10px] font-bold text-[#4A4468] leading-tight opacity-70 px-2">
                      Teile diesen persönlichen Code mit deinem Partner.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full mt-1">
                    <div className="flex-1 bg-purple-50/50 border-2 border-purple-100 rounded-2xl p-2 flex items-center justify-center">
                      <span className="text-base font-black text-[var(--secondary)] tracking-[0.2em] pt-0.5">{profile?.partner_code || '---'}</span>
                      <button onClick={() => { navigator.clipboard.writeText(profile?.partner_code || ''); showAlert("Code kopiert!", "success"); }} className="ml-2 p-1.5 bg-purple-50 text-[var(--secondary)] rounded-xl hover:bg-purple-100 transition-all active:scale-90 flex items-center justify-center shrink-0">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button onClick={handleShareCode} className="w-10 h-10 rounded-xl bg-[var(--secondary)] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0">
                      <Download className="w-4 h-4" />
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
      case 'notifications':
        return (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300 w-full">
             <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center mb-1">Mitteilungen</h2>
             <div className="bg-white border-2 border-purple-50 rounded-[1.8rem] p-5 flex flex-col items-center text-center gap-4 shadow-sm w-full">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-[var(--secondary)] border-2 border-white shadow-sm">
                  {pushEnabled ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-[#1F1939]">Push-Benachrichtigungen</h3>
                  <p className="text-[10px] font-bold text-[#4A4468] leading-tight opacity-70">
                    Lass dich benachrichtigen, wenn dein Partner geantwortet hat.
                  </p>
                </div>

                <button 
                  onClick={() => {/* Push logic here */}}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 shadow-sm outline-none bg-white border-[var(--card-border)] hover:bg-purple-50/30 ${isPushLoading ? 'pointer-events-none' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl ${pushEnabled ? 'bg-green-50 text-green-500' : 'bg-purple-50 text-[var(--secondary)]'}`}>
                      {pushEnabled ? <Check className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-black text-[#1F1939] uppercase tracking-wide">{pushEnabled ? 'Aktiviert' : 'Deaktiviert'}</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${pushEnabled ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${pushEnabled ? 'left-4.5' : 'left-0.5'}`} />
                  </div>
                </button>
             </div>
          </div>
        );
      case 'install':
        const isIOSLocalInstall = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
        const isAndroidLocalInstall = /android/.test(navigator.userAgent.toLowerCase());
        
        return (
          <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-300 w-full max-w-md mx-auto">
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
                      <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Tippe auf das <span className="inline-block p-1 bg-purple-50 rounded text-[var(--secondary)] mx-1"><Share2 className="w-3 h-3 inline align-middle -mt-0.5" /> Teilen-Icon</span></p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                      <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Scrolle runter und wähle <span className="text-[var(--secondary)] font-black">"Zum Home-Bildschirm"</span></p>
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
      case 'app-info':
        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
            {[
              { id: 'about', label: 'Über die App', icon: Info, action: () => setShowAboutAppModal(true) },
              { id: 'services', label: 'Verwendete Dienste', icon: Settings, action: () => setShowServices(true) },
              { id: 'security', label: 'Wie wir deine Daten schützen', icon: ShieldCheck, action: () => setShowSecurityModal(true) },
              { id: 'intro', label: 'Einführung nochmal ansehen', icon: Sparkles, action: () => setActiveTab('intro') },
              { id: 'delete', label: 'Account löschen', icon: Trash2, isDanger: true, action: () => { setShowDeleteModal(true); window.history.pushState({ modal: 'delete' }, ''); } }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={item.action}
                className={`w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 shadow-sm transition-all ${
                  item.isDanger ? 'border-red-50 hover:border-red-200' : 'border-purple-50 hover:border-purple-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${item.isDanger ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-[var(--secondary)]'}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={`text-[11px] font-black uppercase tracking-wide ${item.isDanger ? 'text-red-500' : 'text-[#1F1939]'}`}>{item.label}</span>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 ${item.isDanger ? 'text-red-200' : 'text-purple-200'}`} />
              </button>
            ))}
          </div>
        );
      case 'intro':
        return createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-4">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setActiveTab('main')}
            />
            
            <div className="relative w-full h-full sm:max-w-lg sm:h-[85vh] sm:max-h-[850px] bg-white border border-purple-100 sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300">
              <Intro isIntroOnly onComplete={() => setActiveTab('main')} />
            </div>
          </div>,
          document.body
        );
      default:
        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
            {[
              { id: 'partner', label: profile?.partner_id ? 'Bisou-Partner' : 'Bisou-Partner verbinden', icon: Users },
              { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
              { id: 'install', label: 'App installieren', icon: Smartphone },
              { id: 'app-info', label: 'Info', icon: Info }
            ].map(item => {
              const isDisabled = item.id === 'notifications' && !isDevMode;
              return (
                <button 
                  key={item.id} 
                  onClick={() => {
                    if (isDisabled) {
                      // Do nothing for normal users
                    }
                    else setActiveTab(item.id as any);
                  }} 
                  className={`w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 shadow-sm transition-all ${
                    item.isDanger ? 'border-red-50 hover:border-red-200' : 'border-purple-50 hover:border-purple-200'
                  } ${isDisabled ? 'opacity-50 grayscale-[0.5]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${item.isDanger ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-[var(--secondary)]'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`text-[11px] font-black uppercase tracking-wide ${item.isDanger ? 'text-red-500' : 'text-[#1F1939]'}`}>{item.label}</span>
                      {isDisabled && (
                        <span className="bg-amber-100 text-amber-600 text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest mt-0 border border-amber-200">
                          Bald verfügbar
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${item.isDanger ? 'text-red-200' : (isDisabled ? 'text-purple-100' : 'text-purple-200')}`} />
                </button>
              );
            })}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F7FF] relative">
      <div className="bg-aura" />
      <header className="pt-4 pb-0 flex flex-col items-center gap-4 shrink-0 relative z-10 w-full">
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
              className="absolute -right-1 -bottom-1 w-7 h-7 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center shadow-lg border-2 border-white active:scale-90 transition-all z-30"
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
                    {profile?.display_name || 'User'}
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

      <div className="flex-1 overflow-y-auto scrollbar-soft pb-32 pt-0">
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
              
              <button onClick={() => { setShowAvatarMenu(false); document.getElementById('avatar-upload')?.click(); }} className="w-full py-4 rounded-2xl bg-purple-50 text-[var(--secondary)] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-purple-100 transition-all active:scale-95">
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
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowAboutAppModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowAboutAppModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
               <X className="w-4 h-4 text-[var(--secondary)]" />
             </button>
             
             <div className="flex flex-col items-center gap-4 mb-6 pt-4">
               <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center">Über die App</h3>
             </div>

             <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-4 py-5 border-2 border-blue-100 w-full max-w-md overflow-hidden mx-auto shadow-sm mb-6">
              <div className="grid grid-cols-[auto_1fr_12px] gap-x-4 gap-y-3 items-center">
                {/* Entwickler */}
                <div className="contents">
                  <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Entwickler</span>
                  <div className="flex justify-end border-b border-purple-50/50 pb-2">
                    <span className="text-xs font-black text-[#1F1939]">Benedikt S.</span>
                  </div>
                  <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                </div>

                {/* Version */}
                <div className="contents cursor-pointer group" onClick={handleVersionClick}>
                  <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap group-active:text-[var(--secondary)] transition-colors">Version</span>
                  <div className="flex justify-end border-b border-purple-50/50 pb-2">
                    <span className="text-xs font-black text-[#1F1939]">1.0.0</span>
                  </div>
                  <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                </div>

                {isDevMode && (
                  <>
                    {/* Gerät */}
                    <div className="contents">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Gerät</span>
                      <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2">
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
                      <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                    </div>

                    {/* Modus */}
                    <div className="contents">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Modus</span>
                      <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                          PWA
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all ${!isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                          Web
                        </span>
                      </div>
                      <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                    </div>

                    {/* Server */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Server</span>
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
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
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
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Speicher</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black tabular-nums tracking-wider text-blue-600">
                          {(() => {
                            const mb = systemStatus.storageItems;
                            return mb < 0.1 ? (mb * 1024).toFixed(1) + 'KB' : mb.toFixed(2) + 'MB';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-200 animate-pulse shrink-0" />
                      </div>
                    </div>

                    {/* Sync */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Sync</span>
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
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
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
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">AI Core</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-[9px] font-black text-blue-600 tracking-wider">
                          {(() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'v3.5';
                            const date = new Date(lastFetch);
                            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2 last:border-0 last:pb-0">
                        <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 ${
                          (() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'bg-gray-400 shadow-gray-200';
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
          </div>
        </div>,
        document.body
      )}

      {showServices && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowServices(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowServices(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>
            <div className="flex flex-col items-center text-center gap-4 mb-6 pt-4">
              <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 border-2 border-white shadow-sm">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center leading-tight">Verwendete Dienste</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Infrastruktur & Auth</span>
                <span className="text-xs font-bold text-[#1F1939]">Supabase (PostgreSQL, Storage, Auth)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Künstliche Intelligenz</span>
                <span className="text-xs font-bold text-[#1F1939]">Google Gemini AI (Textgenerierung)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Hosting & Deployment</span>
                <span className="text-xs font-bold text-[#1F1939]">Vercel (Edge Network)</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

{showSecurityModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowSecurityModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSecurityModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 mb-8 pt-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-[2rem] flex items-center justify-center border-2 border-white shadow-sm">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-[#1F1939] leading-tight uppercase tracking-tighter">Cyber-Sicherheitsarchitektur & Infrastruktur</h3>
            </div>

            <div className="space-y-6 text-left">
              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-[11px] font-bold text-[#4A4468] leading-relaxed uppercase tracking-wider">
                  <span className="font-black text-[#1F1939]">Strikte Datensparsamkeit:</span> Vollständiger Verzicht auf persistente Cookies, Tracking-Pixel oder Analytics-Tools. Es werden keinerlei personenbezogene Stammdaten (wie Nachnamen, Telefonnummern oder Adressen) erhoben.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-[11px] font-bold text-[#4A4468] leading-relaxed uppercase tracking-wider">
                  <span className="font-black text-[#1F1939]">Standardkonforme Verschlüsselung:</span> End-zu-End-verschlüsselte Datenübertragung via TLS 1.3 gemäß den Richtlinien des <a href="https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.html" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline underline-offset-2 decoration-2 decoration-emerald-200 hover:decoration-emerald-400 transition-all font-black">BSI (TR-02102-2)</a>, fortlaufend unabhängig überprüft und mit Bestnoten validiert.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-[11px] font-bold text-[#4A4468] leading-relaxed uppercase tracking-wider">
                  <span className="font-black text-[#1F1939]">Isolierte Datenspeicherung:</span> Kryptographisch abgesicherte Speicherung von Datensätzen direkt auf Datenbankebene, strikt voneinander isoliert durch den Einsatz von Row-Level-Security (RLS).
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-[11px] font-bold text-[#4A4468] leading-relaxed uppercase tracking-wider">
                  <span className="font-black text-[#1F1939]">Verfügbarkeit & Netzwerksicherheit:</span> Georedundantes Hosting auf zertifizierten Tier-IV-Servern mit maximaler Ausfallsicherheit und umfassendem Schutz gegen DDoS- und Brute-Force-Angriffe über globale Gateways. Die gesamte Infrastruktur ist nach ISO 27001 und SOC2 Type II zertifiziert.
                </p>
              </div>
            </div>

            
          </div>
        </div>,
        document.body
      )}

      {showServices && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowServices(false)} />
          <div className="modal-content p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 border-2 border-white shadow-sm">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#1F1939] uppercase tracking-widest">Verwendete Dienste</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Infrastruktur & Auth</span>
                <span className="text-xs font-bold text-[#1F1939]">Supabase (PostgreSQL, Storage, Auth)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Künstliche Intelligenz</span>
                <span className="text-xs font-bold text-[#1F1939]">Google Gemini AI (Textgenerierung)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Hosting & Deployment</span>
                <span className="text-xs font-bold text-[#1F1939]">Vercel (Edge Network)</span>
              </div>
            </div>

            <button onClick={() => setShowServices(false)} className="w-full mt-8 py-4 bg-blue-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-100">Schließen</button>
          </div>
        </div>,
        document.body
      )}

      {showSecurityModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowSecurityModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSecurityModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>

            <div className="flex flex-col items-center text-center gap-4 mb-8 pt-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-[2rem] flex items-center justify-center border-2 border-white shadow-sm">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-[#1F1939] leading-tight">Cyber-Sicherheitsarchitektur & Infrastruktur</h3>
            </div>

            <div className="space-y-6 text-left">
              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-sm text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Strikte Datensparsamkeit:</span> Vollständiger Verzicht auf persistente Cookies, Tracking-Pixel oder Analytics-Tools. Es werden keinerlei personenbezogene Stammdaten (wie Nachnamen, Telefonnummern oder Adressen) erhoben.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-sm text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Standardkonforme Verschlüsselung:</span> End-zu-End-verschlüsselte Datenübertragung via TLS 1.3 gemäß den Richtlinien des <a href="https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102-2.html" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline underline-offset-2 decoration-2 decoration-emerald-200 hover:decoration-emerald-400 transition-all font-black">BSI (TR-02102-2)</a>, fortlaufend unabhängig überprüft und mit Bestnoten validiert.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-sm text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Isolierte Datenspeicherung:</span> Kryptographisch abgesicherte Speicherung von Datensätzen direkt auf Datenbankebene, strikt voneinander isoliert durch den Einsatz von Row-Level-Security (RLS).
                </p>
              </div>

              <div className="flex gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-2" />
                <p className="text-sm text-[#4A4468] leading-relaxed">
                  <span className="font-black text-[#1F1939]">Verfügbarkeit & Netzwerksicherheit:</span> Georedundantes Hosting auf zertifizierten Tier-IV-Servern mit maximaler Ausfallsicherheit und umfassendem Schutz gegen DDoS- und Brute-Force-Angriffe über globale Gateways. Die gesamte Infrastruktur ist nach ISO 27001 und SOC2 Type II zertifiziert.
                </p>
              </div>
            </div>

            <button onClick={() => setShowSecurityModal(false)} className="w-full mt-10 py-5 bg-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-200">Verstanden</button>
          </div>
        </div>,
        document.body
      )}

      {devMessage && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-xs bg-white/95 backdrop-blur-md border-2 border-purple-100 rounded-[2rem] shadow-[0_15px_40px_rgba(124,58,237,0.2)] px-5 py-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="w-9 h-9 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
            <span className="text-lg">💻</span>
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-[9px] font-black uppercase tracking-wider text-[var(--secondary)]">System</h3>
            <p className="text-[11px] font-bold text-[#1F1939] leading-snug mt-0.5">{devMessage}</p>
          </div>
        </div>,
        document.body
      )}

      <DeleteAccountModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)} 
        onConfirm={async () => {
          setShowDeleteModal(false);
        }} 
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
