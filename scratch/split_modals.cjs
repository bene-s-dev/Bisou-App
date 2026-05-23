const fs = require('fs');
const profilePath = '/Users/benedikt/Desktop/CB App/src/components/Profile.tsx';
let content = fs.readFileSync(profilePath, 'utf8');

// 1. Add Verwendete Dienste button to array
content = content.replace(
  "{ id: 'about', label: 'Über die App', icon: Info, action: () => setShowServices(true) },",
  "{ id: 'about', label: 'Über die App', icon: Info, action: () => setShowAboutAppModal(true) },\n              { id: 'services', label: 'Verwendete Dienste', icon: Settings, action: () => setShowServices(true) },"
);

// 2. Extract grid from showServices
const gridRegex = /<div className="bg-white\/80 backdrop-blur-md rounded-\[1\.8rem\] px-4 py-5 border-2 border-blue-100 w-full max-w-md overflow-hidden mx-auto shadow-sm mb-6">\n\s*<div className="grid grid-cols-\[auto_1fr_12px\][\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>/;
const match = content.match(gridRegex);
const gridContent = match ? match[0] : '';

// Remove grid from showServices
content = content.replace(gridRegex, '');

// 3. Fix showServices title
content = content.replace(
  '<h3 className="text-lg font-black text-[#1F1939] uppercase tracking-widest text-center leading-tight">Über die App <br/> <span className="text-[10px] text-blue-500 tracking-[0.2em]">& Dienste</span></h3>',
  '<h3 className="text-lg font-black text-[#1F1939] uppercase tracking-widest">Verwendete Dienste</h3>'
);

// 4. Re-create showAboutAppModal with X button and no bottom button
const aboutAppModal = `
      {showAboutAppModal && createPortal(
        <div className="modal-backdrop px-4">
          <div className="absolute inset-0" onClick={() => setShowAboutAppModal(false)} />
          <div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setShowAboutAppModal(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">
               <X className="w-4 h-4 text-[var(--secondary)]" />
             </button>
             
             <div className="flex flex-col items-center gap-4 mb-6 pt-4">
               <h3 className="text-xl font-black text-[#1F1939] uppercase tracking-widest text-center">Über die App</h3>
             </div>

             ${gridContent}
          </div>
        </div>,
        document.body
      )}
`;

content = content.replace('{showServices && createPortal(', aboutAppModal + '\n      {showServices && createPortal(');

// 5. Ensure showAboutAppModal state exists
if (!content.includes('const [showAboutAppModal, setShowAboutAppModal]')) {
  content = content.replace('const [showServices, setShowServices] = useState(false);', 'const [showServices, setShowServices] = useState(false);\n  const [showAboutAppModal, setShowAboutAppModal] = useState(false);');
}

fs.writeFileSync(profilePath, content);
console.log('done');
