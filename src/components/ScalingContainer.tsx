import React, { useState, useEffect, useRef } from 'react';

interface ScalingContainerProps {
  children: React.ReactNode;
  maxHeight?: number;
  maxWidth?: number;
}

/**
 * A container that scales its content to fit within the viewport height if necessary.
 * This ensures that on very small/short devices, the entire UI is still visible without 
 * broken layouts or unreachable buttons.
 */
export default function ScalingContainer({ children, maxHeight = 760, maxWidth = 450 }: ScalingContainerProps) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      
      // Calculate scale factor based on height (priority for this app's vertical layout)
      // We only scale down if the screen is smaller than our target maxHeight
      const hScale = vh < maxHeight ? vh / maxHeight : 1;
      
      // Also check width for extreme cases (very narrow screens)
      const wScale = vw < maxWidth ? vw / maxWidth : 1;
      
      // Use the smaller scale factor, but don't go below 0.75 to maintain readability
      const finalScale = Math.max(0.75, Math.min(hScale, wScale));
      
      setScale(finalScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [maxHeight, maxWidth]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col w-full h-full origin-top items-center overflow-hidden"
    >
      <div 
        className="flex-1 flex flex-col w-full h-full transition-transform duration-300 ease-out"
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          height: `${100 / scale}%`,
          width: `${100 / scale}%`,
          maxWidth: `${maxWidth}px`,
          margin: '0 auto'
        }}
      >
        {children}
      </div>
    </div>
  );
}
