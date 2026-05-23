const fs = require('fs');
const filePath = '/Users/benedikt/Desktop/CB App/src/components/PublicLayout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the main area to not use ScalingContainer
const oldMain = `<main className={\`mx-auto flex-1 flex flex-col w-full relative z-10 \${isLandingPage ? 'max-w-5xl overflow-y-auto scrollbar-soft px-6' : 'max-w-md overflow-hidden px-4'}\`}>
        {isLandingPage ? (
          <div className="py-8">
            <Outlet />
          </div>
        ) : (
          <ScalingContainer targetWidth={400} align="top">
            <div className="w-full h-full px-4 flex flex-col">
              <Outlet />
            </div>
          </ScalingContainer>
        )}
      </main>`;

const newMain = `<main className={\`mx-auto flex-1 flex flex-col w-full relative z-10 \${isLandingPage ? 'max-w-5xl overflow-y-auto scrollbar-soft px-6' : 'max-w-md px-4'}\`}>
        {isLandingPage ? (
          <div className="py-8">
            <Outlet />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col pt-4 pb-12">
            <Outlet />
          </div>
        )}
      </main>`;

if (content.includes('ScalingContainer targetWidth={400} align="top"')) {
    content = content.replace(oldMain, newMain);
    fs.writeFileSync(filePath, content);
    console.log('Fixed PublicLayout');
} else {
    console.log('ScalingContainer not found in PublicLayout');
}
