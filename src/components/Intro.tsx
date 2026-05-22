import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, ArrowRight, ArrowLeft, Users, Sparkles, Heart, Flame, Smartphone, Download, CheckCircle2, Moon, Eye, MessageSquare, 
  Send, UserCircle2, ShieldCheck, Zap, Lock, Info, Clock, Check
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDialog } from './DialogProvider';
import ImageCropper from './ImageCropper';

interface IntroProps {
  onComplete: () => void;
  deferredPrompt?: any;
  onInstall?: () => void;
  isIntroOnly?: boolean;
}

const ScramblingCode = () => {
  const [code, setCode] = useState('CB-123456');
  useEffect(() => {
    const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789';
    const interval = setInterval(() => {
      let res = 'CB-';
      for (let i = 0; i < 6; i++) res += chars[Math.floor(Math.random() * chars.length)];
      setCode(res);
    }, 120);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="bg-white px-8 py-5 rounded-[2.5rem] border-2 border-purple-100 shadow-xl scale-110 active:scale-95 transition-all">
      <span className="text-3xl font-black text-[var(--secondary)] tracking-[0.2em] font-mono">{code}</span>
    </div>
  );
};

const MagicClock = () => {
  const [time, setTime] = useState('02:59');
  const [isAM, setIsAM] = useState(true);
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(prev => prev === '02:59' ? '03:00' : '02:59');
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="w-40 h-40 bg-white rounded-full border-[3px] border-white shadow-2xl flex flex-col items-center justify-center gap-1 scale-110">
      <div className="w-32 h-32 rounded-full border-2 border-purple-50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-purple-50/30" />
        <span className="text-4xl font-black text-[var(--secondary)] tracking-tight tabular-nums z-10">{time}</span>
        <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest z-10">System Sync</span>
      </div>
    </div>
  );
};

const TypingChatBubble = () => {
  const icons = [<Heart className="w-3 h-3 text-red-400 fill-red-400" />, <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />, <MessageSquare className="w-3 h-3 text-blue-400 fill-blue-400" />, <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />];
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
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-4 min-h-0 " + animationClass}>
          <div className="h-36 sm:h-44 flex items-center justify-center mb-6 shrink-0">
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
          <div className="pb-8">
            <h2 className="text-3xl font-black text-[#1F1939] tracking-tight mb-3">Hallo {userName}! ❤️</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[260px] mx-auto">
              {avatarPreview
                ? "Tolles Bild! Das passt perfekt zu deinem Profil."
                : "Ein Foto macht dein Profil persönlicher. Füge eins hinzu, damit dein Bisou-Partner dich direkt erkennt."}
            </p>
          </div>
        </div>
      );
      case 1: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-6 shrink-0"><ScramblingCode /></div>
          <div className="pb-8">
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Partner verbinden</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Bisou ist für zwei gemacht. Tauscht nach dem Intro eure persönlichen Codes aus, um eure Konten sicher miteinander zu verknüpfen.</p>
          </div>
        </div>
      );
      case 2: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-6 shrink-0"><MagicClock /></div>
          <div className="pb-8">
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Tägliche Magie</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Jeden Morgen um 3 Uhr nachts kreiert Gemini drei Fragen für euch. Sie warten darauf, von euch entdeckt zu werden.</p>
          </div>
        </div>
      );
      case 3: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-6 shrink-0"><TypingChatBubble /></div>
          <div className="pb-8">
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Gemeinsam teilen</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Erst wenn ihr beide fertig seid, könnt ihr die Antworten von eurem Bisou-Partner sehen.</p>
          </div>
        </div>
      );
      case 4: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-6 shrink-0"><AnimatedFlame /></div>
          <div className="pb-8">
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">Täglich reinschauen</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Baut eure Serie auf und sammelt tägliche Flammen. Antworten werden in Statistiken und Einblicken in eurem Profil festgehalten.</p>
          </div>
        </div>
      );
      case 5: return (
        <div className={"flex-1 flex flex-col items-center justify-center text-center px-6 min-h-0 " + animationClass}>
          <div className="h-32 sm:h-44 flex items-center justify-center mb-6 shrink-0">
            <div className="relative w-24 h-24 bg-purple-100 rounded-[2.5rem] flex items-center justify-center border-[2px] border-white shadow-[inset_0_2px_6px_rgba(162,155,254,0.4)] overflow-hidden">
              <div className="flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-[var(--secondary)] animate-bounce" />
              </div>
            </div>
          </div>
          <div className="pb-8">
            <h2 className="text-2xl font-black text-[#1F1939] tracking-tight mb-4 uppercase">App-Erlebnis</h2>
            <p className="text-[var(--text)] text-sm font-bold opacity-70 leading-relaxed max-w-[280px] mx-auto">Installiere Bisou über deinen Browser auf dem Homescreen, um das volle App-Erlebnis ohne Browserleiste zu genießen.</p>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#F8F7FF]">
      <div className="flex-1 flex flex-col relative min-h-0">
        {displayState.previous !== null && renderStepContent(displayState.previous, true)}
        {renderStepContent(displayState.current)}
      </div>
      
      <div className="px-6 pb-[calc(2rem+var(--sab))] pt-4 shrink-0 bg-gradient-to-t from-[#F8F7FF] via-[#F8F7FF] to-transparent z-20">
        <div className="quiz-prog-dots mb-8">
          {[0,1,2,3,4,5].map(i => <div key={i} className={`quiz-prog-dot ${i === step ? 'quiz-prog-dot-active' : ''}`} />)}
        </div>
        
        <button className="btn-static py-4 sm:py-5 text-lg font-black group shadow-none" onClick={() => step < 5 ? setStep(step + 1) : onComplete()}>
          {step === 5 ? 'Jetzt loslegen!' : 'Weiter'}
        </button>
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
