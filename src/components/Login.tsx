import React, { useState } from 'react';
import { Mail, ArrowRight, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { translateError } from '../lib/translations';
import { capitalizeName } from '../lib/stringUtils';

interface LoginProps {
  onLogin: () => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLogin, initialMode = 'login' }: LoginProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  
  // Sync mode with initialMode prop when navigating between /signin and /signup
  React.useEffect(() => {
    setMode(initialMode);
    setMessage(null);
    setRegStep(1);
  }, [initialMode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  // Auto-detect session if success message is showing (user might have confirmed in another tab/email)
  React.useEffect(() => {
    if (message?.type === 'success' && mode === 'register') {
      const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session) {
          onLogin();
        }
      };
      const interval = setInterval(checkSession, 3000);
      return () => clearInterval(interval);
    }
  }, [message, mode, onLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
      setMessage({ type: 'error', text: translateError(error.message) });
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
        emailRedirectTo: window.location.origin,
        data: {
          display_name: capitalizeName(displayName),
        },
      },
    });

    if (error) {
      setMessage({ type: 'error', text: translateError(error.message) });
      setLoading(false);
    } else {
      setMessage({ type: 'success', text: '' });
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage({ type: 'error', text: translateError(error.message) });
    } else {
      setMessage({ type: 'success', text: 'Link zum Passwort-Reset wurde gesendet! ✨' });
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin : (mode === 'register' ? handleRegister : handleForgotPassword);

  return (
    <div className="w-full min-h-full flex flex-col">
      {message && message.text && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-bold text-center animate-entrance bg-purple-50 text-[var(--secondary)] border border-purple-100 shrink-0 mt-4`}>
          {message.text}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-start pt-1 pb-8">
        <div key={mode} className="bg-white border-2 border-purple-100 rounded-[2.5rem] p-6 shadow-[var(--shadow-soft)] flex flex-col w-full max-w-md animate-entrance">
          <>
            {mode === 'login' && (
              <form onSubmit={handleSubmit} className={`space-y-4 ${shouldShake ? 'animate-shake' : ''}`}>
                <div className="text-center mb-1">
                  <h2 className="text-lg font-black text-[#1F1939]">Wieder anmelden:</h2>
                </div>

                <input type="email" className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-base pr-12" 
                    placeholder="Passwort" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    autoComplete="current-password"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--secondary)] transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex justify-end pr-2">
                  <button type="button" onClick={() => setMode('forgot-password')} className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Passwort vergessen?</button>
                </div>
                <button type="submit" disabled={loading} className="btn-static w-full mt-2">
                  {loading ? 'Lädt...' : 'Einloggen ✨'}
                </button>
                <button type="button" onClick={() => navigate('/signup')} className="btn-secondary w-full">Konto erstellen</button>
              </form>
            )}

            {mode === 'forgot-password' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {message?.type === 'success' ? (
                  <div className="text-center py-4">
                    <button type="button" onClick={() => { navigate('/signin'); setMode('login'); setMessage(null); }} className="btn-static">Zum Login</button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-2">
                      <h2 className="text-lg font-black text-[#1F1939] mb-1">Passwort ändern:</h2>
                      <p className="text-xs text-[#4A4468] font-bold opacity-60">Wir senden dir einen Link.</p>
                    </div>
                    <input type="email" className="input-base" placeholder="Deine E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                    <button type="submit" disabled={loading} className="btn-static">{loading ? 'Sende...' : 'Link senden ✨'}</button>
                  </>
                )}
              </form>
            )}

            {mode === 'register' && (
              <div className="space-y-6">
                {message?.type === 'success' ? (
                  <div className="text-center py-6 space-y-6 animate-entrance">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                      <Mail className="w-10 h-10 text-[var(--secondary)]" />
                    </div>
                    <p className="text-sm font-bold text-[#4A4468] leading-relaxed">
                      Wir haben dir einen Bestätigungslink gesendet.<br /><br />
                      <span className="text-xs opacity-70">Bitte auch im Spam-Ordner nachschauen.</span>
                    </p>
                    <button 
                      type="button" 
                      onClick={() => { setMode('login'); setMessage(null); setRegStep(1); }} 
                      className="btn-secondary w-full"
                    >
                      Zurück zum Login
                    </button>
                  </div>
                ) : (
                  <>
                    {regStep === 1 && (
                      <form onSubmit={(e) => { e.preventDefault(); setRegStep(2); }} className="space-y-4">
                        <div className="text-center mb-1">
                          <h2 className="text-lg font-black text-[#1F1939]">Bei Bisou anmelden:</h2>
                        </div>

                        <input type="text" className="input-base" placeholder="Dein Vorname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" />
                        <input type="email" className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            className="input-base pr-12" 
                            placeholder="Passwort (min. 6 Zeichen)" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            autoComplete="new-password"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--secondary)] transition-colors p-1"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <button type="submit" disabled={!email || password.length < 6 || !displayName} className="btn-static w-full mt-2">Weiter <ArrowRight className="w-5 h-5" /></button>
                      </form>
                    )}
                    {regStep === 2 && (
                      <form onSubmit={handleRegister} className="space-y-6 animate-entrance">
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-black text-[#1F1939]">Alles korrekt?</h2>
                        </div>
                        
                        <div className="bg-purple-50/50 rounded-[2rem] p-5 border border-purple-100 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--secondary)] shadow-sm">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Name</p>
                              <p className="font-bold text-xs text-[#1F1939]">{displayName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[var(--secondary)] shadow-sm">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">E-Mail</p>
                              <p className="font-bold text-xs text-[#1F1939] truncate max-w-[220px]">{email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <button type="submit" disabled={loading} className="btn-static w-full">
                            {loading ? 'Wird erstellt...' : 'Konto erstellen ✨'}
                          </button>
                          <button type="button" onClick={() => setRegStep(1)} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors text-center">Angaben korrigieren</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
            <button 
              type="button" 
              onClick={() => {
                if (mode === 'forgot-password') {
                  setMode('login');
                } else {
                  navigate('/');
                }
              }} 
              className="w-full text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mt-6 hover:text-[var(--text-main)] transition-colors text-center shrink-0"
            >
              ← Zurück
            </button>
          </>
        </div>
      </div>
    </div>
  );
}
