import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Pencil, Check, Bell, BellOff, Info, X, User as UserIcon, ChevronRight, ArrowLeft, Trash2, Share2, Copy, Download, Smartphone, Users, AlertTriangle, Sparkles, Monitor, Laptop, Tablet, Settings } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';
import DeleteAccountModal from './DeleteAccountModal';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translateError } from '../lib/translations';
import Onboarding from './Onboarding';

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
  const [systemStatus, setSystemStatus] = useState<{
    online: boolean | 'checking';
    latency: number | null;
    storageItems: number;
    lastChecked: string | null;
  }>({ online: 'checking', latency: null, storageItems: 0, lastChecked: null });

  useEffect(() => {
    if (activeTab !== 'app-info') return;

    const checkStatus = async () => {
      const start = performance.now();
      try {
        const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).limit(1);
        const end = performance.now();
        
        setSystemStatus({
          online: !error,
          latency: !error ? Math.round(end - start) : null,
          storageItems: Object.keys(localStorage).length,
          lastChecked: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      } catch (e) {
        setSystemStatus({
          online: false,
          latency: null,
          storageItems: Object.keys(localStorage).length,
          lastChecked: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (showServices) window.history.pushState({ modal: 'services' }, '');
  }, [showServices]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showServices) setShowServices(false);
      if (showDeleteModal) setShowDeleteModal(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showServices, showDeleteModal]);

  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));
    setIsDesktop(!/iphone|ipad|ipod|android/.test(ua));
  }, []);

  const setActiveTab = (tab: string) => {
    if (tab === 'main') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
      if (tab === 'intro') {
        window.history.pushState({ modal: 'intro' }, '');
      }
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (activeTab === 'intro') {
        setSearchParams({});
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, setSearchParams]);

  // --- Logic ---
  const handleUpdateName = async () => {
    if (!newName.trim() || newName === profile.display_name) { setIsEditingName(false); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', profile.id);
      if (error) throw error;
      setProfile({ ...profile, display_name: newName.trim() });
      showAlert("Name aktualisiert!", "success");
    } catch (err: any) { showAlert(translateError(err.message), "error"); } finally { setLoading(false); setIsEditingName(false); }
  };

  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim() || partnerCodeInput === 'CB-') return;
    setIsLinking(true);
    try {
      const { error } = await supabase.rpc('link_partners', { partner_code_to_link: partnerCodeInput.trim() });
      if (error) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 500);
        showAlert(translateError(error.message), "error");
        return;
      }
      showAlert("Erfolgreich verknüpft! ❤️", "success");
      // App.tsx realtime will handle the rest, but we can trigger a refresh if needed
    } catch (err: any) { 
      showAlert(translateError(err.message), "error"); 
    } finally { 
      setIsLinking(false); 
      setPartnerCodeInput('CB-'); 
    }
  };

  const handleUnlinkPartner = async () => {
    showConfirm("Möchtest du die Verknüpfung wirklich aufheben?", async () => {
        setIsLinking(true);
        try {
          const { error } = await supabase.rpc('unlink_partners');
          if (error) throw error;
          showAlert("Verknüpfung gelöst.", "info");
        } catch (err: any) { showAlert(translateError(err.message), "error"); } finally { setIsLinking(false); }
      }, { title: "Verknüpfung lösen", confirmLabel: "Ja, trennen", cancelLabel: "Abbrechen" }
    );
  };

  const copyToClipboard = (text: string) => {
    const cleanText = text;
    const textArea = document.createElement("textarea");
    textArea.value = cleanText;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showAlert("Code kopiert!", "success");
  };

  const handleShareCode = async () => {
    if (!profile?.partner_code) return;
    const cleanCode = profile.partner_code.replace(/^CB-/, '');
    const shareData = { title: 'Bisou Partner-Code', text: `Verknüpf dich mit mir auf Bisou! Mein Code ist: ${cleanCode}` };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log('Teilen abgebrochen'); }
    } else { copyToClipboard(cleanCode); }
  };

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    
    try {
      if (pushPermission === 'default') {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== 'granted') {
          showAlert("Benachrichtigungen wurden blockiert.", "error");
          setIsPushLoading(false);
          return;
        }
      }
      
      setPushEnabled(!pushEnabled);
      showAlert(pushEnabled ? "Benachrichtigungen deaktiviert" : "Benachrichtigungen aktiviert", "success");
    } catch (error) {
      console.error("Error toggling push:", error);
      showAlert("Fehler bei Benachrichtigungen.", "error");
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = async () => {
    if (!profile.avatar_url) return;
    showConfirm(
      "Möchtest du dein Profilbild wirklich löschen?",
      async () => {
        setLoading(true);
        try {
          const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
          if (error) throw error;
          setProfile({ ...profile, avatar_url: null });
          showAlert("Bild gelöscht.", "info");
          setShowAvatarMenu(false);
        } catch (err) {
          showAlert("Fehler beim Löschen.", "error");
        } finally {
          setLoading(false);
        }
      },
      { title: "Bild löschen", confirmLabel: "Jetzt löschen", cancelLabel: "Abbrechen" }
    );
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null);
    setLoading(true);
    try {
      const fileName = `${profile.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);
      if (updateError) throw updateError;
      setProfile({ ...profile, avatar_url: publicUrl });
      showAlert("Profilbild aktualisiert!", "success");
    } catch (err: any) {
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
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300 px-4">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center">
              {profile?.partner_id ? 'BISOU-PARTNER' : 'BISOU-PARTNER VERBINDEN'}
            </h2>
            {profile?.partner_id ? (
              <div className="w-full flex flex-col gap-2">
                <div className="status-box pt-3 pb-8 flex flex-col items-center justify-center gap-2 text-center shrink-0 min-h-[90px] relative w-full">
                  <span className="text-[8px] font-black text-[var(--secondary)] uppercase tracking-[0.2em]">Mein Bisou-Partner:</span>
                  <span className="font-black text-lg">{partnerProfile?.display_name || 'Partner'}</span>
                  <button onClick={handleUnlinkPartner} disabled={isLinking} className="absolute bottom-2 text-[8px] font-black text-red-400 hover:text-red-500 underline uppercase tracking-[0.2em]">Verknüpfung aufheben</button>
                </div>
                <div className="text-center text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  {getDaysConnected() === 0 ? "Seit heute verknüpft" : 
                   getDaysConnected() === 1 ? "Seit 1 Tag verknüpft" : 
                   `Seit ${getDaysConnected()} Tagen verknüpft`}
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center gap-6 pt-4">
                <div className="w-full max-w-[300px] flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] pl-1">Mein Code</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-white border-2 border-purple-100 rounded-2xl px-4 py-2.5 flex items-center shadow-sm relative group overflow-hidden">
                      <span className="text-xl font-black tracking-widest text-[#1F1939] mr-1">CB-</span>
                      <span className="text-xl font-black tracking-widest text-[#1F1939] flex-1 truncate">{profile?.partner_code?.replace(/^CB-/, '')}</span>
                      <button 
                        onClick={() => copyToClipboard(profile?.partner_code?.replace(/^CB-/, ''))} 
                        className="ml-2 p-2 bg-purple-50 text-[var(--secondary)] rounded-xl hover:bg-purple-100 transition-all active:scale-90 flex items-center justify-center shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={handleShareCode} className="w-[52px] h-[52px] rounded-2xl bg-[var(--secondary)] text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className={`w-full max-w-[300px] flex flex-col gap-2 transition-all ${shouldShake ? 'animate-shake' : ''}`}>
                  <span className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] pl-1">Partner Code</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-white border-2 border-purple-100 rounded-2xl px-4 py-2.5 flex items-center shadow-sm relative overflow-hidden">
                      <span className="text-xl font-black text-[#1F1939] tracking-widest mr-1">CB-</span>
                      <input 
                        type="text" 
                        value={partnerCodeInput.replace(/^CB-/, '')} 
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                          if (val.length <= 6) setPartnerCodeInput('CB-' + val);
                        }}
                        placeholder="XXXXXX"
                        className="w-full bg-transparent text-xl font-black text-[#1F1939] outline-none placeholder:text-purple-200 tracking-widest"
                      />
                      {/* Spacer to match the copy button in the top pill for perfect alignment */}
                      <div className="w-[32px] shrink-0 ml-2" />
                    </div>
                    <button 
                      onClick={handleLinkPartner}
                      disabled={isLinking || partnerCodeInput.length < 5}
                      className="w-[52px] h-[52px] rounded-2xl bg-[var(--secondary)] text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shrink-0"
                    >
                      {isLinking ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'notifications': 
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300 px-4">
             <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em] w-full text-center">BENACHRICHTIGUNGEN</h2>
             <div className="w-full flex flex-col items-center gap-1">
                {pushPermission === 'default' ? (
                  <button 
                    onClick={() => !isPushLoading && handleTogglePush()} 
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-95 shadow-sm outline-none bg-white border-[var(--card-border)] hover:bg-purple-50/30 ${isPushLoading ? 'pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 pr-2">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[var(--card-border)] text-[var(--secondary)] flex items-center justify-center shrink-0">
                        {isPushLoading ? (<div className="w-4 h-4 border-2 border-[var(--secondary)] border-t-transparent rounded-full animate-spin" />) : (<Bell className="w-4.5 h-4.5" />)}
                      </div>
                      <span className="font-black text-[9px] uppercase tracking-widest text-left leading-tight text-[var(--text-main)]">Benachrichtigungen erlauben</span>
                    </div>
                  </button>
                ) : (
                  <div className={`w-full flex items-center justify-between p-2 rounded-2xl border-2 shadow-sm border-[var(--card-border)] ${pushEnabled ? 'bg-green-50/50' : 'bg-white'} ${isPushLoading ? 'pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 flex-1 pr-2">
                      <div className={`w-10 h-10 rounded-xl bg-white border border-[var(--card-border)] flex items-center justify-center shrink-0 ${pushEnabled ? 'text-[var(--accent-green)]' : 'text-red-400'}`}>
                        {isPushLoading ? (
                          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${pushEnabled ? 'border-[var(--accent-green)]' : 'border-red-400'}`} />
                        ) : (
                          pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`font-black text-[9px] uppercase tracking-widest text-left leading-tight ${pushEnabled ? 'text-[var(--accent-green)]' : 'text-[var(--text-main)]'}`}>
                        {pushEnabled ? 'Benachrichtigungen erhalten' : 'Keine Benachrichtigungen erhalten'}
                      </span>
                    </div>                    <button 
                      onClick={() => !isPushLoading && handleTogglePush()} 
                      className={`w-14 h-8 rounded-full transition-colors relative shrink-0 border-2 border-[var(--card-border)] cursor-pointer outline-none ${pushEnabled ? 'bg-[var(--accent-green)]' : 'bg-red-400'}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
                        <span className={`text-[9px] font-black transition-opacity ${pushEnabled ? 'text-white opacity-100' : 'opacity-0'}`}>I</span>
                        <span className={`text-[9px] font-black transition-opacity ${!pushEnabled ? 'text-white opacity-100' : 'opacity-0'}`}>O</span>
                      </div>
                      <div className={`absolute top-[2px] w-6 h-6 bg-white rounded-full shadow-sm transition-all z-10 ${pushEnabled ? 'left-[calc(100%-1.625rem)]' : 'left-[2px]'}`} />
                    </button>
                  </div>
                )}
              </div>
          </div>
        );
      case 'install':
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300 px-4">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em]">INSTALLATION</h2>
            <div className="status-box p-6 flex flex-col items-center justify-center gap-6 text-center w-full">
               {isDesktop ? (
                  <div className="p-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 mx-auto">
                      <Smartphone className="w-8 h-8 text-purple-200" />
                    </div>
                    <p className="text-[11px] font-black text-[var(--muted)] leading-tight uppercase tracking-widest">Die Installation wird nur auf Mobilgeräten unterstützt.</p>
                  </div>
                ) : isIOS ? (
                  <div className="flex flex-col gap-6 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                      <Download className="w-8 h-8 text-[var(--secondary)]" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                        <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Tippe auf den "Teilen"-Button (Quadrat mit Pfeil) unten im Browser.</p>
                      </div>
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                        <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Scrolle nach unten und wähle "Zum Home-Bildschirm".</p>
                      </div>
                    </div>
                    <Smartphone className="w-8 h-8 text-[var(--secondary)] animate-bounce mt-2" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 items-center w-full">
                    <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center shadow-inner">
                      <Download className="w-8 h-8 text-[var(--secondary)]" />
                    </div>
                    
                    {deferredPrompt ? (
                      <>
                        <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider leading-relaxed">Klicke auf den Button unten, um Bisou direkt über deinen Browser zu installieren.</p>
                        <button 
                          onClick={onInstall} 
                          className="btn-action py-4 px-6 text-[10px] font-black uppercase tracking-widest w-full shadow-lg"
                        >
                          Bisou-App jetzt installieren
                        </button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider leading-relaxed">
                          Die App ist vermutlich bereits installiert oder dein Browser unterstützt die direkte Installation nicht.
                        </p>
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Tippe auf die drei Punkte (Menü) in Chrome.</p>
                        </div>
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Wähle "App installieren" oder "Zum Startbildschirm hinzufügen".</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        );
      case 'app-info':
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
        return (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300 px-2 w-full">
            <h2 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.2em]">APP-INFORMATIONEN</h2>
            <div className="bg-white/80 backdrop-blur-md rounded-[32px] px-2 py-5 border-2 border-purple-100 w-full max-w-xl overflow-hidden">
              <div className="flex flex-col gap-2 pb-2">
                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">Entwickler</span>
                  <div className="flex-1 flex justify-end">
                    <span className="text-xs font-black text-[#1F1939]">Benedikt S.</span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">Version</span>
                  <div className="flex-1 flex justify-end">
                    <span className="text-xs font-black text-[#1F1939]">1.0.0</span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">App läuft gerade auf</span>
                  <div className="flex-1 flex justify-end gap-1 items-center">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all whitespace-nowrap ${isDesktop ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                      Desktop
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] tracking-wider transition-all whitespace-nowrap ${isIOS ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                      iOS
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all whitespace-nowrap ${isAndroid ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                      Android
                    </span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">App läuft als</span>
                  <div className="flex-1 flex justify-end gap-1 items-center">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all whitespace-nowrap ${isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                      Progressive Web App
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all whitespace-nowrap ${!isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}`}>
                      Webseite
                    </span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">Server-Verbindung</span>
                  <div className="w-[90px] flex items-center gap-2 shrink-0 pl-5">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_6px] transition-all duration-500 shrink-0 ${
                      systemStatus.online === 'checking' ? 'bg-amber-400 shadow-amber-200 animate-pulse' :
                      systemStatus.online ? 'bg-green-500 shadow-green-200 animate-pulse' : 
                      'bg-red-500 shadow-red-200 animate-bounce'
                    }`} />
                    <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">
                      {systemStatus.online === 'checking' ? 'Connecting...' : systemStatus.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex items-center">
                    <div className="flex gap-1.5 items-center">
                      {systemStatus.latency && (
                        <>
                          <span className="text-[9px] font-black tabular-nums uppercase tracking-wider text-blue-600">
                            {systemStatus.latency}
                          </span>
                          <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider">
                            ms
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider whitespace-nowrap ml-auto">
                      Antwortzeit
                    </span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">Gemini API</span>
                  <div className="w-[90px] flex items-center gap-2 shrink-0 pl-5">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 ${
                      (() => {
                        const lastFetch = localStorage.getItem('last_question_fetch') || new Date().toISOString();
                        const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
                        if (hoursSince > 24) return 'bg-red-500 shadow-red-200';
                        return 'bg-green-500 shadow-green-200';
                      })()
                    }`} />
                    <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">
                      {(() => {
                        const lastFetch = localStorage.getItem('last_question_fetch') || new Date().toISOString();
                        const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
                        return hoursSince > 24 ? 'Stale' : 'Active';
                      })()}
                    </span>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-end">
                    <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">
                      {(() => {
                        const lastFetch = localStorage.getItem('last_question_fetch') || new Date().toISOString();
                        const date = new Date(lastFetch);
                        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' • ' + 
                               date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      })()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center pb-2 border-b border-purple-50">
                  <span className="w-[120px] text-[10px] font-black text-[var(--muted)] uppercase tracking-widest shrink-0 whitespace-nowrap">Lokaler Speicher</span>
                  <div className="w-[90px] flex items-center gap-2 shrink-0 pl-5">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-200 animate-pulse shrink-0" />
                    <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider whitespace-nowrap">Aktiv</span>
                  </div>

                  <div className="flex-1 flex items-center">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[9px] font-black tabular-nums uppercase tracking-wider text-blue-600">
                        {systemStatus.storageItems}
                      </span>
                      <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider">
                        Keys
                      </span>
                    </div>
                    <span className="text-[9px] font-black text-[var(--muted)] uppercase tracking-wider whitespace-nowrap ml-auto">
                      Datensätze
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-3">
                <button 
                  onClick={() => setShowServices(true)}
                  className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 hover:opacity-70 transition-all active:scale-95 underline underline-offset-4"
                >
                  Verwendete Dienste 🔧
                </button>
              </div>
            </div>
          </div>
        );
      case 'intro':
        return createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center sm:p-4">
            {/* Backdrop Blur */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setActiveTab('main')}
            />
            
            {/* Modal Container */}
            <div className="relative w-full h-full sm:max-w-lg sm:h-[85vh] sm:max-h-[850px] bg-white/30 backdrop-blur-xl border border-white/20 sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-300">
              <Onboarding isIntroOnly onComplete={() => setActiveTab('main')} />
            </div>
          </div>,
          document.body
        );
      default:
        return (
          <div className="flex flex-col gap-2 px-4">
            {[
              { id: 'partner', label: profile?.partner_id ? 'Bisou-Partner' : 'Bisou-Partner verbinden', icon: Users },
              { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
              { id: 'install', label: 'App installieren', icon: Smartphone },
              { id: 'intro', label: 'Einführung nochmal ansehen', icon: Sparkles },
              { id: 'app-info', label: 'App-Info', icon: Info },
              { id: 'delete', label: 'Account löschen', icon: Trash2, isDanger: true }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={() => {
                  if (item.id === 'delete') {
                    setShowDeleteModal(true);
                    window.history.pushState({ modal: 'delete' }, '');
                  }
                  else setActiveTab(item.id as any);
                }} 
                className={`w-full flex items-center justify-between p-4 bg-white rounded-2xl border-2 shadow-sm transition-all ${
                  item.isDanger ? 'border-red-50 hover:border-red-200' : 'border-purple-50 hover:border-purple-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${item.isDanger ? 'text-red-400' : 'text-[var(--secondary)]'}`} />
                  <span className={`font-black text-xs uppercase tracking-widest ${item.isDanger ? 'text-red-400' : 'text-[#1F1939]'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 ${item.isDanger ? 'text-red-400' : 'text-[var(--secondary)]'}`} />
              </button>
            ))}
          </div>
        );
    }
  };

  const renderServicesModal = () => createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#2D264B]/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowServices(false)} />
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 animate-entrance border-2 border-purple-100 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] font-black text-[var(--secondary)] uppercase tracking-[0.15em]">Verwendete Dienste 🔧</h3>
          <button onClick={() => setShowServices(false)} className="p-2 text-[var(--muted)] hover:bg-purple-50 rounded-full transition-colors"><X className="w-4 h-4" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <div className="space-y-6">
            <div>
              <h4 className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 border-l-2 border-purple-200 pl-2">Kern-Technologien</h4>
              <div className="text-[11px] font-bold text-[#1F1939] leading-relaxed uppercase tracking-wider space-y-1">
                <p>React 18 & TypeScript <span className="opacity-50">(Frontend Framework)</span></p>
                <p>Vite <span className="opacity-50">(Build-Tooling)</span></p>
                <p>Supabase <span className="opacity-50">(Backend, Auth, DB)</span></p>
              </div>
            </div>
            
            <div>
              <h4 className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 border-l-2 border-purple-200 pl-2">Design & Styling</h4>
              <div className="text-[11px] font-bold text-[#1F1939] leading-relaxed uppercase tracking-wider space-y-1">
                <p>Tailwind CSS <span className="opacity-50">(Styling Framework)</span></p>
                <p>Lucide <span className="opacity-50">(Icon Library)</span></p>
              </div>
            </div>

            <div>
              <h4 className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 border-l-2 border-purple-200 pl-2">Künstliche Intelligenz</h4>
              <div className="text-[11px] font-bold text-[#1F1939] leading-relaxed uppercase tracking-wider space-y-1">
                <p>Antigravity CLI <span className="opacity-50">(Vibe-Coding)</span></p>
              </div>
            </div>
            
            <div>
              <h4 className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 border-l-2 border-purple-200 pl-2">Spezialisierte Bibliotheken</h4>
              <div className="text-[11px] font-bold text-[#1F1939] leading-relaxed uppercase tracking-wider space-y-1">
                <p>React Router <span className="opacity-50">(Navigation)</span></p>
                <p>SortableJS <span className="opacity-50">(Ranking Drag&Drop)</span></p>
                <p>React Easy Crop <span className="opacity-50">(Avatar Editor)</span></p>
                <p>Canvas Confetti <span className="opacity-50">(Animationen)</span></p>
              </div>
            </div>

            <div>
              <h4 className="text-[8px] font-black text-[var(--muted)] uppercase tracking-widest mb-2 border-l-2 border-purple-200 pl-2">Infrastruktur & Hosting</h4>
              <div className="text-[11px] font-bold text-[#1F1939] leading-relaxed uppercase tracking-wider space-y-1">
                <p>GitHub <span className="opacity-50">(Versionsverwaltung)</span></p>
                <p>Vercel <span className="opacity-50">(Hosting)</span></p>
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setShowServices(false)}
          className="w-full mt-6 py-4 bg-purple-50 text-[var(--secondary)] font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all shadow-sm"
        >
          Schließen
        </button>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="flex flex-col h-full animate-entrance">
      {selectedImage && createPortal(
        <ImageCropper image={selectedImage} onCropComplete={handleCropComplete} onCancel={() => setSelectedImage(null)} />,
        document.body
      )}
      {showDeleteModal && createPortal(
        <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={async () => { try { setLoading(true); const { error } = await supabase.from('profiles').delete().eq('id', profile.id); if (error) throw error; onLogout(); } catch (err) { showAlert("Fehler beim Löschen des Accounts.", "error"); } finally { setLoading(false); } }} />,
        document.body
      )}
      {showServices && renderServicesModal()}
      
      <header className="flex flex-col items-center pt-16 pb-2 shrink-0 relative">

        <h2 className="text-xs font-black text-[#1F1939] uppercase tracking-widest">Mein Bisou-Profil</h2>
        
        <div className="relative flex items-center mb-3 mt-4">
          <div className="w-20 h-20 rounded-[2.2rem] bg-white shadow-md flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-[var(--secondary)]" />}
          </div>
          <button 
            onClick={() => document.getElementById('avatar-upload')?.click()}
            className="absolute -right-2 bottom-0 w-8 h-8 rounded-full bg-white border border-[var(--secondary)] text-[var(--secondary)] flex items-center justify-center shadow-sm active:scale-90 transition-all z-30"
          >
            <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div className="relative flex flex-col items-center justify-center w-full mt-1 mb-6 px-4">
          {isEditingName ? (
            <div className="flex items-center gap-2 pl-4 pr-1.5 py-1.5 bg-white border-2 border-[var(--secondary)] rounded-full shadow-md w-[220px]">
              <input 
                type="text" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="flex-1 text-[15px] font-black text-[var(--secondary)] bg-transparent outline-none text-center uppercase tracking-[0.1em] pt-0.5 min-w-0" 
                autoFocus 
                onBlur={handleUpdateName} 
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()} 
              />
              <button 
                onClick={handleUpdateName} 
                className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center shadow-sm active:scale-90 transition-all shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingName(true)}
              className="flex items-center justify-center gap-3 px-6 py-2.5 bg-white border-2 border-[var(--card-border)] rounded-full cursor-pointer hover:bg-purple-50 transition-all active:scale-95 shadow-sm"
            >
              <span className="text-[15px] font-black text-[var(--secondary)] uppercase tracking-[0.1em] pt-0.5">
                {profile?.display_name || 'User'}
              </span>
              <Pencil className="w-4 h-4 text-[var(--secondary)] opacity-80" />
            </div>
          )}
        </div>
        <div className="w-[60%] h-[2px] bg-purple-100 mb-4 mx-auto" />
      </header>

      <div className="flex-1 overflow-hidden scrollbar-hide pb-32">
        {renderContent()}
      </div>

      {showAvatarMenu && createPortal(
        <div className="modal-backdrop items-end pb-10 px-4">
          <div className="absolute inset-0" onClick={() => setShowAvatarMenu(false)} />
          <div className="modal-content p-8" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-4">
              <button onClick={() => { setShowAvatarMenu(false); document.getElementById('avatar-upload')?.click(); }} className="w-full py-4 rounded-2xl bg-purple-50 text-[var(--secondary)] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-purple-100 transition-all active:scale-95"><Camera className="w-5 h-5" /> Neues Bild wählen</button>
              <button onClick={handleDeleteImage} className="w-full py-4 rounded-2xl bg-red-50 text-red-500 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 transition-all active:scale-95"><Trash2 className="w-5 h-5" /> Bild löschen</button>
              <button onClick={() => setShowAvatarMenu(false)} className="w-full py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[var(--text-main)] transition-colors mt-2">Abbrechen</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
