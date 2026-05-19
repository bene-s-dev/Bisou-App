import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mail, ArrowRight, CheckCircle2, ShieldCheck, User, Info, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLogin, initialMode = 'login' }: LoginProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'magic-link'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [isKuss, setIsKuss] = useState(false);
  const words = ['Küsschen', 'bisschen'];
  const [wordIndex, setWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsKuss(true);
    }, 1500);

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % words.length);
        setIsFading(false);
      }, 600); // Smooth transition
    }, 4000); // Distinct pause

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ type: 'error', text: 'Login fehlgeschlagen. Prüfe deine Daten.' });
      setLoading(false);
    } else {
      onLogin();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
    } else {
      setMessage({ type: 'success', text: 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.' });
      setLoading(false);
      setMode('login');
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Prüfe dein Postfach für den Login-Link! ✨' });
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin : (mode === 'register' ? handleRegister : handleMagicLink);

  return (
    <div className="flex flex-col min-h-screen px-6 py-12 relative overflow-hidden max-w-md mx-auto">
      <div className="bg-aura" />
      
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
        {mode === 'login' && (
          <div className="text-center mb-8 select-none w-full">
            <button 
              onClick={() => navigate('/')}
              className="group transition-transform active:scale-95"
            >
              <h1 className="text-7xl font-semibold text-[var(--text-main)] mb-6 tracking-tight group-hover:text-[var(--primary)] transition-colors" style={{ fontFamily: 'Fraunces, serif' }}>
                Bisou
              </h1>
            </button>
            
            <div className="text-[var(--text)] text-xl font-bold flex items-center justify-center select-none w-full" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <div className="flex items-center justify-center">
                Nur ein&nbsp;
                <div className="relative inline-flex items-center justify-center text-[var(--primary)] h-[1.2em]">
                  <span className="invisible px-[1px] whitespace-nowrap">{words[0]}</span>
                  <span className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out px-[1px]" 
                        style={{ 
                          opacity: isFading ? 0 : 1,
                          transform: isFading ? 'translateY(-10px)' : 'translateY(0)'
                        }}>
                    {words[wordIndex]}
                  </span>
                  <div className={`absolute bottom-[-2px] left-0 h-[3px] bg-[var(--primary)] transition-all duration-700 rounded-full ${isKuss ? 'w-full opacity-30' : 'w-0 opacity-0'}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          {message && (
            <div className={`p-4 rounded-2xl mb-6 text-sm font-bold text-center animate-entrance ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="email" className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" className="input-base" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <div className="flex justify-end pr-2">
                <button type="button" onClick={() => setMode('magic-link')} className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Passwort vergessen?</button>
              </div>
              <button type="submit" disabled={loading} className="btn-action w-full mt-2">
                {loading ? 'Lädt...' : 'Einloggen ✨'}
              </button>
              <button type="button" onClick={() => navigate('/signup')} className="btn-secondary w-full">Konto erstellen</button>
              <button type="button" onClick={() => navigate('/')} className="w-full text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mt-4 hover:text-[var(--text-main)] transition-colors">← Zurück</button>
            </form>
          )}

          {mode === 'magic-link' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {message?.type === 'success' ? (
                <div className="text-center py-4">
                  <button type="button" onClick={() => { navigate('/signin'); setMode('login'); setMessage(null); }} className="btn-action">Zum Login</button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-[#1F1939] mb-2">Reset Passwort</h2>
                    <p className="text-sm text-[#4A4468]">Wir senden dir einen Link zum Einloggen.</p>
                  </div>
                  <input type="email" className="input-base" placeholder="Deine E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <button type="submit" disabled={loading} className="btn-action">{loading ? 'Sende...' : 'Link senden ✨'}</button>
                  <button type="button" onClick={() => navigate('/signin')} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Zurück zum Login</button>
                </>
              )}
            </form>
          )}

          {mode === 'register' && (
            <div className="space-y-6">
              {regStep === 1 && (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-[#1F1939] mb-2">Registrierung</h2>
                    <p className="text-sm text-[#4A4468]">Schön, dass du dabei bist! ❤️</p>
                  </div>
                  <input type="text" className="input-base" placeholder="Dein Vorname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  <input type="email" className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <div className="relative">
                    <input type="password" className="input-base" placeholder="Passwort (min. 6 Zeichen)" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <button disabled={!email || password.length < 6 || !displayName} onClick={() => setRegStep(2)} className="btn-action w-full mt-2">Weiter <ArrowRight className="w-5 h-5" /></button>
                  <button type="button" onClick={() => navigate('/signin')} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors mt-2">Bereits ein Konto? Login</button>
                  <button type="button" onClick={() => navigate('/')} className="w-full text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mt-6 hover:text-[var(--text-main)] transition-colors">← Zurück</button>
                </div>
              )}
              {regStep === 2 && (
                <form onSubmit={handleRegister} className="space-y-6 animate-entrance">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-black text-[#1F1939] mb-2">Fast fertig!</h2>
                    <p className="text-sm text-[#4A4468]">Bestätige deine Angaben und starte los.</p>
                  </div>
                  
                  <div className="bg-purple-50/50 rounded-[2rem] p-6 border border-purple-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--secondary)] shadow-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Name</p>
                        <p className="font-bold text-[#1F1939]">{displayName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--secondary)] shadow-sm">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">E-Mail</p>
                        <p className="font-bold text-[#1F1939] truncate max-w-[200px]">{email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button type="submit" disabled={loading} className="btn-action w-full">
                      {loading ? 'Wird erstellt...' : 'Konto erstellen ✨'}
                    </button>
                    <button type="button" onClick={() => setRegStep(1)} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Angaben korrigieren</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Links */}
      <div className="mt-8 flex items-center justify-center gap-6 relative z-10 select-none">
        <button onClick={() => setShowPrivacyModal(true)} className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest hover:text-[var(--secondary)] transition-colors py-2 px-1">Datenschutz</button>
        <div className="w-1 h-1 rounded-full bg-purple-200" />
        <button onClick={() => setShowImpressumModal(true)} className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest hover:text-[var(--secondary)] transition-colors py-2 px-1">Impressum</button>
      </div>

      {/* Modals */}
      {showPrivacyModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowPrivacyModal(false)} />
          <div className="modal-content p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <ShieldCheck className="w-8 h-8 text-[var(--secondary)]" />
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 tracking-tight">Datenschutz</h3>
            <p className="text-sm text-[#4A4468] font-semibold leading-relaxed mb-8 italic">
              Die Verarbeitung von Daten durch diese Anwendung erfolgt ausschließlich für persönliche oder familiäre Zwecke. Sie fällt daher gemäß Art. 2 Abs. 2 lit. c DSGVO unter das sogenannte Haushaltsprivileg, weshalb die Bestimmungen der DSGVO keine Anwendung finden.<br /><br />
              <span className="opacity-80">Dein Bene</span>
            </p>
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>,
        document.body
      )}

      {showImpressumModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowImpressumModal(false)} />
          <div className="modal-content p-8 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <span className="text-3xl font-black text-[var(--secondary)]">§</span>
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 tracking-tight">Impressum</h3>
            <p className="text-sm text-[#4A4468] font-bold leading-relaxed mb-8">
              Made with ❤️ in Freiburg
            </p>
            <button 
              onClick={() => setShowImpressumModal(false)}
              className="btn-action"
            >
              Schließen
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
