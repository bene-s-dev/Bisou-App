const fs = require('fs');
const profilePath = '/Users/benedikt/Desktop/CB App/src/components/Profile.tsx';
let content = fs.readFileSync(profilePath, 'utf8');

// 1. Remove the "Verwendete Dienste" button from the array
content = content.replace("              { id: 'services', label: 'Verwendete Dienste', icon: Settings, action: () => setShowServices(true) },\n", "");

// 2. Change "Über die App" button to open showServices
content = content.replace(
  "{ id: 'about', label: 'Über die App', icon: Info, action: () => setShowAboutAppModal(true) },",
  "{ id: 'about', label: 'Über die App', icon: Info, action: () => setShowServices(true) },"
);

// 3. Extract the grid from showAboutAppModal
const gridRegex = /<div className="grid grid-cols-\[auto_1fr_12px\][\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>,\n\s*document\.body\n\s*\)/;
const match = content.match(gridRegex);
if (!match) {
  console.error("Could not find grid content");
  process.exit(1);
}
let gridContent = match[0];
// We only want up to the closing div of the grid wrapper (which is the second last </div> before document.body)
// Actually let's just use regex to get the grid:
const pureGridMatch = content.match(/<div className="grid grid-cols-\[auto_1fr_12px\][\s\S]*?(?=<\/div>\n\s*<\/div>\n\s*<\/div>,\n\s*document\.body)/);
let pureGrid = pureGridMatch[0];

// 4. Remove the entire showAboutAppModal
const aboutModalRegex = /\{showAboutAppModal && createPortal\([\s\S]*?(?=document\.body\n\s*\)\n)/;
content = content.replace(aboutModalRegex, '');
content = content.replace(/document\.body\n\s*\)\n/, ''); // Clean up the rest of the modal

// 5. Inject the pureGrid into showServices modal
const servicesModalRegex = /(<h3 className="text-lg font-black text-\[#1F1939\] uppercase tracking-widest">Verwendete Dienste<\/h3>\n\s*<\/div>)/;
content = content.replace(servicesModalRegex, `$1\n            \n            <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] px-4 py-5 border-2 border-blue-100 w-full max-w-md overflow-hidden mx-auto shadow-sm mb-6">\n              ${pureGrid}\n            </div>`);

// Also change the title to 'Über die App & Dienste'
content = content.replace(
  '<h3 className="text-lg font-black text-[#1F1939] uppercase tracking-widest">Verwendete Dienste</h3>',
  '<h3 className="text-lg font-black text-[#1F1939] uppercase tracking-widest text-center leading-tight">Über die App <br/> <span className="text-[10px] text-blue-500 tracking-[0.2em]">& Dienste</span></h3>'
);

fs.writeFileSync(profilePath, content);
console.log('done');
