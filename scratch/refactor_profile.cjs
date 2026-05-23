const fs = require('fs');
const profilePath = '/Users/benedikt/Desktop/CB App/src/components/Profile.tsx';
let content = fs.readFileSync(profilePath, 'utf8');

const isPWARegex = /const isPWA = window\.matchMedia.*?\n.*?\n.*?\n.*?\n/;
const isPWAContent = content.match(isPWARegex);

if (isPWAContent) {
  content = content.replace(isPWARegex, ''); // Remove from app-info case
  
  // Insert at the top of the component, just after showAboutAppModal state
  const stateVars = `const [showAboutAppModal, setShowAboutAppModal] = useState(false); // New state for About App modal`;
  content = content.replace(stateVars, stateVars + '\n\n  ' + isPWAContent[0].trim());
}

// 2. Extract the grid card content
const gridStart = '<div className="grid grid-cols-[auto_1fr_12px] gap-x-4 gap-y-3 items-center">';
const gridEnd = `                    </div>\n                  </>\n                )}\n              </div>`;
const startIndex = content.indexOf(gridStart);
const endIndex = content.indexOf(gridEnd) + gridEnd.length;
const gridContent = content.substring(startIndex, endIndex);

// 3. Replace the entire case 'app-info' block
const appInfoRegex = /case 'app-info':[\s\S]*?(?=case 'intro':)/;

const newAppInfo = `case 'app-info':
        return (
          <div className="flex flex-col gap-2 w-full max-w-md mx-auto px-4">
            {[
              { id: 'about', label: 'Über die App', icon: Info, action: () => setShowAboutAppModal(true) },
              { id: 'security', label: 'Wie wir deine Daten schützen', icon: ShieldCheck, action: () => setShowSecurityModal(true) },
              { id: 'intro', label: 'Einführung nochmal ansehen', icon: Sparkles, action: () => setActiveTab('intro') },
              { id: 'delete', label: 'Account löschen', icon: Trash2, isDanger: true, action: () => { setShowDeleteModal(true); window.history.pushState({ modal: 'delete' }, ''); } }
            ].map(item => (
              <button 
                key={item.id} 
                onClick={item.action}
                className={\`w-full flex items-center justify-between py-2.5 px-5 bg-white rounded-[1.8rem] border-2 shadow-sm transition-all \${
                  item.isDanger ? 'border-red-50 hover:border-red-200' : 'border-purple-50 hover:border-purple-200'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <div className={\`p-2 rounded-xl \${item.isDanger ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-[var(--secondary)]'}\`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={\`text-[11px] font-black uppercase tracking-wide \${item.isDanger ? 'text-red-500' : 'text-[#1F1939]'}\`}>{item.label}</span>
                  </div>
                </div>
                <ChevronRight className={\`w-3.5 h-3.5 \${item.isDanger ? 'text-red-200' : 'text-purple-200'}\`} />
              </button>
            ))}
          </div>
        );
      `;

content = content.replace(appInfoRegex, newAppInfo);

// 4. Add the About App modal at the bottom
const modalContent = `
      {showAboutAppModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowAboutAppModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowAboutAppModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all">
               <X className="w-4 h-4 text-[var(--secondary)]" />
             </button>
             
             <div className="flex flex-col items-center gap-4 mb-6 pt-4">
               <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center">Über die App</h3>
             </div>

             <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-4 py-5 border-2 border-blue-100 w-full max-w-md overflow-hidden mx-auto shadow-sm">
             ${gridContent}
             </div>
          </div>
        </div>,
        document.body
      )}
`;

content = content.replace('{showServices && createPortal(', modalContent + '\n      {showServices && createPortal(');

fs.writeFileSync(profilePath, content);
console.log('done');
