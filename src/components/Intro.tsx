import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, ArrowRight, ArrowLeft, Users, Sparkles, Heart, Flame, Smartphone, Download, CheckCircle2, Moon, Eye, BarChart3, UserCircle2, Clock, MessageCircle, X, Phone, Settings, Mail, Music, Map, Camera as CameraIcon, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ImageCropper from './ImageCropper';
import { useDialog } from './DialogProvider';
import { translateError } from '../lib/translations';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface IntroProps {
  onComplete: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  isIntroOnly?: boolean;
}

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
          <div className={'absolute w-1 h-4 bg-orange-400 rounded-full origin-bottom transition-all duration-[2000ms] ' + (stopped ? 'rotate-90' : 'animate-[spin_1.5s_linear_infinite]')} style={{ bottom: '50%' }} />
          <div className={'absolute w-1 h-5 bg-orange-300 rounded-full origin-bottom transition-all duration-[2000ms] ' + (stopped ? 'rotate-0' : 'animate-[spin_0.4s_linear_infinite]')} style={{ bottom: '50%' }} />
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
    <div className="w-24 h-24 bg-gradient-to-br from-rose-50 to-pink-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border-2 border-white relative overflow-hidden">
      <div className="relative bg-white p-3 rounded-2xl shadow-sm border border-rose-100 min-w-[80px] min-h-[44px] flex items-center justify-center">
        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest leading-tight text-center px-1">{text}<span className="animate-pulse">|</span></span>
      </div>
    </div>
  );
};


const HomeScreenGrid = () => {
  const icons = [
    <Phone className="w-2.5 h-2.5 text-white" />,
    <Settings className="w-2.5 h-2.5 text-white" />,
    <Mail className="w-2.5 h-2.5 text-white" />,
    <Music className="w-2.5 h-2.5 text-white" />,
    <Map className="w-2.5 h-2.5 text-white" />,
    <CameraIcon className="w-2.5 h-2.5 text-white" />,
    <Calendar className="w-2.5 h-2.5 text-white" />,
    <Heart className="w-2.5 h-2.5 text-white" />,
    <Clock className="w-2.5 h-2.5 text-white" />,
    <Users className="w-2.5 h-2.5 text-white" />,
    null, // Center spot for B
    <Sparkles className="w-2.5 h-2.5 text-white" />,
    <Moon className="w-2.5 h-2.5 text-white" />,
    <Eye className="w-2.5 h-2.5 text-white" />,
    <BarChart3 className="w-2.5 h-2.5 text-white" />,
    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
  ];

  return (
    <div className="w-24 h-24 grid grid-cols-4 grid-rows-4 gap-0 p-0 bg-transparent place-items-center">
      {icons.map((icon, i) => (
        <div key={i} className={`w-5 h-5 flex items-center justify-center ${i === 10 ? 'bg-white shadow-sm text-[var(--secondary)] font-serif font-bold text-sm rounded-[3px] animate-[pop_4s_ease-out_infinite]' : 'bg-blue-300 rounded-[3px] opacity-40'}`}>
          {i === 10 ? 'B' : icon}
        </div>
      ))}
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
    <div className="flex items-center gap-3.5 px-6 py-3 bg-white border-[2px] border-white rounded-full shadow-[inset_0_2px_6px_rgba(249,115,22,0.15)] active:scale-95 transition-all select-none scale-110 mb-8">
      <Flame className="w-9 h-9 text-orange-500 fill-orange-500 shrink-0" />
      <span className="text-3xl font-black text-orange-600 tracking-tight tabular-nums min-w-[65px] text-left">{count}</span>
    </div>
  );
};

export default function Intro({ onComplete, deferredPrompt, onInstall, isIntroOnly }: IntroProps) {
  const { showAlert } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const [localStep, setLocalStep] = useState(isIntroOnly ? 1 : 0);
  const step = isIntroOnly ? localStep : parseInt(new URLSearchParams(location.search).get('s') || '0');
  const setStep = (s: number) => { isIntroOnly ? setLocalStep(s) : navigate("?s=" + s); };
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [displayState, setDisplayState] = useState({ current: step, previous: null as number | null });

  // Quick fix: define isIOS here to be accessible in renderStepContent
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
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-4 min-h-0 " + animationClass}>
          <div className="h-36 sm:h-44 flex items-center justify-center mb-4 shrink-0">
            <div className="relative">
              <div className="w-32 h-32 rounded-[2.5rem] bg-white flex items-center justify-center border-2 border-white shadow-xl overflow-hidden">
                {avatarPreview ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" /> : <UserCircle2 className="w-16 h-16 text-purple-100" />}
              </div>
              <label className="absolute -right-2 -bottom-2 w-12 h-12 rounded-full bg-[var(--secondary)] text-white flex items-center justify-center shadow-lg border-4 border-[#F8F7FF] cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files) { const reader = new FileReader(); reader.onload = () => setSelectedImage(reader.result as string); reader.readAsDataURL(e.target.files[0]); } }} />
                <Camera className="w-5 h-5" />
              </label>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2">
              <h2 className="text-3xl font-black text-[#1F1939] tracking-tight mb-3">Hallo {userName}! ❤️</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[260px] mx-auto">
                {avatarPreview 
                  ? "Tolles Bild! Das passt perfekt zu deinem Profil." 
                  : "Ein Foto macht dein Profil persönlicher. Füge eins hinzu, damit dein Bisou-Partner dich direkt erkennt."}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      case 1: return (
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-4 shrink-0"><ScramblingCode /></div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2">
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Partner finden</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Bisou ist für zwei gemacht. Tauscht nach der Einführung eure persönlichen Codes aus, um eure Konten sicher miteinander zu verknüpfen.</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      case 2: return (
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-4 shrink-0"><MagicClock /></div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2">
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Tägliche Magie</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Jeden Morgen um 3 Uhr nachts kreiert Gemini drei Fragen für euch. Sie warten darauf, von euch entdeckt zu werden.</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      case 3: return (
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-4 shrink-0"><TypingChatBubble /></div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2">
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Gemeinsam teilen</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Erst wenn ihr beide fertig seid, könnt ihr die Antworten von eurem Bisou-Partner sehen.</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      case 4: return (
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-4 shrink-0"><AnimatedFlame /></div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2">
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Täglich reinschauen</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Baut eure Serie auf und sammelt tägliche Flammen. Antworten werden in Statistiken und Einblicken in eurem Profil festgehalten.</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      case 5: return (
        <div className={"flex-1 flex flex-col items-center pt-10 sm:pt-20 text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-4 shrink-0">
            <div className="relative w-24 h-24 bg-purple-100 rounded-[2.5rem] flex items-center justify-center border-[2px] border-white shadow-[inset_0_2px_6px_rgba(162,155,254,0.4)] overflow-hidden">
              <div className="flex items-center justify-center">
                <HomeScreenGrid />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 relative">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#F8F7FF] to-transparent pointer-events-none z-10" />
            <div className="pb-2 flex flex-col items-center">
              <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">App installieren</h2>
              <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mb-6 mx-auto">Installiere die Bisou-App für einen blitzschnellen Zugriff direkt von deinem Startbildschirm.</p>
              {!isIntroOnly && (deferredPrompt || isIOS) && (
                <button 
                  onClick={onInstall}
                  className="bg-[var(--secondary)] text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <Download className="w-5 h-5" />
                  App installieren
                </button>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#F8F7FF] to-transparent pointer-events-none z-10" />
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col pt-6 pb-6 overflow-hidden h-full bg-transparent relative">
      <style>{`
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          10% { transform: scale(1.2); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0); opacity: 0; }
        }
      `}</style>
      
      {/* Step Content with Animation Wrapper */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div key={'curr-' + displayState.current} className="flex-1 flex flex-col">{renderStepContent(displayState.current, false)}</div>
        {displayState.previous !== null && <div key={'prev-' + displayState.previous} className="absolute inset-0 flex flex-col z-10 pointer-events-none">{renderStepContent(displayState.previous, true)}</div>}
      </div>
      <div className="px-6 mt-auto pt-3 sm:pt-6">
        <button className="btn-static py-4 sm:py-5 text-lg font-black group shadow-none" onClick={() => step < 5 ? setStep(step + 1) : onComplete()}>
          {step === 5 ? 'Jetzt loslegen!' : 'Weiter'}
        </button>
      </div>
    </div>
  );
}
