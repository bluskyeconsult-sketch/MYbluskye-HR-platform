// src/components/ScrollToTop.jsx
// PROFESSIONAL SCROLL TO TOP COMPONENT - Global Best Practices
// Features: Route-based scrolling, back/forward navigation preservation, hash link support, 
// floating action button, scroll progress bar, accessibility compliant, performance optimized

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const DEFAULT_CONFIG = {
    behavior: 'smooth',
    offsetTop: 0,
    excludePaths: [],
    enableAnalytics: true,
    mobileBreakpoint: 768,
    restoreScrollPosition: true,
    showProgressBar: false,
    scrollButtonThreshold: 300,
    debounceDelay: 100,
    cacheDuration: 30 * 60 * 1000 // 30 minutes
};

const SCROLL_POSITION_CACHE_KEY = 'bluskye_scroll_positions';

// ============================================
// SCROLL POSITION CACHE MANAGER
// ============================================

class ScrollPositionCache {
    constructor() {
        this.cache = new Map();
        this.loadFromStorage();
    }

    loadFromStorage() {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(SCROLL_POSITION_CACHE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
            }
        } catch (error) {
            console.warn('Failed to load scroll cache:', error);
        }
    }

    saveToStorage() {
        if (typeof window === 'undefined') return;
        try {
            const obj = Object.fromEntries(this.cache);
            localStorage.setItem(SCROLL_POSITION_CACHE_KEY, JSON.stringify(obj));
        } catch (error) {
            console.warn('Failed to save scroll cache:', error);
        }
    }

    get(pathname) {
        const entry = this.cache.get(pathname);
        if (!entry) return null;
        
        const isExpired = Date.now() - entry.timestamp > DEFAULT_CONFIG.cacheDuration;
        if (isExpired) {
            this.delete(pathname);
            return null;
        }
        return entry;
    }

    set(pathname, position) {
        this.cache.set(pathname, {
            ...position,
            timestamp: Date.now()
        });
        this.saveToStorage();
    }

    delete(pathname) {
        this.cache.delete(pathname);
        this.saveToStorage();
    }

    clear() {
        this.cache.clear();
        this.saveToStorage();
    }
}

const scrollCache = new ScrollPositionCache();

// ============================================
// UTILITY FUNCTIONS
// ============================================

const isBrowser = typeof window !== 'undefined';
const hasFetch = typeof fetch !== 'undefined';

const getScrollPosition = () => ({
    x: isBrowser ? window.scrollX : 0,
    y: isBrowser ? window.scrollY : 0
});

const isMobile = () => isBrowser && window.innerWidth <= DEFAULT_CONFIG.mobileBreakpoint;

const getScrollBehavior = () => {
    if (!isBrowser) return 'auto';
    return isMobile() ? 'auto' : 'smooth';
};

const debounce = (fn, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
};

// ============================================
// ANALYTICS TRACKING
// ============================================

const trackEvent = async (eventType, eventData) => {
    if (!hasFetch || !DEFAULT_CONFIG.enableAnalytics) return;
    
    try {
        await fetch('/api/index?action=track-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type: eventType,
                event_data: eventData,
                timestamp: new Date().toISOString()
            })
        });
    } catch (error) {
        // Silently fail - analytics shouldn't break user experience
        if (process.env.NODE_ENV === 'development') {
            console.debug('Analytics error:', error.message);
        }
    }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ScrollToTop({ config = {} }) {
    const { pathname, key } = useLocation();
    const prevPathnameRef = useRef(pathname);
    const isNavigatingBackRef = useRef(false);
    const scrollTimeoutRef = useRef(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    
    // Merge config with defaults
    const settings = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

    // ============================================
    // DETECT BACK/FORWARD NAVIGATION
    // ============================================
    useEffect(() => {
        if (!isBrowser) return;
        
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        isNavigatingBackRef.current = navigationEntry?.type === 'back_forward';
        
        prevPathnameRef.current = pathname;
    }, [pathname]);

    // ============================================
    // SAVE SCROLL POSITION
    // ============================================
    const saveScrollPosition = useCallback(() => {
        if (!settings.restoreScrollPosition || !isBrowser) return;
        
        const position = getScrollPosition();
        scrollCache.set(pathname, position);
    }, [pathname, settings.restoreScrollPosition]);

    // ============================================
    // RESTORE OR RESET SCROLL POSITION
    // ============================================
    const handleScroll = useCallback(async () => {
        if (!isBrowser) return;
        
        // Check if path is excluded
        if (settings.excludePaths.includes(pathname)) return;

        // Handle back/forward navigation - restore previous scroll position
        if (isNavigatingBackRef.current && settings.restoreScrollPosition) {
            const savedPosition = scrollCache.get(pathname);
            if (savedPosition) {
                window.scrollTo({
                    top: savedPosition.y,
                    left: savedPosition.x,
                    behavior: 'instant'
                });
                return;
            }
        }

        // Handle hash links (e.g., /page#section)
        if (window.location.hash) {
            const elementId = window.location.hash.substring(1);
            const element = document.getElementById(elementId);
            if (element) {
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({
                    top: elementPosition - settings.offsetTop,
                    behavior: settings.behavior
                });
                return;
            }
        }

        // Perform scroll to top with debounce to prevent jank
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        
        scrollTimeoutRef.current = setTimeout(() => {
            window.scrollTo({
                top: settings.offsetTop,
                left: 0,
                behavior: getScrollBehavior()
            });
        }, 16); // One frame for smooth rendering

        // Track analytics
        if (settings.enableAnalytics) {
            await trackEvent('scroll_to_top', {
                pathname,
                from: prevPathnameRef.current,
                is_back_navigation: isNavigatingBackRef.current
            });
        }
    }, [pathname, settings]);

    // ============================================
    // SCROLL POSITION EFFECT
    // ============================================
    useEffect(() => {
        saveScrollPosition();
        
        const timeoutId = setTimeout(() => {
            handleScroll();
        }, 50);
        
        return () => {
            clearTimeout(timeoutId);
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            saveScrollPosition();
        };
    }, [pathname, key, handleScroll, saveScrollPosition]);

    // ============================================
    // SCROLL BUTTON VISIBILITY
    // ============================================
    useEffect(() => {
        if (!isBrowser) return;
        
        const handleUserScroll = debounce(() => {
            const shouldShow = window.scrollY > settings.scrollButtonThreshold;
            setShowScrollButton(shouldShow);
        }, settings.debounceDelay);
        
        window.addEventListener('scroll', handleUserScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleUserScroll);
    }, [settings.scrollButtonThreshold, settings.debounceDelay]);

    // ============================================
    // MANUAL SCROLL TO TOP HANDLER
    // ============================================
    const handleManualScrollToTop = useCallback(() => {
        if (!isBrowser) return;
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        
        trackEvent('manual_scroll_to_top', {
            pathname,
            scroll_position: window.scrollY
        });
    }, [pathname]);

    // ============================================
    // SCROLL PROGRESS CALCULATION
    // ============================================
    const [scrollProgress, setScrollProgress] = useState(0);
    
    useEffect(() => {
        if (!isBrowser || !settings.showProgressBar) return;
        
        const updateProgress = debounce(() => {
            const scrollTop = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            setScrollProgress(progress);
        }, 16);
        
        window.addEventListener('scroll', updateProgress, { passive: true });
        return () => window.removeEventListener('scroll', updateProgress);
    }, [settings.showProgressBar]);

    // ============================================
    // RENDER
    // ============================================
    return (
        <>
            {/* Floating Scroll to Top Button - WCAG Compliant */}
            {showScrollButton && (
                <button
                    onClick={handleManualScrollToTop}
                    className="fixed bottom-24 right-6 z-40 p-3 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                    aria-label="Scroll to top of page"
                    title="Scroll to top"
                >
                    <svg 
                        className="w-5 h-5" 
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
            
            {/* Scroll Progress Bar */}
            {settings.showProgressBar && (
                <div 
                    className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-sky-500 z-50 transition-all duration-150"
                    style={{ width: `${scrollProgress}%` }}
                    aria-hidden="true"
                />
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

        const handleScroll = debounce(() => {
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
        }, 100);
        
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
        scrollProgress: (scrollPosition / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    };
}

// ============================================
// CLEANUP FUNCTION (For testing/development)
// ============================================

export const clearScrollCache = () => {
    scrollCache.clear();
    if (isBrowser) {
        localStorage.removeItem(SCROLL_POSITION_CACHE_KEY);
    }
};
