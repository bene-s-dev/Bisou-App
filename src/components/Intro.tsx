import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, ArrowRight, ArrowLeft, Users, Sparkles, Heart, Flame, Smartphone, Download, CheckCircle2, Moon, Eye, MessageSquare, 
  Send, UserCircle2, ShieldCheck, Zap, Lock, Info, Clock, Check, Share2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDialog } from './DialogProvider';
import ImageCropper from './ImageCropper';
import { capitalizeName } from '../lib/stringUtils';
import confetti from 'canvas-confetti';

interface IntroProps {
  onComplete: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  isIntroOnly?: boolean;
  isReplay?: boolean;
}

const ScramblingCode = () => {
  const [code, setCode] = useState('123456');
  useEffect(() => {
    const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
    const interval = setInterval(() => {
      let res = '';
      for (let i = 0; i < 6; i++) res += chars[Math.floor(Math.random() * chars.length)];
      setCode(res);
    }, 120);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-48 h-20 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-[2rem] flex items-center justify-center border-2 border-white font-mono text-xl font-black text-[var(--secondary)]">
      <span className="mr-1">CB-</span>
      <span className="tracking-widest">{code}</span>
    </div>
  );
};

const MagicClock = ({ onStop }: { onStop?: (el: HTMLElement) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    let raf: number;
    const startTime = performance.now();
    const spinDuration = 2400; // total animation time in ms

    // Target positions: hour at 90° (3 o'clock), minute at 360° (12 o'clock / 0 o'clock)
    // To make it look like a real time-lapse from 12:00 to 03:00:
    // The hour hand goes from 0° to 90° (3 hours).
    // The minute hand makes exactly 3 full rotations (3 * 360 = 1080°).
    const hourTarget = 90; // 3 o'clock
    const minuteTarget = 3 * 360; // 1080 degrees

    // Smooth Ease-In-Out Cubic profile for time-lapse acceleration and deceleration
    const easeInOutCubic = (t: number): number => 
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(elapsed / spinDuration, 1);
      const progress = easeInOutCubic(rawProgress);

      const hourAngle = progress * hourTarget;
      const minuteAngle = progress * minuteTarget;

      if (hourRef.current) {
        hourRef.current.style.transform = `rotate(${hourAngle}deg)`;
      }
      if (minuteRef.current) {
        minuteRef.current.style.transform = `rotate(${minuteAngle}deg)`;
      }

      if (rawProgress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        // Final layout values
        if (hourRef.current) hourRef.current.style.transform = `rotate(${hourTarget}deg)`;
        if (minuteRef.current) minuteRef.current.style.transform = `rotate(${minuteTarget}deg)`;
        
        // Trigger stopping handler (e.g. confetti)
        if (!firedRef.current && onStop && containerRef.current) {
          firedRef.current = true;
          onStop(containerRef.current);
        }
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [onStop]);

  return (
    <div className="relative w-24 h-24" ref={containerRef}>
      <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] flex items-center justify-center border-2 border-white relative z-10 overflow-hidden shadow-sm">
        <div className="relative w-14 h-14 border-2 border-orange-200 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-sm shadow-inner">
          {/* Hour Hand – shorter, thicker, centered perfectly */}
          <div
            ref={hourRef}
            className="absolute w-[3px] h-3.5 bg-orange-500 rounded-full"
            style={{ 
              bottom: '50%', 
              left: 'calc(50% - 1.5px)', 
              transformOrigin: 'bottom center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          />
          {/* Minute Hand – longer, thinner, centered perfectly */}
          <div
            ref={minuteRef}
            className="absolute w-[2px] h-[22px] bg-orange-400 rounded-full"
            style={{ 
              bottom: '50%', 
              left: 'calc(50% - 1px)', 
              transformOrigin: 'bottom center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          />
          {/* Center dot */}
          <div className="w-2 h-2 bg-orange-500 rounded-full z-10 relative shadow-sm" />
        </div>
      </div>
    </div>
  );
};

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
    <div className="w-24 h-24 bg-gradient-to-br from-rose-50 to-pink-50 rounded-[2.5rem] flex items-center justify-center border-2 border-white relative overflow-hidden">
      <div className="relative bg-white p-3 rounded-2xl border border-rose-100 min-w-[80px] min-h-[44px] flex items-center justify-center">
        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-tight text-center px-1">{text}<span className="animate-pulse">|</span></span>
      </div>
    </div>
  );
};


const AnimatedPhoneInstall = () => {
  return (
    <div className="relative w-24 h-24">
      <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-[2.5rem] flex items-center justify-center border-2 border-white relative overflow-hidden">
        <div className="relative">
          <Smartphone className="w-11 h-11 text-[var(--secondary)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Download className="w-5 h-5 text-[var(--secondary)] animate-bounce" style={{ animationDuration: '1.5s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimatedFlame = () => {
  const [count, setCount] = useState(1);
  useEffect(() => {
    let animationFrameId: number;
    let timeoutId: any;
    let startTime: number;
    const duration = 6000;
    const runAnimation = () => {
      startTime = Date.now();
      const update = () => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(elapsed / duration, 1);
        const ep = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        setCount(Math.floor(1 + ep * 998));
        if (p < 1) animationFrameId = requestAnimationFrame(update);
        else timeoutId = setTimeout(runAnimation, 3000);
      };
      update();
    };
    runAnimation();
    return () => { cancelAnimationFrame(animationFrameId); clearTimeout(timeoutId); };
  }, []);
  return (
    <div className="w-36 h-20 bg-gradient-to-br from-orange-50 to-red-50 rounded-[2rem] flex items-center justify-center border-2 border-white relative overflow-hidden active:scale-95 transition-all select-none scale-110 mb-8">
      <div className="flex items-center gap-2">
        <Flame className="w-8 h-8 text-orange-500 fill-orange-500 shrink-0" />
        <span className="text-3xl font-black text-orange-600 tracking-tight tabular-nums min-w-[50px] text-left">{count}</span>
      </div>
    </div>
  );
};

export default function Intro({ onComplete, deferredPrompt, onInstall, isIntroOnly, isReplay }: IntroProps) {
  const { showAlert } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const [localStep, setLocalStep] = useState(isIntroOnly ? 1 : 0);
  const step = isIntroOnly ? localStep : parseInt(new URLSearchParams(location.search).get('s') || (isReplay ? '1' : '0'));

  // Ensure replay mode forces step >= 1
  useEffect(() => {
    if (isReplay && step === 0 && !isIntroOnly) {
      navigate("?s=1", { replace: true });
    }
  }, [isReplay, step, isIntroOnly, navigate]);

  const setStep = (s: number) => { isIntroOnly ? setLocalStep(s) : navigate("?s=" + s); };

  // Mark intro as completed in the DB as soon as the user reaches the final step.
  // This prevents the intro from restarting if the PWA is opened after installation
  // without the user explicitly clicking "Im Browser weitermachen".
  useEffect(() => {
    if (step === 5 && !isReplay && !isIntroOnly) {
      (async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.from('profiles').update({ intro_completed: true }).eq('id', session.user.id);
        }
      })();
    }
  }, [step, isReplay, isIntroOnly]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayState, setDisplayState] = useState({ current: step, previous: null as number | null });
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleClockStop = useCallback((clockElement: HTMLElement) => {
    if (confettiCanvasRef.current) {
      const canvasRect = confettiCanvasRef.current.getBoundingClientRect();
      const clockRect = clockElement.getBoundingClientRect();
      
      const x = (clockRect.left + clockRect.width / 2 - canvasRect.left) / canvasRect.width;
      const y = (clockRect.top + clockRect.height / 2 - canvasRect.top) / canvasRect.height;
      
      const myConfetti = confetti.create(confettiCanvasRef.current, { resize: true });
      myConfetti({
        particleCount: 150,
        spread: 100,
        origin: { x, y },
        colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#8b5cf6', '#c4b5fd'],
        gravity: 2.5,
        ticks: 250
      });
    }
  }, []);

  const isActuallyIOS = (/iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !/Google Inc/i.test(navigator.vendor);
  const isAndroid = /android/i.test(navigator.userAgent.toLowerCase());
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
      // If we can't check and we are not in PWA mode, don't blindly trust localStorage
      setIsAlreadyInstalled(false);
    }
  }, [isPWA]);

  if (step !== displayState.current) setDisplayState({ current: step, previous: displayState.current });
  useEffect(() => {
    if (displayState.previous !== null) {
      const timer = setTimeout(() => setDisplayState(prev => ({ ...prev, previous: null })), 400);
      return () => clearTimeout(timer);
    }
  }, [displayState.previous]);

  const fetchMyProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', session.user.id).maybeSingle();
      if (data) { setUserName(data.display_name); if (data.avatar_url) setAvatarPreview(data.avatar_url); }
    }
  }, []);
  useEffect(() => { fetchMyProfile(); }, [fetchMyProfile]);

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImage(null); setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const fileName = `${session.user.id}/${Date.now()}.jpg`;
    await supabase.storage.from('avatars').upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    setAvatarPreview(publicUrl); setLoading(false);
  };

  const renderStepContent = (s: number, isOutgoing = false) => {
    const animationClass = isOutgoing ? 'animate-slide-out-left' : 'animate-slide-in-right';
    switch (s) {
      case 0: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-4 min-h-0 " + animationClass}>
          <div className="flex flex-col items-center">
            <div className="h-36 flex items-center justify-center mb-6 shrink-0">
              <div className="relative">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center border-2 border-white overflow-hidden">
                  {avatarPreview ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle2 className="w-16 h-16 text-purple-100" />}
                </div>
                <label className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center border-4 border-[#F8F7FF] cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files) { const reader = new FileReader(); reader.onload = () => setSelectedImage(reader.result as string); reader.readAsDataURL(e.target.files[0]); } }} />
                  <Camera className="w-5 h-5" />
                </label>
              </div>
            </div>
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight mb-3">Hallo {capitalizeName(userName)}! ❤️</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[260px] mx-auto">
              {avatarPreview 
                ? "Tolles Bild! Das passt perfekt zu deinem profil." 
                : "Ein Foto macht dein Profil persönlicher. Füge eins hinzu, damit dein Bisou-Partner dich direkt erkennt."}
            </p>
          </div>
        </div>
      );
      case 1: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="flex flex-col items-center">
            <div className="h-36 flex items-center justify-center mb-6 shrink-0"><ScramblingCode /></div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Partner verbinden</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Bisou ist für zwei gemacht. Tauscht nach dem Intro eure persönlichen Codes aus, um eure Konten sicher miteinander zu verknüpfen.</p>
          </div>
        </div>
      );
      case 2: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="flex flex-col items-center">
            <div className="h-36 flex items-center justify-center mb-6 shrink-0"><MagicClock onStop={handleClockStop} /></div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Tägliche Magie</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Jede Nacht werden drei Fragen für euch erstellt. Sie warten darauf, von euch entdeckt zu werden.</p>
          </div>
        </div>
      );
      case 3: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="flex flex-col items-center">
            <div className="h-36 flex items-center justify-center mb-6 shrink-0"><TypingChatBubble /></div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Gemeinsam teilen</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Erst wenn ihr beide fertig seid, könnt ihr die Antworten von eurem Bisou-Partner sehen.</p>
          </div>
        </div>
      );
      case 4: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="flex flex-col items-center">
            <div className="h-36 flex items-center justify-center mb-6 shrink-0"><AnimatedFlame /></div>
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Täglich reinschauen</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Baut eure Serie auf und sammelt tägliche Flammen. Antworten werden in Statistiken und Einblicken in eurem Profil festgehalten.</p>
          </div>
        </div>
      );
      case 5: {
        const secondaryButtonText = isReplay ? "Schließen" : "Im Browser weitermachen";
        return (
          <div className={"flex-1 flex flex-col items-center text-center px-6 min-h-0 " + animationClass}>
            {/* Centered content block */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="h-36 flex items-center justify-center mb-6 shrink-0">
                  <AnimatedPhoneInstall />
                </div>
                <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">
                  {isAlreadyInstalled ? "Bereits installiert!" : "App installieren"}
                </h2>
                <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">
                  {isAlreadyInstalled 
                    ? "Bisou ist erfolgreich auf deinem Startbildschirm installiert." 
                    : "Installiere Bisou auf deinem Startbildschirm für schnellen Zugriff – wie eine echte App."}
                </p>
              </div>
            </div>

            {/* Bottom action area */}
            <div className="w-full flex flex-col items-center gap-4 pb-4 shrink-0">
              {isAlreadyInstalled ? (
                <button 
                  onClick={onComplete}
                  className="btn-primary py-4 text-sm font-black uppercase tracking-widest w-full flex items-center justify-center gap-3"
                >
                  {isReplay ? "Schließen" : "Loslegen ✨"}
                </button>
              ) : (
                <>
                  {isActuallyIOS ? (
                    /* iOS: Show step-by-step instructions + install-like button */
                    <>
                      <div className="w-full bg-white/80 backdrop-blur-sm border-2 border-purple-50 rounded-[1.5rem] p-5 text-left space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                          <p className="text-[11px] font-bold text-[#1F1939] leading-snug">
                            Tippe unten auf <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 rounded-lg text-[var(--secondary)] font-black"><Share2 className="w-3 h-3" /> Teilen</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                          <p className="text-[11px] font-bold text-[#1F1939] leading-snug">
                            Wähle <span className="text-[var(--secondary)] font-black">"Zum Home-Bildschirm"</span>
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={onComplete}
                        className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--secondary)] transition-colors py-2 active:scale-95"
                      >
                        {secondaryButtonText}
                      </button>
                    </>
                  ) : deferredPrompt ? (
                    /* Android / desktop Chrome with install prompt available */
                    <>
                      <button 
                        onClick={onInstall}
                        className="btn-primary py-4 text-sm font-black uppercase tracking-widest w-full flex items-center justify-center gap-3"
                      >
                        <Download className="w-5 h-5" />
                        App installieren
                      </button>

                      <button 
                        onClick={onComplete}
                        className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--secondary)] transition-colors py-2 active:scale-95"
                      >
                        {secondaryButtonText}
                      </button>
                    </>
                  ) : isAndroid ? (
                    /* Android fallback when deferredPrompt is not available */
                    <>
                      <div className="w-full bg-white/80 backdrop-blur-sm border-2 border-purple-50 rounded-[1.5rem] p-5 text-left space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">1</div>
                          <p className="text-[11px] font-bold text-[#1F1939] leading-snug">
                            Tippe auf die drei Punkte <span className="font-black">(Menü)</span> oben rechts in Chrome.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-[var(--secondary)] text-white text-[10px] font-black flex items-center justify-center shrink-0">2</div>
                          <p className="text-[11px] font-bold text-[#1F1939] leading-snug">
                            Wähle <span className="text-[var(--secondary)] font-black">"App installieren"</span> oder <span className="text-[var(--secondary)] font-black">"Zum Startbildschirm hinzufügen"</span>.
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={onComplete}
                        className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--secondary)] transition-colors py-2 active:scale-95"
                      >
                        {secondaryButtonText}
                      </button>
                    </>
                  ) : (
                    /* Fallback: other browsers/platforms */
                    <>
                      <div className="w-full bg-white/80 backdrop-blur-sm border-2 border-purple-50 rounded-[1.5rem] p-5 text-center">
                        <p className="text-[11px] font-bold text-[#1F1939] leading-relaxed">
                          Nutze Safari auf iOS oder Chrome auf Android für das beste App-Erlebnis.
                        </p>
                      </div>

                      <button 
                        onClick={onComplete}
                        className="btn-primary py-4 text-sm font-black uppercase tracking-widest w-full flex items-center justify-center gap-3"
                      >
                        {secondaryButtonText}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden h-full bg-transparent relative">
      <style>{`
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          10% { transform: scale(1.2); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          position: absolute;
          width: 100%;
          height: 100%;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
      `}</style>
      <canvas ref={confettiCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      {/* Step Content with Animation Wrapper */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full max-w-md z-20">
        <div key={'curr-' + displayState.current} className="flex-1 flex flex-col justify-center">{renderStepContent(displayState.current, false)}</div>
        {displayState.previous !== null && <div key={'prev-' + displayState.previous} className="absolute inset-0 flex flex-col z-10 pointer-events-none justify-center">{renderStepContent(displayState.previous, true)}</div>}
      </div>
      <div className="px-6 w-full max-w-md shrink-0 z-20" style={{ paddingBottom: 'calc(1.5rem + var(--sab))' }}>
        <div className="quiz-prog-dots mb-5">
          {(isReplay ? [1,2,3,4,5] : [0,1,2,3,4,5]).map(i => <div key={i} className={`quiz-prog-dot ${i === step ? 'quiz-prog-dot-active' : ''}`} />)}
        </div>
        {step < 5 ? (
          <button className="btn-static py-4 text-lg font-black group shadow-none" onClick={() => setStep(step + 1)}>
            Weiter
          </button>
        ) : null}
      </div>

      {selectedImage && createPortal(<ImageCropper image={selectedImage} onCropComplete={handleCropComplete} onCancel={() => setSelectedImage(null)} />, document.body)}
      {loading && createPortal(<div className="fixed inset-0 z-[1000] bg-white/60 backdrop-blur-sm flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-100 border-t-[var(--secondary)] rounded-full animate-spin" /></div>, document.body)}
      
      <style>{`
        @keyframes pop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-slide-out-left {
          animation: slideOutLeft 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          position: absolute;
          width: 100%;
          height: 100%;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
