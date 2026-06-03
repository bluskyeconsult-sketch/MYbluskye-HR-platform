// src/components/ScrollToTop.jsx
// OPTIMIZED: Preserves scroll positions between navigations, scrolls to top only on refresh/new page
// Features: Back/forward navigation preservation, hash link support, optional scroll button

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// ============================================
// CONFIGURATION
// ============================================

const SCROLL_BUTTON_THRESHOLD = 300;
const SCROLL_BEHAVIOR = 'smooth';
const isBrowser = typeof window !== 'undefined';

// Simple scroll position storage
const scrollPositions = new Map();

// ============================================
// MAIN COMPONENT
// ============================================

export default function ScrollToTop({ enableButton = true, buttonThreshold = SCROLL_BUTTON_THRESHOLD }) {
    const { pathname, key } = useLocation();
    const [showScrollButton, setShowScrollButton] = useState(false);
    const isInitialMount = useRef(true);
    const previousPathname = useRef(pathname);
    const isBackNavigation = useRef(false);

    // ============================================
    // DETECT BACK/FORWARD NAVIGATION
    // ============================================
    useEffect(() => {
        if (!isBrowser) return;
        
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        isBackNavigation.current = navigationEntry?.type === 'back_forward';
    }, [pathname]);

    // ============================================
    // SAVE SCROLL POSITION BEFORE LEAVING
    // ============================================
    useEffect(() => {
        const savePosition = () => {
            if (previousPathname.current && !isBackNavigation.current) {
                scrollPositions.set(previousPathname.current, window.scrollY);
            }
        };
        
        window.addEventListener('beforeunload', savePosition);
        return () => window.removeEventListener('beforeunload', savePosition);
    }, []);

    // ============================================
    // HANDLE SCROLL ON ROUTE CHANGE - CORE LOGIC
    // ============================================
    useEffect(() => {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        const navigationType = navigationEntry?.type;
        
        const isPageRefresh = navigationType === 'reload';
        const isNewPage = navigationType === 'navigate' && document.referrer === '';
        
        // Save current position before navigation
        if (!isInitialMount.current && previousPathname.current !== pathname) {
            scrollPositions.set(previousPathname.current, window.scrollY);
        }
        
        // Case 1: Page refresh or new page - scroll to top
        if (isPageRefresh || isNewPage || isInitialMount.current) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
        // Case 2: Back/forward navigation - restore position
        else if (isBackNavigation.current && scrollPositions.has(pathname)) {
            const savedPosition = scrollPositions.get(pathname);
            window.scrollTo({ top: savedPosition, behavior: 'instant' });
        }
        // Case 3: Regular navigation - try to restore or stay
        else if (scrollPositions.has(pathname)) {
            const savedPosition = scrollPositions.get(pathname);
            window.scrollTo({ top: savedPosition, behavior: 'instant' });
        }
        
        // Handle hash links (e.g., /page#section)
        if (window.location.hash) {
            const elementId = window.location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({
                        top: elementPosition - 20,
                        behavior: SCROLL_BEHAVIOR
                    });
                }
            }, 100);
        }
        
        previousPathname.current = pathname;
        isInitialMount.current = false;
        
    }, [pathname, key]);

    // ============================================
    // SCROLL BUTTON VISIBILITY
    // ============================================
    useEffect(() => {
        if (!enableButton || !isBrowser) return;
        
        const handleScroll = () => {
            setShowScrollButton(window.scrollY > buttonThreshold);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        
        return () => window.removeEventListener('scroll', handleScroll);
    }, [enableButton, buttonThreshold]);

    // ============================================
    // MANUAL SCROLL TO TOP
    // ============================================
    const handleManualScrollToTop = useCallback(() => {
        if (!isBrowser) return;
        window.scrollTo({ top: 0, behavior: SCROLL_BEHAVIOR });
    }, []);

    // ============================================
    // RENDER
    // ============================================
    return (
        <>
            {enableButton && showScrollButton && (
                <button
                    onClick={handleManualScrollToTop}
                    className="fixed bottom-24 right-6 z-40 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 group"
                    aria-label="Scroll to top"
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
// SIMPLE VERSION (No button, just scroll behavior)
// ============================================

export function SimpleScrollToTop() {
    const { pathname } = useLocation();
    const isInitialMount = useRef(true);
    const scrollPositions = useRef(new Map());

    useEffect(() => {
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        const navigationType = navigationEntry?.type;
        
        const isPageRefresh = navigationType === 'reload';
        const isNewPage = navigationType === 'navigate' && document.referrer === '';
        
        if (!isInitialMount.current) {
            scrollPositions.current.set(pathname, window.scrollY);
        }
        
        if (isPageRefresh || isNewPage) {
            window.scrollTo({ top: 0, behavior: 'instant' });
        } else if (scrollPositions.current.has(pathname)) {
            const savedPosition = scrollPositions.current.get(pathname);
            window.scrollTo({ top: savedPosition, behavior: 'instant' });
        }
        
        isInitialMount.current = false;
    }, [pathname]);

    return null;
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
            
            if (threshold > 0 && currentScroll >= threshold && !hasReachedThresholdRef.current) {
                hasReachedThresholdRef.current = true;
                onScrollReached?.();
            } else if (currentScroll < threshold) {
                hasReachedThresholdRef.current = false;
            }
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        
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
