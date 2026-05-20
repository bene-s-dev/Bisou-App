import React, { useState } from 'react';
import { Mail, ArrowRight, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { translateError } from '../lib/translations';

interface LoginProps {
  onLogin: () => void;
  initialMode?: 'login' | 'register';
}

export default function Login({ onLogin, initialMode = 'login' }: LoginProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'magic-link'>(initialMode);
  
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
        data: {
          display_name: displayName,
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
      setMessage({ type: 'error', text: translateError(error.message) });
    } else {
      setMessage({ type: 'success', text: 'Prüfe dein Postfach für den Login-Link! ✨' });
    }
    setLoading(false);
  };

  const handleSubmit = mode === 'login' ? handleLogin : (mode === 'register' ? handleRegister : handleMagicLink);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {message && message.text && (
        <div className={`p-4 rounded-2xl mb-6 text-sm font-bold text-center animate-entrance bg-purple-50 text-[var(--secondary)] border border-purple-100 shrink-0`}>
          {message.text}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="bg-white border-2 border-purple-100 rounded-[2.5rem] p-8 shadow-[var(--shadow-soft)]">
          <>
            {mode === 'login' && (
              <form onSubmit={handleSubmit} className={`space-y-4 ${shouldShake ? 'animate-shake' : ''}`}>
                <input type="email" autoFocus className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-base pr-12" 
                    placeholder="Passwort" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
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
                  <button type="button" onClick={() => setMode('magic-link')} className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Passwort vergessen?</button>
                </div>
                <button type="submit" disabled={loading} className="btn-action-animated w-full mt-2">
                  {loading ? 'Lädt...' : 'Einloggen ✨'}
                </button>
                <button type="button" onClick={() => navigate('/signup')} className="btn-secondary w-full">Konto erstellen</button>
              </form>
            )}

            {mode === 'magic-link' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {message?.type === 'success' ? (
                  <div className="text-center py-4">
                    <button type="button" onClick={() => { navigate('/signin'); setMode('login'); setMessage(null); }} className="btn-action-animated">Zum Login</button>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-black text-[#1F1939] mb-2">Reset Passwort</h2>
                      <p className="text-sm text-[#4A4468]">Wir senden dir einen Link zum Einloggen.</p>
                    </div>
                    <input type="email" autoFocus className="input-base" placeholder="Deine E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <button type="submit" disabled={loading} className="btn-action-animated">{loading ? 'Sende...' : 'Link senden ✨'}</button>
                    <button type="button" onClick={() => navigate('/signin')} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Zurück zum Login</button>
                  </>
                )}
              </form>
            )}

            {mode === 'register' && (
              <div className="space-y-6">
                {message?.type === 'success' ? (
                  <div className="text-center py-8 space-y-6 animate-entrance">
                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                      <Mail className="w-10 h-10 text-[var(--secondary)]" />
                    </div>
                    <p className="text-sm font-bold text-[#4A4468] leading-relaxed">
                      Wir haben dir einen Bestätigungslink gesendet.<br />
                      <span className="text-[var(--secondary)]">Prüfe jetzt deine Mails!</span>
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
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-black text-[#1F1939]">Bisou-Profil erstellen</h2>
                        </div>
                        <input type="text" autoFocus className="input-base" placeholder="Dein Vorname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                        <input type="email" className="input-base" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <div className="relative">
                          <input 
                            type={showPassword ? "text" : "password"} 
                            className="input-base pr-12" 
                            placeholder="Passwort (min. 6 Zeichen)" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--secondary)] transition-colors p-1"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        <button disabled={!email || password.length < 6 || !displayName} onClick={() => setRegStep(2)} className="btn-action-animated w-full mt-2">Weiter <ArrowRight className="w-5 h-5" /></button>
                      </div>
                    )}
                    {regStep === 2 && (
                      <form onSubmit={handleRegister} className="space-y-6 animate-entrance">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-black text-[#1F1939]">Alles korrekt?</h2>
                        </div>
                        
                        <div className="bg-purple-50/50 rounded-[2rem] p-6 border border-purple-100 space-y-4">
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
                          <button type="submit" disabled={loading} className="btn-action-animated w-full">
                            {loading ? 'Wird erstellt...' : 'Konto erstellen ✨'}
                          </button>
                          <button type="button" onClick={() => setRegStep(1)} className="w-full text-sm font-bold text-[var(--muted)] hover:text-[var(--text-main)] transition-colors">Angaben korrigieren</button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>
            )}
            <button type="button" onClick={() => navigate('/')} className="w-full text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] mt-8 hover:text-[var(--text-main)] transition-colors text-center pb-8">← Zurück</button>
          </>
        </div>
      </div>
    </div>
  );
}
