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
  const [isStopped, setIsStopped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStopped(true);
      if (onStop && containerRef.current) {
        onStop(containerRef.current);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [onStop]);

  return (
    <div className="relative w-24 h-24" ref={containerRef}>
      <div className="w-24 h-24 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[2.5rem] flex items-center justify-center border-2 border-white relative z-10 overflow-hidden">
        <div className="relative w-12 h-12 border-2 border-orange-200 rounded-full flex items-center justify-center bg-white/50 backdrop-blur-sm">
          {/* Hour Hand (shorter, stops at 3 o'clock / 90deg) */}
          <div 
            className={`absolute w-1 h-3.5 bg-orange-400 rounded-full origin-bottom transition-all ${!isStopped ? 'animate-[spin_1.5s_linear_infinite]' : ''}`} 
            style={isStopped ? { bottom: '50%', transform: 'rotate(90deg)' } : { bottom: '50%' }} 
          />
          {/* Minute Hand (longer, stops at 12 o'clock / 0deg) */}
          <div 
            className={`absolute w-1 h-4.5 bg-orange-300 rounded-full origin-bottom transition-all ${!isStopped ? 'animate-[spin_0.4s_linear_infinite]' : ''}`} 
            style={isStopped ? { bottom: '50%', transform: 'rotate(0deg)' } : { bottom: '50%' }} 
          />
          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full z-10" />
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
      {/* Sparkle particles */}
      <div className="absolute -top-1 -right-1 w-3 h-3 text-[var(--secondary)] animate-ping" style={{ animationDuration: '2s' }}>
        <Sparkles className="w-3 h-3" />
      </div>
      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 text-purple-300 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}>
        <Sparkles className="w-2.5 h-2.5" />
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
        colors: ['#f59e0b', '#fbbf24', '#fcd34d', '#8b5cf6', '#c4b5fd']
      });
    }
  }, []);

  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

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
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight mb-3">Hallo {userName}! ❤️</h2>
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
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Jeden Morgen um 3 Uhr nachts kreiert Gemini drei Fragen für euch. Sie warten darauf, von euch entdeckt zu werden.</p>
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
      case 5: return (
        <div className={"flex-1 flex flex-col items-center text-center px-6 min-h-0 " + animationClass}>
          {/* Centered content block */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-36 flex items-center justify-center mb-6 shrink-0">
                <AnimatedPhoneInstall />
              </div>
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">App installieren</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">
                Installiere Bisou auf deinem Startbildschirm für schnellen Zugriff – wie eine echte App.
              </p>
            </div>
          </div>

          {/* Bottom action area */}
          <div className="w-full flex flex-col items-center gap-4 pb-4 shrink-0">
            {!isReplay && (
              <>
                {isIOS ? (
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
                  </>
                ) : deferredPrompt ? (
                  /* Android with install prompt available */
                  <button 
                    onClick={onInstall}
                    className="btn-primary py-4 text-sm font-black uppercase tracking-widest w-full flex items-center justify-center gap-3"
                  >
                    <Download className="w-5 h-5" />
                    App installieren
                  </button>
                ) : (
                  /* Fallback: no install prompt */
                  <div className="w-full bg-white/80 backdrop-blur-sm border-2 border-purple-50 rounded-[1.5rem] p-5 text-center">
                    <p className="text-[11px] font-bold text-[#1F1939] leading-relaxed">
                      Öffne Bisou in <span className="text-[var(--secondary)] font-black">Chrome</span> oder <span className="text-[var(--secondary)] font-black">Safari</span>, um die App zu installieren.
                    </p>
                  </div>
                )}

                <button 
                  onClick={onComplete}
                  className="text-[11px] font-bold text-[var(--muted)] hover:text-[var(--secondary)] transition-colors py-2 active:scale-95"
                >
                  Im Browser weitermachen
                </button>
              </>
            )}
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden h-full bg-[#F8F7FF] relative">
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
      <div className="bg-aura" />
      <canvas ref={confettiCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
      {/* Step Content with Animation Wrapper */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full max-w-md z-20">
        <div key={'curr-' + displayState.current} className="flex-1 flex flex-col justify-center">{renderStepContent(displayState.current, false)}</div>
        {displayState.previous !== null && <div key={'prev-' + displayState.previous} className="absolute inset-0 flex flex-col z-10 pointer-events-none justify-center">{renderStepContent(displayState.previous, true)}</div>}
      </div>
      <div className="px-6 pb-4 w-full max-w-md shrink-0 z-20">
        <div className="quiz-prog-dots mb-5">
          {(isReplay ? [1,2,3,4,5] : [0,1,2,3,4,5]).map(i => <div key={i} className={`quiz-prog-dot ${i === step ? 'quiz-prog-dot-active' : ''}`} />)}
        </div>
        {step < 5 ? (
          <button className="btn-static py-4 text-lg font-black group shadow-none" onClick={() => setStep(step + 1)}>
            Weiter
          </button>
        ) : isReplay ? (
          <button className="btn-static py-4 text-lg font-black group shadow-none" onClick={onComplete}>
            Schließen
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
