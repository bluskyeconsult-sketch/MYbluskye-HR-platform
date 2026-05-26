// src/components/CinematicTextAdvert.jsx
// ULTIMATE CINEMATIC ADVERT - Full animations, API-ready, production-optimized

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_MESSAGES = [
    {
        text: "www.bluskyeconsult.com",
        subtext: "AI-Governed Workforce Platform",
        icon: "🌐",
        gradient: "from-sky-500 to-blue-600",
        duration: 4000,
        ctaText: "Get Started",
        ctaLink: "/sign-up"
    },
    {
        text: "AI-Powered Career Intelligence",
        subtext: "Powered by ODUSBABA's advanced neural networks",
        icon: "🧠",
        gradient: "from-purple-500 to-pink-500",
        duration: 3500
    },
    {
        text: "Live Government Job Feeds",
        subtext: "Real-time opportunities from 7+ countries",
        icon: "🌍",
        gradient: "from-blue-500 to-cyan-500",
        duration: 3500
    },
    {
        text: "Professional CV Optimization",
        subtext: "ATS-friendly, recruiter-approved format",
        icon: "📄",
        gradient: "from-amber-500 to-orange-500",
        duration: 3500
    },
    {
        text: "24/7 Virtual Assistant",
        subtext: "Career guidance at your fingertips",
        icon: "🤖",
        gradient: "from-indigo-500 to-purple-500",
        duration: 3500
    }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CinematicTextAdvert({ 
    campaignId = 'default', 
    autoRotate = true, 
    rotationInterval = 5000 
}) {
    const [messages, setMessages] = useState(DEFAULT_MESSAGES);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const rotationTimerRef = useRef(null);
    const animationFrameRef = useRef(null);
    const timeoutRef = useRef(null);

    // Load content from API
    useEffect(() => {
        let isMounted = true;
        
        const loadContent = async () => {
            try {
                // Try to fetch from API if available
                const response = await fetch('/api/marketing/content', {
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-store'
                }).catch(() => null);
                
                if (isMounted && response?.ok) {
                    const data = await response.json();
                    if (data?.data?.hero || data?.data?.features) {
                        const transformed = transformApiResponse(data);
                        setMessages(transformed);
                    }
                }
            } catch (err) {
                console.warn('Advert content fetch failed, using defaults:', err.message);
                setError(null); // Non-critical, use defaults
            } finally {
                if (isMounted) {
                    setLoading(false);
                    // Trigger entrance animation
                    setTimeout(() => setIsVisible(true), 100);
                }
            }
        };
        
        loadContent();
        
        return () => {
            isMounted = false;
        };
    }, []);

    // Transform API response to message format
    const transformApiResponse = useCallback((data) => {
        if (data?.data?.hero) {
            const hero = data.data.hero;
            return [{
                text: hero.title || DEFAULT_MESSAGES[0].text,
                subtext: hero.subtitle || hero.description || DEFAULT_MESSAGES[0].subtext,
                icon: hero.icon || "✨",
                gradient: hero.gradient || "from-sky-500 to-blue-600",
                duration: 4000,
                ctaText: hero.ctaText,
                ctaLink: hero.ctaLink
            }, ...DEFAULT_MESSAGES.slice(1)];
        }
        
        if (data?.data?.features?.length) {
            const featureMessages = data.data.features.map(feature => ({
                text: feature.title,
                subtext: feature.description,
                icon: feature.icon || getIconForFeature(feature.title),
                gradient: feature.gradient || "from-primary-500 to-sky-500",
                duration: 3500
            }));
            return [...featureMessages, ...DEFAULT_MESSAGES];
        }
        
        return DEFAULT_MESSAGES;
    }, []);

    // Helper: Get icon for feature
    const getIconForFeature = useCallback((title) => {
        const iconMap = {
            'AI': '🧠', 'Job': '💼', 'Skill': '⭐', 
            'Career': '🎯', 'Salary': '💰', 'Workplace': '⚖️', 
            'Virtual': '🤖', 'CV': '📄'
        };
        for (const [key, icon] of Object.entries(iconMap)) {
            if (title.includes(key)) return icon;
        }
        return '✨';
    }, []);

    const currentMessage = messages[currentIndex];
    const duration = currentMessage?.duration || 3500;
    const hasCTA = currentMessage?.ctaText && currentMessage?.ctaLink;
    const isUrlMessage = currentMessage?.text?.includes("bluskyeconsult.com");

    // Auto-rotation effect
    useEffect(() => {
        if (!autoRotate || loading || messages.length <= 1) return;
        
        const rotateContent = () => {
            setIsVisible(false);
            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % messages.length);
                setProgress(0);
                setIsVisible(true);
            }, 300);
        };
        
        rotationTimerRef.current = setInterval(rotateContent, duration);
        
        return () => {
            if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
        };
    }, [autoRotate, duration, loading, messages.length]);

    // Progress animation
    useEffect(() => {
        if (loading || !currentMessage || !autoRotate) return;
        
        let startTime = Date.now();
        
        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min(100, (elapsed / (duration - 500)) * 100);
            setProgress(newProgress);
            
            if (newProgress < 100) {
                animationFrameRef.current = requestAnimationFrame(updateProgress);
            }
        };
        
        animationFrameRef.current = requestAnimationFrame(updateProgress);
        
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [currentIndex, duration, loading, currentMessage, autoRotate]);

    // Navigate to specific slide
    const goToSlide = useCallback((index) => {
        if (index === currentIndex) return;
        
        // Reset rotation timer
        if (rotationTimerRef.current) {
            clearInterval(rotationTimerRef.current);
            if (autoRotate) {
                rotationTimerRef.current = setInterval(() => {
                    setIsVisible(false);
                    setTimeout(() => {
                        setCurrentIndex(prev => (prev + 1) % messages.length);
                        setProgress(0);
                        setIsVisible(true);
                    }, 300);
                }, duration);
            }
        }
        
        setIsVisible(false);
        setTimeout(() => {
            setCurrentIndex(index);
            setProgress(0);
            setIsVisible(true);
        }, 300);
    }, [currentIndex, autoRotate, duration]);

    // Loading skeleton
    if (loading) {
        return (
            <div className="w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl my-8 overflow-hidden">
                <div className="px-6 py-16 md:py-20 lg:py-24">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="animate-pulse">
                            <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto mb-6"></div>
                            <div className="h-8 bg-slate-800 rounded w-64 mx-auto mb-4"></div>
                            <div className="h-4 bg-slate-800 rounded w-96 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl my-8">
            {/* Grain overlay */}
            <div 
                className="absolute inset-0 pointer-events-none z-20 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '100px'
                }}
            />
            
            {/* Ambient light */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-primary-500/5 animate-pulse pointer-events-none z-10" />
            
            {/* Progress bar */}
            {autoRotate && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800/50 z-30">
                    <motion.div
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
                        style={{ width: `${progress}%` }}
                        transition={{ duration: 0.016, ease: "linear" }}
                    />
                </div>
            )}

            {/* Main content */}
            <div className="relative z-30 px-6 py-16 md:py-20 lg:py-24">
                <div className="max-w-4xl mx-auto text-center">
                    <AnimatePresence mode="wait">
                        {isVisible && currentMessage && (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
                                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                className="space-y-6"
                            >
                                {/* Icon */}
                                <motion.div
                                    initial={{ scale: 0.8, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 200 }}
                                    className="text-7xl md:text-8xl lg:text-9xl mb-6"
                                >
                                    {currentMessage.icon || "✨"}
                                </motion.div>
                                
                                {/* Main text */}
                                <motion.h2
                                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                                    transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className={`text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r ${currentMessage.gradient || "from-sky-500 to-blue-600"} bg-clip-text text-transparent tracking-tight ${
                                        isUrlMessage ? "tracking-wide font-mono" : ""
                                    }`}
                                >
                                    {currentMessage.text}
                                </motion.h2>
                                
                                {/* Subtext */}
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="text-slate-400 text-sm md:text-base lg:text-lg tracking-wide"
                                >
                                    {currentMessage.subtext}
                                </motion.p>
                                
                                {/* CTA Button */}
                                {hasCTA && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: 0.5 }}
                                    >
                                        <a
                                            href={currentMessage.ctaLink}
                                            className="inline-block mt-4 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all hover:scale-105"
                                        >
                                            {currentMessage.ctaText} →
                                        </a>
                                    </motion.div>
                                )}
                                
                                {/* Decorative line */}
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.6, delay: 0.6 }}
                                    className="w-24 h-px bg-gradient-to-r from-transparent via-sky-500 to-transparent mx-auto"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Navigation dots */}
                {messages.length > 1 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-40">
                        {messages.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => goToSlide(idx)}
                                className={`transition-all duration-300 rounded-full ${
                                    idx === currentIndex 
                                        ? 'w-8 h-1.5 bg-sky-500' 
                                        : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-500'
                                }`}
                                aria-label={`Go to slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Vignette effects */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]" />
        </div>
    );
}
