import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, ArrowRight, ArrowLeft, Users, Sparkles, Heart, Flame, Smartphone, Download, CheckCircle2, Moon, Eye, BarChart3, UserCircle2, Clock, MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';
import { translateError } from '../lib/translations';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface OnboardingProps {
  onComplete: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  isIntroOnly?: boolean;
}

// Scrambling Code Component for Step 1
const ScramblingCode = () => {
  const [code, setCode] = useState('XXXXXX');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  useEffect(() => {
    const interval = setInterval(() => {
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setCode(result);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-48 h-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2rem] flex items-center justify-center shadow-inner border-2 border-white font-mono text-xl font-black text-[var(--secondary)]">
      <span className="mr-1">CB-</span>
      <span className="tracking-widest">{code}</span>
    </div>
  );
};

// Magic Clock Component for Step 2
const MagicClock = () => {
  const [stopped, setStopped] = useState(false);
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    const timer = setTimeout(() => {
      if (isMounted.current) {
        setStopped(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.4 },
          colors: ['#FF8A8A', '#A29BFE', '#FFD700'],
          zIndex: 1000
        });
      }
    }, 2000); 
    
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative w-24 h-24">
      <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border-2 border-white relative z-10 overflow-hidden">
        <div className="relative w-12 h-12 border-2 border-orange-200 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-sm">
          {/* Hour Hand */}
          <div 
            className={`absolute w-1 h-4 bg-orange-400 rounded-full origin-bottom transition-all duration-[2000ms] ${stopped ? 'rotate-90' : 'animate-[spin_1.5s_linear_infinite]'}`}
            style={{ bottom: '50%' }}
          />
          {/* Minute Hand */}
          <div 
            className={`absolute w-0.5 h-5 bg-orange-300 rounded-full origin-bottom transition-all duration-[2000ms] ${stopped ? 'rotate-0' : 'animate-[spin_0.4s_linear_infinite]'}`}
            style={{ bottom: '50%' }}
          />
          {/* Center Point */}
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full z-10" />
        </div>
      </div>
    </div>
  );
};

// Typing Chat Bubble for Step 3
const TypingChatBubble = () => {
  const [text, setText] = useState('');
  const phrases = ['Liebes Tagebuch...', 'Heute war...', 'Wir beide...'];
  const [phraseIndex, setPhraseIndex] = useState(0);
  
  useEffect(() => {
    let currentText = '';
    let isDeleting = false;
    let charIndex = 0;
    
    const interval = setInterval(() => {
      const currentPhrase = phrases[phraseIndex];
      
      if (!isDeleting) {
        currentText = currentPhrase.slice(0, charIndex + 1);
        charIndex++;
        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          // Pause at end
          clearInterval(interval);
          setTimeout(() => {
            const newInterval = setInterval(() => {
              if (isDeleting) {
                currentText = currentPhrase.slice(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                  isDeleting = false;
                  setPhraseIndex((prev) => (prev + 1) % phrases.length);
                  clearInterval(newInterval);
                }
                setText(currentText);
              }
            }, 40);
          }, 2000);
        }
      }
      setText(currentText);
    }, 120);
    
    return () => clearInterval(interval);
  }, [phraseIndex]);

  return (
    <div className="w-24 h-24 bg-gradient-to-br from-rose-50 to-pink-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border-2 border-white relative overflow-hidden">
      <div className="relative bg-white p-3 rounded-2xl shadow-sm border border-rose-100 min-w-[80px] min-h-[44px] flex items-center justify-center">
        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-tight text-center px-1">{text}<span className="animate-pulse">|</span></span>
      </div>
    </div>
  );
};

// Animated Flame for Step 4
const AnimatedFlame = () => {
  return (
    <div className="w-24 h-24 bg-gradient-to-br from-orange-50 to-red-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner border-2 border-white relative overflow-hidden">
      <div className="relative flex items-center justify-center">
        {/* Main Flames */}
        <Flame className="w-12 h-12 text-red-500 absolute flame-main-wobble" style={{ animationDuration: '3s' }} />
        <Flame className="w-10 h-10 text-orange-500 absolute flame-main-wobble" style={{ animationDuration: '2s', animationDelay: '0.2s' }} />
        <Flame className="w-8 h-8 text-yellow-400 absolute flame-main-wobble" style={{ animationDuration: '1.5s', animationDelay: '0.4s' }} />
        
        {/* Flying Particles */}
        <div className="flame-particle one absolute w-2 h-2 bg-red-400 rounded-full blur-[1px]" style={{ animationDelay: '1s', left: '-10px' }} />
        <div className="flame-particle two absolute w-1.5 h-1.5 bg-orange-300 rounded-full blur-[1px]" style={{ animationDelay: '2s', right: '-8px' }} />
        <div className="flame-particle absolute w-1 h-1 bg-yellow-200 rounded-full blur-[1px]" style={{ animationDelay: '0.5s', top: '10px' }} />
        
        {/* Glow */}
        <div className="absolute inset-0 w-12 h-12 bg-orange-400 blur-2xl opacity-20 animate-pulse rounded-full" />
      </div>
    </div>
  );
};

export default function Onboarding({ onComplete, deferredPrompt, onInstall, isIntroOnly }: OnboardingProps) {
  const { showAlert } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use local state for step if we are just replaying the intro
  // Otherwise use URL for the real onboarding (so refresh works)
  const [localStep, setLocalStep] = useState(isIntroOnly ? 1 : 0);
  const initialStep = isIntroOnly ? '1' : '0';
  const urlStep = parseInt(new URLSearchParams(location.search).get('s') || initialStep);
  
  const step = isIntroOnly ? localStep : urlStep;
  const setStep = (s: number) => {
    if (isIntroOnly) setLocalStep(s);
    else navigate(`?s=${s}`);
  };

  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
  }, []);

  const fetchMyProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setUserName(data.display_name);
          if (data.avatar_url) setAvatarPreview(data.avatar_url);
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden des Profils im Onboarding:", err);
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showAlert("Das Bild ist zu groß (max. 10 MB).", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null);
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: currentProfile } = await supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single();
      if (currentProfile?.avatar_url) {
        const oldPath = currentProfile.avatar_url.split('/avatars/')[1];
        if (oldPath) await supabase.storage.from('avatars').remove([oldPath]);
      }

      const localUrl = URL.createObjectURL(croppedBlob);
      setAvatarPreview(localUrl);

      const fileName = `${session.user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;
      await fetchMyProfile();
    } catch (err: any) {
      showAlert("Upload fehlgeschlagen: " + translateError(err.message), "error");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = isIntroOnly ? 4 : 6;
  const lastStepIndex = isIntroOnly ? 4 : 5;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              <div className="relative">
                <div className={`w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center border-2 border-white shadow-xl overflow-hidden transition-all ${loading ? 'opacity-50' : ''}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-purple-100" />
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                      <div className="w-6 h-6 border-4 border-[var(--secondary)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <label className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center shadow-lg border-4 border-[#F8F7FF] cursor-pointer hover:scale-110 active:scale-95 transition-all group">
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={loading} />
                  <Camera className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </label>
              </div>
            </div>
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight mb-3">Hallo {userName}! ❤️</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[260px]">
              {avatarPreview 
                ? "Tolles Bild! Das passt perfekt zu deinem Profil." 
                : <>Ein Foto macht dein Profil persönlicher. Wenn du magst, klicke auf die Kamera zum Hochladen.<br />(Nur wenn du willst.)</>}
            </p>
          </div>
        );
      case 1:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              <ScramblingCode />
            </div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Partner finden</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px]">
              Bisou ist für zwei gemacht. Tauscht nach der Einführung eure persönlichen Codes aus, um eure Konten sicher miteinander zu verknüpfen.
            </p>
          </div>
        );
      case 2:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              <MagicClock />
            </div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Tägliche Magie</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px]">
              Jeden Morgen um 3 Uhr nachts kreiert Gemini drei Fragen für euch. Sie warten darauf, von euch entdeckt zu werden.
            </p>
          </div>
        );
      case 3:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              <TypingChatBubble />
            </div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Gemeinsam teilen</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px]">
              Erst wenn ihr beide fertig seid, könnt ihr die Antworten von Eurem Bisou-Partner sehen.
            </p>
          </div>
        );
      case 4:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              <AnimatedFlame />
            </div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">EURE STORY</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px]">
              Baut eure Serie auf und sammelt tägliche Flammen. Antworten werden in Statistiken und Einblicken in eurem Profil festgehalten.
            </p>
          </div>
        );
      case 5:
        return (
          <div className="flex-1 flex flex-col items-center pt-24 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-40 flex items-center justify-center mb-4">
              {isIOS ? (
                <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-lg border-2 border-purple-50">
                  <Download className="w-10 h-10 text-[var(--secondary)]" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-lg border-2 border-purple-50">
                  <Smartphone className="w-10 h-10 text-[var(--secondary)]" />
                </div>
              )}
            </div>
            <div className="w-full flex flex-col items-center">
                {isIOS ? (
                  <div className="flex flex-col gap-6 items-center w-full">
                    <h2 className="text-2xl font-black text-[#1F1939] tracking-tight uppercase">App installieren</h2>
                    <p className="text-sm font-bold text-[var(--text)] opacity-70 leading-relaxed max-w-[280px] mb-2">Für das beste Erlebnis installiere Bisou auf deinem Homescreen.</p>
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-3 text-left bg-white p-4 rounded-2xl border-2 border-purple-50 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">1</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider mb-1">Schritt 1</p>
                          <p className="text-[11px] font-bold text-[#1F1939] opacity-70 leading-tight flex items-center gap-2">
                            Tippe auf den "Teilen"-Button <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center inline-flex"><Download className="w-3.5 h-3.5 text-blue-500 rotate-180" /></div> unten.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-left bg-white p-4 rounded-2xl border-2 border-purple-50 shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">2</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider mb-1">Schritt 2</p>
                          <p className="text-[11px] font-bold text-[#1F1939] opacity-70 leading-tight flex items-center gap-2">
                            Wähle "Zum Home-Bildschirm" <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center inline-flex text-lg">⊕</div>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 items-center w-full">
                    <h2 className="text-2xl font-black text-[#1F1939] tracking-tight uppercase">App installieren</h2>
                    
                    {deferredPrompt ? (
                      <p className="text-sm font-bold text-[var(--text)] opacity-70 leading-relaxed max-w-xs text-center">Installiere Bisou für einen blitzschnellen Zugriff direkt von deinem&nbsp;Startbildschirm.</p>
                    ) : (
                      <div className="space-y-4 w-full">
                        <p className="text-sm font-bold text-[var(--text)] opacity-70 leading-relaxed">Öffne dein Browser-Menü und wähle "App installieren".</p>
                        <div className="flex items-center gap-3 text-left bg-white p-4 rounded-2xl border-2 border-purple-50 shadow-sm">
                          <div className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">1</div>
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Tippe auf die drei Punkte (Menü) in Chrome.</p>
                        </div>
                        <div className="flex items-center gap-3 text-left bg-white p-4 rounded-2xl border-2 border-purple-50 shadow-sm">
                          <div className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm">2</div>
                          <p className="text-[10px] font-bold text-[#1F1939] uppercase tracking-wider">Wähle "App installieren".</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (step < lastStepIndex) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-6 pb-6 overflow-hidden h-full bg-white relative">
      {selectedImage && createPortal(
        <ImageCropper 
          image={selectedImage} 
          onCropComplete={handleCropComplete} 
          onCancel={() => setSelectedImage(null)} 
        />,
        document.body
      )}

      {/* Progress Dots Header */}
      <header className="px-6 mb-8 flex items-center justify-between gap-4">
        {isIntroOnly ? (
          <button onClick={onComplete} className="p-2 -ml-2 hover:bg-purple-50 rounded-full transition-colors text-[var(--secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : <div className="w-9" />}
        
        <div className="quiz-prog-dots flex justify-center gap-1.5 flex-1">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const actualIndex = isIntroOnly ? i + 1 : i;
            return (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === actualIndex ? 'w-8 bg-[var(--secondary)]' : (actualIndex < step ? 'w-1.5 bg-[var(--secondary)] opacity-30' : 'w-1.5 bg-purple-100')
                }`} 
              />
            );
          })}
        </div>
        
        {isIntroOnly ? (
          <button onClick={onComplete} className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest hover:text-[var(--secondary)] transition-colors pr-2">
            Skip
          </button>
        ) : <div className="w-9" />}
      </header>

      <div className="flex-1 flex flex-col">
        {renderStep()}
      </div>

      <div className="px-6 mt-auto pt-6">
        {(step === 5 || (isIntroOnly && step === 4)) && deferredPrompt && !isIntroOnly ? (
          <button 
            disabled={loading}
            onClick={onInstall}
            className="btn-action py-5 text-lg font-black group shadow-xl mb-4"
          >
            App jetzt installieren ✨
          </button>
        ) : (
          <button 
            disabled={loading}
            onClick={handleNext}
            className="btn-action py-5 text-lg font-black group shadow-xl"
          >
            {step === lastStepIndex ? (isIntroOnly ? 'Schließen' : 'Jetzt loslegen! 🚀') : 'Weiter'} 
            {step < lastStepIndex && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
          </button>
        )}
        
        {step === 5 && !isIntroOnly && (
          <button 
            onClick={onComplete}
            className="w-full text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mt-2 opacity-50 hover:opacity-100 transition-opacity py-2"
          >
            {deferredPrompt ? 'Später installieren & starten' : 'Vorerst überspringen'}
          </button>
        )}
      </div>
    </div>
  );
}
