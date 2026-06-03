// src/components/ScrollToTop.jsx
// PROFESSIONAL SCROLL TO TOP COMPONENT - Optimized blend of features and simplicity
// Features: Route-based scrolling, back/forward navigation preservation, hash link support, 
// floating action button, accessibility compliant, performance optimized

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// ============================================
// CONFIGURATION
// ============================================

const SCROLL_BUTTON_THRESHOLD = 300;
const SCROLL_BEHAVIOR = 'smooth';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const isBrowser = typeof window !== 'undefined';

// ============================================
// MAIN COMPONENT - Simplified & Reliable
// ============================================

export default function ScrollToTop({ enableButton = true, buttonThreshold = SCROLL_BUTTON_THRESHOLD }) {
    const { pathname, key } = useLocation();
    const [showScrollButton, setShowScrollButton] = useState(false);
    const prevPathnameRef = useRef(pathname);
    const isBackNavigationRef = useRef(false);

    // ============================================
    // DETECT BACK/FORWARD NAVIGATION
    // ============================================
    useEffect(() => {
        if (!isBrowser) return;
        
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        isBackNavigationRef.current = navigationEntry?.type === 'back_forward';
        
        prevPathnameRef.current = pathname;
    }, [pathname]);

    // ============================================
    // SCROLL TO TOP ON ROUTE CHANGE (Core functionality)
    // ============================================
    useEffect(() => {
        // Simple, reliable scroll to top on route change
        // This ensures every page loads at the top
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        
        // Optional: Handle hash links (e.g., /page#section)
        if (window.location.hash) {
            const elementId = window.location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                        top: elementPosition - 20, // Small offset for header
                        behavior: SCROLL_BEHAVIOR
                    });
                }
            }, 100);
        }
    }, [pathname, key]);

    // ============================================
    // SCROLL BUTTON VISIBILITY
    // ============================================
    useEffect(() => {
        if (!enableButton || !isBrowser) return;
        
        const handleScroll = () => {
            const shouldShow = window.scrollY > buttonThreshold;
            setShowScrollButton(shouldShow);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, [enableButton, buttonThreshold]);

    // ============================================
    // MANUAL SCROLL TO TOP HANDLER
    // ============================================
    const handleManualScrollToTop = useCallback(() => {
        if (!isBrowser) return;
        
        window.scrollTo({
            top: 0,
            behavior: SCROLL_BEHAVIOR
        });
    }, []);

    // ============================================
    // RENDER
    // ============================================
    return (
        <>
            {/* Floating Scroll to Top Button - WCAG Compliant */}
            {enableButton && showScrollButton && (
                <button
                    onClick={handleManualScrollToTop}
                    className="fixed bottom-24 right-6 z-40 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 group"
                    aria-label="Scroll to top of page"
                    title="Scroll to top"
                >
                    <svg 
                        className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor" 
                        strokeWidth={2}
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    <span className="sr-only">Scroll to top</span>
                </button>
            )}
        </>
    );
}

// ============================================
// CUSTOM HOOK: useScrollPosition
// ============================================

export function useScrollPosition(options = {}) {
    const { threshold = 0, onScrollReached } = options;
    const [scrollPosition, setScrollPosition] = useState(0);
    const [isAtTop, setIsAtTop] = useState(true);
    const [isAtBottom, setIsAtBottom] = useState(false);
    const hasReachedThresholdRef = useRef(false);

    useEffect(() => {
        if (!isBrowser) return;

        const handleScroll = () => {
            const currentScroll = window.scrollY;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const bottomReached = currentScroll + windowHeight >= documentHeight - 50;
            
            setScrollPosition(currentScroll);
            setIsAtTop(currentScroll <= 10);
            setIsAtBottom(bottomReached);
            
            // Trigger threshold callback if threshold is set
            if (threshold > 0 && currentScroll >= threshold && !hasReachedThresholdRef.current) {
                hasReachedThresholdRef.current = true;
                onScrollReached?.();
            } else if (currentScroll < threshold) {
                hasReachedThresholdRef.current = false;
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial call
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold, onScrollReached]);

    const scrollToTop = useCallback((behavior = 'smooth') => {
        if (!isBrowser) return;
        window.scrollTo({ top: 0, behavior });
    }, []);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (!isBrowser) return;
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    }, []);

    const scrollToElement = useCallback((elementId, offset = 0, behavior = 'smooth') => {
        if (!isBrowser) return;
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - offset,
                behavior
            });
        }
    }, []);

    return {
        scrollPosition,
        isAtTop,
        isAtBottom,
        scrollToTop,
        scrollToBottom,
        scrollToElement,
        scrollProgress: (scrollPosition / (document.documentElement.scrollHeight - window.innerHeight)) * 100 || 0
    };
}

// ============================================
// SIMPLE VERSION (For minimal use cases)
// ============================================

export function SimpleScrollToTop() {
    const { pathname } = useLocation();
    
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);
    
    return null;
}
