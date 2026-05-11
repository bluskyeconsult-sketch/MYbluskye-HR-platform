// src/components/ScrollToTop.jsx
// Scrolls window to top on every page navigation and page refresh

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname]);

    // Also scroll to top on page refresh (when component mounts)
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return null;
}
