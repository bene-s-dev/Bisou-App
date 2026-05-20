import React, { useState, useEffect } from 'react';
import { Smartphone, CloudOff } from 'lucide-react';

interface DuplicateInstanceGuardProps {
  children: React.ReactNode;
}

export default function DuplicateInstanceGuard({ children }: DuplicateInstanceGuardProps) {
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let releaseLock: (() => void) | null = null;

    if ('locks' in navigator) {
      navigator.locks.request('bisou_app_instance_lock', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          if (isMounted) setIsDuplicate(true);
          return;
        }

        await new Promise((resolve) => {
          releaseLock = () => {
            resolve(null);
          };
        });
      }).catch(err => {
        console.error('Lock request failed:', err);
      });
    } else {
      const channel = new BroadcastChannel('bisou_instance_check');
      const checkInstance = () => {
        channel.postMessage({ type: 'CHECK_INSTANCES' });
      };
      channel.onmessage = (event) => {
        if (event.data.type === 'CHECK_INSTANCES') {
          channel.postMessage({ type: 'INSTANCE_ALREADY_EXISTS' });
        } else if (event.data.type === 'INSTANCE_ALREADY_EXISTS') {
          setIsDuplicate(true);
        }
      };
      checkInstance();
      return () => channel.close();
    }

    return () => {
      isMounted = false;
      if (releaseLock) releaseLock();
    };
  }, []);

  if (isDuplicate) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#F8F7FF] flex items-center justify-center p-8 text-center overflow-hidden">
        <div className="bg-aura grayscale opacity-50" />
        
        {/* Branding top left */}
        <div className="absolute top-8 left-8 z-50">
          <h1 className="text-2xl font-bold text-[#4A4468] tracking-tight select-none" style={{ fontFamily: 'Fraunces, serif' }}>
            Bisou
          </h1>
        </div>
        
        {/* Decorative elements in grayscale */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-gray-200/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-gray-300/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />

        <div className="max-w-sm w-full animate-entrance relative z-10 flex flex-col items-center">
          {/* Connection missing animation - Centerpiece */}
          <div className="flex flex-col items-center gap-6 mb-24 scale-110">
            <div className="flex items-center gap-5">
              <Smartphone className="w-9 h-9 text-[#A29BFE] opacity-60" />
              <div className="w-20 h-1.5 bg-[#A29BFE]/10 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-[#A29BFE]/40 animate-[loading-bar_3s_infinite]" />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-2.5 h-2.5 bg-[#FF8A8A]/80 rounded-full animate-ping" />
                </div>
                <CloudOff className="w-11 h-11 text-[#4A4468] opacity-60 animate-pulse relative z-10" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#4A4468]/60">
                Zugriff auf Server blockiert
              </span>
            </div>
          </div>

          {/* Messages at the bottom */}
          <div className="space-y-8">
            <p className="text-[17px] text-[#4A4468] font-bold px-8 leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Bitte öffne Bisou nur einmal,<br />damit deine Daten sicher bleiben.
            </p>

            <h2 className="text-[17px] font-bold text-[#4A4468] leading-[1.4] px-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Die App kann nicht laden, weil sie auf deinem Gerät mehrfach geöffnet ist.
            </h2>
          </div>
        </div>

        <style>{`
          @keyframes text-shimmer {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
          @keyframes loading-bar {
            0% { transform: translateX(-100%); opacity: 1; background-color: #A29BFE; }
            40% { transform: translateX(-40%); opacity: 1; background-color: #A29BFE; }
            60% { transform: translateX(-25%); opacity: 1; background-color: #A29BFE; }
            /* Quick Red Blinks */
            65% { background-color: #FF8A8A; }
            68% { background-color: #A29BFE; }
            71% { background-color: #FF8A8A; }
            74% { background-color: #A29BFE; }
            77% { background-color: #FF8A8A; }
            80% { background-color: #A29BFE; }
            85% { transform: translateX(-25%); opacity: 1; }
            90% { transform: translateX(-25%); opacity: 0; }
            100% { transform: translateX(-25%); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
