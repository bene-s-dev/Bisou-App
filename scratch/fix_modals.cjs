const fs = require('fs');
const profilePath = '/Users/benedikt/Desktop/CB App/src/components/Profile.tsx';
let content = fs.readFileSync(profilePath, 'utf8');

const regexToReplace = /\{showAboutAppModal && createPortal\([\s\S]*?(?=\{showSecurityModal && createPortal\()/;

const correctModals = `      {showAboutAppModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowAboutAppModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowAboutAppModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
               <X className="w-4 h-4 text-[var(--secondary)]" />
             </button>
             
             <div className="flex flex-col items-center gap-4 mb-6 pt-4">
               <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center">Über die App</h3>
             </div>

             <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-4 py-5 border-2 border-blue-100 w-full max-w-md overflow-hidden mx-auto shadow-sm mb-6">
              <div className="grid grid-cols-[auto_1fr_12px] gap-x-4 gap-y-3 items-center">
                {/* Entwickler */}
                <div className="contents">
                  <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Entwickler</span>
                  <div className="flex justify-end border-b border-purple-50/50 pb-2">
                    <span className="text-xs font-black text-[#1F1939]">Benedikt S.</span>
                  </div>
                  <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                </div>

                {/* Version */}
                <div className="contents cursor-pointer group" onClick={handleVersionClick}>
                  <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap group-active:text-[var(--secondary)] transition-colors">Version</span>
                  <div className="flex justify-end border-b border-purple-50/50 pb-2">
                    <span className="text-xs font-black text-[#1F1939]">1.0.0</span>
                  </div>
                  <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                </div>

                {isDevMode && (
                  <>
                    {/* Gerät */}
                    <div className="contents">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Gerät</span>
                      <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2">
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all \${isDesktopLocal ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}\`}>
                          Desktop
                        </span>
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] tracking-wider transition-all \${isIOSLocal ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}\`}>
                          iOS
                        </span>
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all \${isAndroid ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}\`}>
                          Android
                        </span>
                      </div>
                      <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                    </div>

                    {/* Modus */}
                    <div className="contents">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Modus</span>
                      <div className="flex flex-wrap justify-end gap-1 border-b border-purple-50/50 pb-2">
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all \${isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}\`}>
                          PWA
                        </span>
                        <span className={\`text-[9px] font-black px-1.5 py-0.5 rounded-[8px] uppercase tracking-wider transition-all \${!isPWA ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-gray-100'}\`}>
                          Web
                        </span>
                      </div>
                      <div className="border-b border-purple-50/50 pb-2 h-full w-full flex justify-end" />
                    </div>

                    {/* Server */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Server</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black text-[#1F1939] uppercase tracking-wider">
                          {(() => {
                            if (systemStatus.online === 'checking') return '...';
                            if (systemStatus.online) {
                              const latency = systemStatus.latency ?? 0;
                              if (latency <= 150) return 'schnell';
                              if (latency <= 250) return 'okay';
                              return 'langsam';
                            }
                            return 'offline';
                          })()}
                        </span>
                        {systemStatus.latency && (
                          <span className="text-[9px] font-black tabular-nums tracking-wider text-blue-600">
                            {systemStatus.latency}ms
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
                        <div className={\`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] transition-all duration-500 shrink-0 \${
                          (() => {
                            if (systemStatus.online === 'checking') return 'bg-amber-400 shadow-amber-200 animate-pulse';
                            if (systemStatus.online) {
                              const latency = systemStatus.latency ?? 0;
                              if (latency <= 150) return 'bg-green-500 shadow-green-200 animate-pulse';
                              if (latency <= 250) return 'bg-yellow-500 shadow-yellow-200 animate-pulse';
                              return 'bg-red-500 shadow-red-200 animate-pulse';
                            }
                            return 'bg-gray-400 shadow-gray-200';
                          })()
                        }\`} />
                      </div>
                    </div>

                    {/* Speicher */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Speicher</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black tabular-nums tracking-wider text-blue-600">
                          {(() => {
                            const mb = systemStatus.storageItems;
                            return mb < 0.1 ? (mb * 1024).toFixed(1) + 'KB' : mb.toFixed(2) + 'MB';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-200 animate-pulse shrink-0" />
                      </div>
                    </div>

                    {/* Sync */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">Sync</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2">
                        <span className="text-[9px] font-black text-blue-600 tracking-wider">
                          {(() => {
                            const lastSync = localStorage.getItem('last_sync_timestamp');
                            if (!lastSync) return '??';
                            const diffMs = Date.now() - new Date(lastSync).getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            if (diffMins <= 5) return 'jetzt';
                            if (diffMins < 60) return \`\${diffMins}m\`;
                            const diffHours = Math.floor(diffMins / 60);
                            if (diffHours < 24) return \`\${diffHours}h\`;
                            return \`\${Math.floor(diffHours / 24)}d\`;
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2">
                        <div className={\`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 \${
                          (() => {
                            const lastSync = localStorage.getItem('last_sync_timestamp');
                            if (!lastSync) return 'bg-gray-400 shadow-gray-200';
                            const diffMins = Math.floor((Date.now() - new Date(lastSync).getTime()) / 60000);
                            if (diffMins <= 5) return 'bg-green-500 shadow-green-200';
                            if (diffMins <= 10) return 'bg-yellow-500 shadow-yellow-200';
                            return 'bg-red-500 shadow-red-200';
                          })()
                        }\`} />
                      </div>
                    </div>

                    {/* AI Core */}
                    <div className="contents animate-in fade-in slide-in-from-top-1 duration-300">
                      <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest whitespace-nowrap">AI Core</span>
                      <div className="flex items-center justify-end gap-2 border-b border-purple-50/50 pb-2 last:border-0 last:pb-0">
                        <span className="text-[9px] font-black text-blue-600 tracking-wider">
                          {(() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'v3.5';
                            const date = new Date(lastFetch);
                            return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-end border-b border-purple-50/50 pb-2 last:border-0 last:pb-0">
                        <div className={\`w-2.5 h-2.5 rounded-full shadow-[0_0_6px] animate-pulse transition-all duration-500 shrink-0 \${
                          (() => {
                            const lastFetch = localStorage.getItem('last_question_fetch');
                            if (!lastFetch) return 'bg-gray-400 shadow-gray-200';
                            const hoursSince = (Date.now() - new Date(lastFetch).getTime()) / (1000 * 60 * 60);
                            return hoursSince <= 24 ? 'bg-blue-500 shadow-blue-200' : 'bg-red-500 shadow-red-200';
                          })()
                        }\`} />
                      </div>
                    </div>
                  </>
                )}
              </div>
             </div>
          </div>
        </div>,
        document.body
      )}

      {showServices && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowServices(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowServices(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
              <X className="w-4 h-4 text-[var(--secondary)]" />
            </button>
            <div className="flex flex-col items-center text-center gap-4 mb-6 pt-4">
              <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 border-2 border-white shadow-sm">
                <Settings className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center leading-tight">Verwendete Dienste</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Infrastruktur & Auth</span>
                <span className="text-xs font-bold text-[#1F1939]">Supabase (PostgreSQL, Storage, Auth)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Künstliche Intelligenz</span>
                <span className="text-xs font-bold text-[#1F1939]">Google Gemini AI (Textgenerierung)</span>
              </div>
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-1">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Hosting & Deployment</span>
                <span className="text-xs font-bold text-[#1F1939]">Vercel (Edge Network)</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
\n`;

content = content.replace(regexToReplace, correctModals);
fs.writeFileSync(profilePath, content);
console.log('done');
