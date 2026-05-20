import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

type DialogType = 'info' | 'success' | 'error' | 'confirm';

interface DialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: DialogType;
}

interface DialogContextType {
  showAlert: (message: string, type?: DialogType) => void;
  showConfirm: (message: string, onConfirm: () => void, options?: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<{ message: string; type: DialogType } | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void; options?: DialogOptions } | null>(null);

  const showAlert = useCallback((message: string, type: DialogType = 'info') => {
    setAlert({ message, type });
    if (type !== 'error') {
      setTimeout(() => setAlert(null), 3000);
    }
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirm(null);
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, options?: DialogOptions) => {
    setConfirm({ message, onConfirm, options });
    window.history.pushState({ modal: 'confirm' }, '');
  }, []);

  const handleConfirm = () => {
    if (confirm) {
      confirm.onConfirm();
      setConfirm(null);
      // We don't necessarily pop here as the action might navigate away
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (confirm) {
        setConfirm(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [confirm]);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Toast Alert */}
      {alert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xs animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md ${
            alert.type === 'error' ? 'bg-red-50/95 border-red-100 text-red-800' :
            alert.type === 'success' ? 'bg-green-50/95 border-green-100 text-green-800' :
            'bg-white/95 border-purple-100 text-purple-800'
          }`}>
            {alert.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            {alert.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {(alert.type === 'info' || !alert.type) && <Info className="w-5 h-5 shrink-0 text-blue-400" />}
            <p className="text-xs font-black uppercase tracking-wide leading-tight">{alert.message}</p>
            <button onClick={() => setAlert(null)} className="ml-auto p-1 hover:bg-black/5 rounded-full transition-colors">
              <X className="w-3.5 h-3.5 opacity-50" />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirm && (
        <div className="modal-backdrop">
          <div className="absolute inset-0" onClick={() => setConfirm(null)} />
          <div className="modal-content p-8 text-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto ${confirm.options?.type === 'error' ? 'bg-red-50' : 'bg-purple-50'}`}>
              <AlertCircle className={`w-8 h-8 ${confirm.options?.type === 'error' ? 'text-[var(--primary)]' : 'text-[var(--secondary)]'}`} />
            </div>
            <h3 className="text-xl font-black text-[#1F1939] mb-4 uppercase tracking-tight leading-tight">
              {confirm.options?.title || 'Bist du sicher?'}
            </h3>
            <p className="text-sm text-[#4A4468] font-bold leading-relaxed mb-8 px-2">
              {confirm.message}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleConfirm} 
                className={`btn-static py-4 text-sm ${
                  confirm.options?.type === 'error' 
                  ? 'bg-[var(--primary)] hover:bg-red-500' 
                  : ''
                }`}
              >
                {confirm.options?.confirmLabel || 'Ja, weiter'}
              </button>
              <button 
                onClick={() => setConfirm(null)} 
                className="w-full py-3 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.2em] hover:text-[var(--text-main)] transition-colors"
              >
                {confirm.options?.cancelLabel || 'Abbrechen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
