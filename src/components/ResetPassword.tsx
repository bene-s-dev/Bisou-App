import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { translateError } from '../lib/translations';

export default function ResetPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Passwort erfolgreich aktualisiert! ✨' });
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: translateError(err.message) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full px-4 animate-entrance relative">
      <button onClick={() => navigate('/signin')} className="absolute left-0 top-0 p-2 rounded-full bg-white border border-purple-100 shadow-sm active:scale-95 transition-all">
        <ArrowLeft className="w-4 h-4 text-[var(--secondary)]" />
      </button>

      <div className="w-20 h-20 bg-purple-50 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-white shadow-sm">
        <KeyRound className="w-10 h-10 text-[var(--secondary)]" />
      </div>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-[#1F1939] mb-3 tracking-tight">Neues Passwort</h2>
        <p className="text-[#4A4468] text-sm font-semibold leading-relaxed max-w-[280px] mx-auto opacity-80">
          Wähle ein neues, sicheres Passwort für dein Konto.
        </p>
      </div>

      <form onSubmit={handleReset} className="w-full max-w-md space-y-6">
        {message && (
          <div className={`p-5 rounded-[22px] text-sm font-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <p className="leading-tight">{message.text}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input-base pr-12"
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--secondary)] transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-action w-full shadow-lg">
          {loading ? 'Speichere...' : 'Passwort speichern ✨'}
        </button>
      </form>
    </div>
  );
}
