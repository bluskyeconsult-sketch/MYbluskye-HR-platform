// src/components/ScrollToTop.jsx
// COMPLETE PROFESSIONAL SCROLL TO TOP - Smooth scrolling, configurable behavior, route tracking

import { useEffect, useRef, useCallback, useState } from 'react'; // ✅ ADDED useState
import { useLocation } from 'react-router-dom';

// Configuration options
const DEFAULT_CONFIG = {
    behavior: 'smooth',
    offsetTop: 0,
    excludePaths: [], // Paths where scroll to top should be disabled
    enableAnalytics: true, // Track scroll to top events
    mobileBreakpoint: 768, // Different behavior on mobile
    restoreScrollPosition: true, // Restore previous scroll position on back/forward navigation
    showProgressBar: false // Added missing config option
};

// Scroll position cache for back/forward navigation
const scrollPositionCache = new Map();

export default function ScrollToTop({ config = {} }) {
    const { pathname, key } = useLocation();
    const prevPathnameRef = useRef(pathname);
    const isNavigatingBackRef = useRef(false);
    const settings = { ...DEFAULT_CONFIG, ...config };
    
    // Track navigation direction (back/forward vs new navigation)
    useEffect(() => {
        // Detect if this is a back/forward navigation
        if (typeof performance !== 'undefined') {
            const navigationEntry = performance.getEntriesByType('navigation')[0];
            if (navigationEntry && (navigationEntry.type === 'back_forward')) {
                isNavigatingBackRef.current = true;
            } else {
                isNavigatingBackRef.current = false;
            }
        }
        
        prevPathnameRef.current = pathname;
    }, [pathname]);

    // Save current scroll position when leaving page
    const saveScrollPosition = useCallback(() => {
        if (settings.restoreScrollPosition && typeof window !== 'undefined') {
            scrollPositionCache.set(pathname, {
                x: window.scrollX,
                y: window.scrollY,
                timestamp: Date.now()
            });
        }
    }, [pathname, settings.restoreScrollPosition]);

    // Restore or reset scroll position on route change
    const handleScroll = useCallback(async () => {
        // Check if path is excluded
        if (settings.excludePaths.includes(pathname)) {
            return;
        }

        // Handle back/forward navigation - restore previous scroll position
        if (isNavigatingBackRef.current && settings.restoreScrollPosition) {
            const savedPosition = scrollPositionCache.get(pathname);
            if (savedPosition && Date.now() - savedPosition.timestamp < 30 * 60 * 1000) { // Only restore within 30 minutes
                window.scrollTo({
                    top: savedPosition.y,
                    left: savedPosition.x,
                    behavior: 'instant'
                });
                return;
            }
        }

        // Handle hash links (e.g., /page#section)
        if (typeof window !== 'undefined' && window.location.hash) {
            const elementId = window.location.hash.substring(1);
            const element = document.getElementById(elementId);
            if (element) {
                const offset = settings.offsetTop;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: elementPosition - offset,
                    behavior: settings.behavior
                });
                return;
            }
        }

        // Check if it's a mobile device for different behavior
        const isMobile = typeof window !== 'undefined' ? window.innerWidth <= settings.mobileBreakpoint : false;
        const scrollBehavior = isMobile ? 'auto' : settings.behavior;
        
        // Perform scroll to top
        window.scrollTo({
            top: settings.offsetTop,
            left: 0,
            behavior: scrollBehavior
        });

        // Track scroll to top event for analytics - NO SUPABASE CALLS
        if (settings.enableAnalytics && typeof fetch !== 'undefined') {
            try {
                await fetch('/api/index?action=track-event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event_type: 'scroll_to_top',
                        event_data: {
                            pathname,
                            from: prevPathnameRef.current,
                            is_back_navigation: isNavigatingBackRef.current
                        },
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            } catch (error) {
                // Silently fail analytics
            }
        }
    }, [pathname, settings]);

    // Save position before navigation
    useEffect(() => {
        // Save current position before leaving
        saveScrollPosition();
        
        // Handle scroll on new route
        // Use setTimeout to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            handleScroll();
        }, 50);
        
        return () => {
            clearTimeout(timeoutId);
            saveScrollPosition();
        };
    }, [pathname, key, handleScroll, saveScrollPosition]);

    // Optional: Add a manual scroll to top button (if needed)
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    useEffect(() => {
        const handleUserScroll = () => {
            const shouldShow = window.scrollY > 300;
            setShowScrollButton(shouldShow);
        };
        
        window.addEventListener('scroll', handleUserScroll);
        return () => window.removeEventListener('scroll', handleUserScroll);
    }, []);

    const handleManualScrollToTop = useCallback(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        // Track manual scroll to top
        if (settings.enableAnalytics && typeof fetch !== 'undefined') {
            fetch('/api/index?action=track-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'manual_scroll_to_top',
                    event_data: { pathname, scroll_position: window.scrollY },
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
        }
    }, [pathname, settings.enableAnalytics]);

    return (
        <>
            {/* Floating scroll to top button (appears after scrolling down) */}
            {showScrollButton && (
                <button
                    onClick={handleManualScrollToTop}
                    className="fixed bottom-24 right-6 z-40 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    aria-label="Scroll to top"
                >
                    <svg 
                        className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            )}
            
            {/* Optional: Progress bar for scroll position */}
            {settings.showProgressBar && (
                <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-sky-500 z-50 transition-all duration-150"
                    style={{ width: `${(window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100}%` }}
                />
            )}
        </>
    );
}

// Custom hook for scroll position management
export function useScrollPosition() {
    const [scrollPosition, setScrollPosition] = useState(0);
    
    useEffect(() => {
        const handleScroll = () => {
            setScrollPosition(window.scrollY);
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    const scrollToTop = useCallback((behavior = 'smooth') => {
        window.scrollTo({ top: 0, behavior });
    }, []);
    
    const scrollToElement = useCallback((elementId, offset = 0) => {
        const element = document.getElementById(elementId);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({
                top: elementPosition - offset,
                behavior: 'smooth'
            });
        }
    }, []);
    
    return { scrollPosition, scrollToTop, scrollToElement };
}
