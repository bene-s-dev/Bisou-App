import { ReactNode, useState, useRef, useLayoutEffect } from 'react';

interface ScalingContainerProps {
  children: ReactNode;
  /** The target width the UI was designed for (e.g. 390 for iPhone) */
  targetWidth?: number;
  /** The target height the UI was designed for (e.g. 844 for iPhone) */
  targetHeight?: number;
  /** Whether to only scale based on width (useful for forms/keyboards) */
  onlyScaleWidth?: boolean;
  /** Vertical alignment of the container */
  align?: 'center' | 'top';
}

/**
 * A Virtual Canvas container. 
 * It treats the children as if they are on a fixed-size screen 
 * and scales that entire "screen" to fit the actual device viewport.
 */
export default function ScalingContainer({ 
  children, 
  targetWidth = 390, 
  targetHeight = 844,
  onlyScaleWidth = true, // Default to width-only to be more robust
  align = 'center'
}: ScalingContainerProps) {
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;
      
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      
      // Calculate scale
      const scaleX = vw / targetWidth;
      const scaleY = vh / targetHeight;
      
      // If onlyScaleWidth is true, we ignore height scaling
      // This prevents the UI from shrinking/jumping when the keyboard opens
      const finalScale = onlyScaleWidth ? scaleX : Math.min(scaleX, scaleY);
      
      setScale(finalScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [targetWidth, targetHeight, onlyScaleWidth]);

  return (
    <div className={`fixed inset-0 z-10 flex justify-center bg-transparent overflow-hidden ${align === 'center' ? 'items-center' : 'items-start'}`}>
      <div 
        ref={wrapperRef}
        style={{ 
          width: `${targetWidth}px`,
          height: onlyScaleWidth ? (scale ? `calc(100% / ${scale})` : '100%') : `${targetHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: align === 'center' ? 'center center' : 'top center',
          flexShrink: 0,
          position: 'relative',
          backgroundColor: 'transparent'
        }}
      >
        <div className="w-full h-full flex flex-col relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
