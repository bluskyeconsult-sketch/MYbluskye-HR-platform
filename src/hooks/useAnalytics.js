// src/hooks/useAnalytics.js
// Custom hook for analytics tracking (extracted from App.jsx)

import { useEffect, useRef } from 'react';
import { 
    initAnalytics,
    startSession, 
    endSession, 
    trackPageView, 
    updatePageViewMetrics,
    trackEvent 
} from '../services/analyticsTrackingService';

export function useAnalytics(location) {
    const scrollMilestonesTracked = useRef({ 25: false, 50: false, 75: false, 90: false });
    const timeMilestonesTracked = useRef({ 30: false, 60: false, 120: false, 300: false });
    const clickCount = useRef(0);
    const maxScroll = useRef(0);
    const timeOnPage = useRef(0);
    
    useEffect(() => {
        // Initialize analytics on app load
        initAnalytics();
        
        // Track page view on route change
        const trackCurrentPage = () => {
            const path = location.pathname;
            const title = document.title;
            trackPageView(path, title);
        };
        
        // Track initial page
        trackCurrentPage();
        
        // Scroll tracking
        const handleScroll = () => {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollHeight > 0 
                ? (window.scrollY / scrollHeight) * 100 
                : 0;
            
            if (scrollPercent > maxScroll.current) {
                maxScroll.current = scrollPercent;
                updatePageViewMetrics(Math.round(maxScroll.current), null);
                
                // Track milestone scroll events
                const milestones = [25, 50, 75, 90];
                milestones.forEach(milestone => {
                    if (maxScroll.current >= milestone && !scrollMilestonesTracked.current[milestone]) {
                        scrollMilestonesTracked.current[milestone] = true;
                        trackEvent(`scroll_${milestone}_percent`, { page: location.pathname });
                    }
                });
            }
        };
        
        // Click tracking
        const handleClick = (e) => {
            clickCount.current++;
            updatePageViewMetrics(null, clickCount.current);
            
            const target = e.target.closest('a, button, [role="button"]');
            if (target) {
                const elementType = target.tagName.toLowerCase();
                const elementText = target.innerText?.substring(0, 100) || '';
                const elementHref = target.getAttribute('href') || '';
                const elementId = target.id || target.getAttribute('data-track-id');
                
                // Track important actions
                const importantKeywords = ['Apply', 'Sign', 'Register', 'Purchase', 'Contact', 'Subscribe', 'Enroll', 'Start'];
                const isImportant = importantKeywords.some(keyword => 
                    elementText.includes(keyword) || 
                    elementHref.includes(`/${keyword.toLowerCase()}`) ||
                    elementId?.includes('cta')
                );
                
                if (isImportant) {
                    trackEvent('important_click', {
                        element: elementType,
                        text: elementText,
                        href: elementHref,
                        id: elementId,
                        page: location.pathname
                    });
                }
            }
        };
        
        // Time on page tracking
        const timeInterval = setInterval(() => {
            timeOnPage.current += 30;
            
            const milestones = { 30: '30s', 60: '1m', 120: '2m', 300: '5m' };
            Object.entries(milestones).forEach(([seconds, label]) => {
                const numSeconds = parseInt(seconds);
                if (timeOnPage.current === numSeconds && !timeMilestonesTracked.current[numSeconds]) {
                    timeMilestonesTracked.current[numSeconds] = true;
                    trackEvent(`time_on_page_${label}`, { page: location.pathname });
                }
            });
        }, 30000);
        
        // Exit intent tracking
        const handleMouseLeave = (e) => {
            if (e.clientY <= 0) {
                trackEvent('exit_intent', { page: location.pathname });
            }
        };
        
        // End session on page unload
        const handleBeforeUnload = () => {
            endSession();
        };
        
        // Add event listeners
        window.addEventListener('scroll', handleScroll);
        document.addEventListener('click', handleClick);
        document.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Cleanup
        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            clearInterval(timeInterval);
            endSession();
        };
    }, [location.pathname]);
}
