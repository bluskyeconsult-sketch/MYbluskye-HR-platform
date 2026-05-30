// src/utils/scrollManager.js
// Prevents unwanted auto-scrolling behavior

let originalOverflow = null;

export function disableScroll() {
    if (typeof document === 'undefined') return;
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
}

export function enableScroll() {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = originalOverflow || '';
}

export function preventAutoScroll() {
    if (typeof window === 'undefined') return;
    
    // Prevent unwanted scroll behaviors
    window.addEventListener('scroll', (e) => {
        // Detect if scrolling is being forced
        if (window.scrollY < 0) {
            window.scrollTo(0, 0);
        }
    });
    
    // Fix for iOS overscroll
    document.body.addEventListener('touchmove', (e) => {
        if (document.body.style.overflow === 'hidden') {
            e.preventDefault();
        }
    }, { passive: false });
}
