// src/components/ResponsiveWrapper.jsx - Mobile-first wrapper
import { useState, useEffect } from 'react';

export default function ResponsiveWrapper({ children, mobileBreakpoint = 768 }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < mobileBreakpoint);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, [mobileBreakpoint]);

    return (
        <div className={isMobile ? 'mobile-view' : 'desktop-view'}>
            {children}
        </div>
    );
}

// Hook for responsive detection
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < breakpoint);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, [breakpoint]);

    return isMobile;
}
