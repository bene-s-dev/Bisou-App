import React, { useState, useEffect } from 'react';
import { Smartphone, CloudOff, Terminal, Copy } from 'lucide-react';

interface DuplicateInstanceGuardProps {
  children: React.ReactNode;
}

export default function DuplicateInstanceGuard({ children }: DuplicateInstanceGuardProps) {
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if ('locks' in navigator) {
      navigator.locks.request('bisou_app_instance_lock', { ifAvailable: true }, async (lock) => {
        if (!lock) setIsDuplicate(true);
      });
    } else {
      const channel = new BroadcastChannel('bisou_instance_check');
      channel.onmessage = (event) => {
        if (event.data.type === 'INSTANCE_ALREADY_EXISTS') setIsDuplicate(true);
      };
      channel.postMessage({ type: 'CHECK_INSTANCES' });
      return () => channel.close();
    }
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText('00mulitinstanz40');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isDuplicate) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#F8F7FF] flex items-center justify-center p-8 text-center overflow-auto">
        <div className="bg-aura grayscale opacity-50" />
        
        <div className="max-w-sm w-full relative z-10 flex flex-col items-center">
          <div className="flex flex-col items-center gap-6 mb-12">
            <div className="flex items-center gap-5">
              <Smartphone className="w-9 h-9 text-[#A29BFE]" />
              <div className="w-20 h-1.5 bg-[#A29BFE]/10 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[#A29BFE]/40 animate-[loading-bar_3s_infinite]" />
              </div>
              <div className="relative">
                <CloudOff className="w-11 h-11 text-[#4A4468] opacity-60 animate-pulse relative z-10" />
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#4A4468]/60">
              Zugriff blockiert
            </span>
          </div>

          <p className="text-[17px] text-[#4A4468] font-bold px-4 leading-relaxed mb-6">
            Bitte öffne Bisou nur einmal,<br />damit deine Daten sicher bleiben.
          </p>

          <div className="w-full bg-[#0F0F1A] border border-gray-800 rounded-lg p-4 font-mono text-left mb-6">
            <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 text-emerald-400">
                <Terminal className="w-3 h-3" />
                <span className="text-[9px] uppercase font-bold tracking-widest">Error Log</span>
               </div>
               <button onClick={copyCode} className="text-gray-500 hover:text-white transition-colors">
                <Copy className="w-3 h-3" />
               </button>
            </div>
            <code className="text-emerald-400 text-[10px] block truncate">Code: 00mulitinstanz40</code>
            {copied && <p className="text-emerald-500 text-[8px] mt-1 italic">Copied!</p>}
          </div>
        </div>

        <style>{`
          @keyframes loading-bar {
            0% { transform: translateX(-100%); opacity: 1; }
            40% { transform: translateX(-40%); opacity: 1; }
            60% { transform: translateX(-25%); opacity: 1; }
            90% { transform: translateX(-25%); opacity: 0; }
            100% { transform: translateX(-25%); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
