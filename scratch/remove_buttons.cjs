const fs = require('fs');
const profilePath = '/Users/benedikt/Desktop/CB App/src/components/Profile.tsx';
let content = fs.readFileSync(profilePath, 'utf8');

// 1. For showServices: Add X button, remove bottom button
const servicesXButton = `            <button onClick={() => setShowServices(false)} className="absolute top-6 right-6 p-2 rounded-full bg-purple-50 shadow-sm active:scale-95 transition-all z-10">\n              <X className="w-4 h-4 text-[var(--secondary)]" />\n            </button>\n`;

// inject X button right after modal-content starts
content = content.replace(
  '<div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar" onClick={e => e.stopPropagation()}>',
  '<div className="modal-content p-8 max-h-[85vh] overflow-y-auto show-scrollbar relative" onClick={e => e.stopPropagation()}>\n' + servicesXButton
);

// remove bottom button from showServices
content = content.replace(
  /<button onClick=\{\(\) => setShowServices\(false\)\} className="w-full mt-8 py-4 bg-blue-500[^>]*>Schließen<\/button>/g,
  ''
);

// 2. For showSecurityModal: Remove bottom button (X button is already there)
content = content.replace(
  /<button onClick=\{\(\) => setShowSecurityModal\(false\)\} className="w-full mt-10 py-5 bg-emerald-500[^>]*>Verstanden<\/button>/g,
  ''
);

fs.writeFileSync(profilePath, content);
console.log('done');
