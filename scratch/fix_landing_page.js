const fs = require('fs');
let file = fs.readFileSync('src/landingpage/LandingPage.tsx', 'utf8');

// There are now multiple <style> blocks.
// I will just rewrite the bottom part completely.
const lastGoodPart = `        {/* Infinite Ticker */}
        <div className="w-full overflow-hidden py-2 border-y border-purple-100/50 relative mt-2">
          <div className="flex animate-ticker whitespace-nowrap gap-8 items-center">
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[var(--secondary)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-[#4A4468]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{\`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
          width: fit-content;
        }
      \`}</style>
    </section>
  );
}`;

let splitPoint = '        {/* Infinite Ticker */}';
let firstPart = file.substring(0, file.indexOf(splitPoint));
fs.writeFileSync('src/landingpage/LandingPage.tsx', firstPart + lastGoodPart);
console.log("Fixed LandingPage.tsx");
