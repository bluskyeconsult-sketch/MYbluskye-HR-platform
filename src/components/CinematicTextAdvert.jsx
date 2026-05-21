// src/components/CinematicTextAdvert.jsx
// OPTIMIZED - Cinematic animated advert with API fallback and smooth transitions

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DEFAULT CONTENT (Fallback if API fails)
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
        text: "Sponsorship & Visa Detection",
        subtext: "Smart filtering for international talent",
        icon: "✈️",
        gradient: "from-emerald-500 to-teal-500",
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
    },
    {
        text: "Skill Verification & Assessment",
        subtext: "Validate your expertise with AI",
        icon: "⭐",
        gradient: "from-yellow-500 to-red-500",
        duration: 3500
    },
    {
        text: "Salary Negotiation Coach",
        subtext: "Maximize your earning potential",
        icon: "💰",
        gradient: "from-green-500 to-emerald-500",
        duration: 3500
    },
    {
        text: "Workplace Rights Protection",
        subtext: "Legal guidance when you need it",
        icon: "⚖️",
        gradient: "from-slate-500 to-gray-500",
        duration: 3500
    },
    {
        text: "Join Thousands of Success Stories",
        subtext: "Your career transformation starts here",
        icon: "🚀",
        gradient: "from-sky-500 to-blue-600",
        duration: 4000
    }
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CinematicTextAdvert() {
    const [messages, setMessages] = useState(DEFAULT_MESSAGES);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);

    // Fetch dynamic content from API
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const response = await fetch('/api/marketing/content');
                if (!response.ok) throw new Error('API request failed');
                
                const data = await response.json();
                
                // Check if API returned hero content and transform it
                if (data?.data?.hero) {
                    const hero = data.data.hero;
                    // Transform API content to match message structure
                    const apiMessage = {
                        text: hero.title || hero.tagline || DEFAULT_MESSAGES[0].text,
                        subtext: hero.subtitle || hero.description || DEFAULT_MESSAGES[0].subtext,
                        icon: hero.icon || "✨",
                        gradient: hero.gradient || "from-sky-500 to-blue-600",
                        duration: 4000,
                        ctaText: hero.ctaText,
                        ctaLink: hero.ctaLink
                    };
                    
                    // Combine API message with default messages (API message first)
                    setMessages([apiMessage, ...DEFAULT_MESSAGES.slice(1)]);
                } else if (data?.data?.features && Array.isArray(data.data.features)) {
                    // Transform features into messages
                    const featureMessages = data.data.features.map(feature => ({
                        text: feature.title,
                        subtext: feature.description,
                        icon: feature.icon || getIconForFeature(feature.title),
                        gradient: feature.gradient || "from-primary-500 to-sky-500",
                        duration: 3500
                    }));
                    setMessages([...featureMessages, ...DEFAULT_MESSAGES]);
                }
            } catch (err) {
                console.warn("Failed to load advert content, using defaults:", err.message);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    // Helper to map feature titles to icons
    const getIconForFeature = (title) => {
        const iconMap = {
            'AI-Powered': '🧠',
            'Job': '💼',
            'Skill': '⭐',
            'Career': '🎯',
            'Salary': '💰',
            'Workplace': '⚖️',
            'Virtual': '🤖'
        };
        for (const [key, icon] of Object.entries(iconMap)) {
            if (title.includes(key)) return icon;
        }
        return '✨';
    };

    const currentMessage = messages[currentIndex];
    const displayDuration = currentMessage?.duration || 3500;
    const hasCTA = currentMessage?.ctaText && currentMessage?.ctaLink;

    // Progress bar animation
    useEffect(() => {
        if (loading || !currentMessage) return;
        
        let startTime = Date.now();
        let animationFrame;

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min(100, (elapsed / (displayDuration - 500)) * 100);
            setProgress(newProgress);
            
            if (newProgress < 100) {
                animationFrame = requestAnimationFrame(updateProgress);
            }
        };
        
        animationFrame = requestAnimationFrame(updateProgress);
        
        const timer = setTimeout(() => {
            setIsVisible(false);
            
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % messages.length);
                setProgress(0);
                setIsVisible(true);
                startTime = Date.now();
            }, 300);
        }, displayDuration - 300);

        return () => {
            clearTimeout(timer);
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [currentIndex, displayDuration, loading, messages.length, currentMessage]);

    // Don't render while loading - show skeleton
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

    const isUrlMessage = currentMessage?.text?.includes("bluskyeconsult.com");
    const urlTextStyle = isUrlMessage ? "tracking-wide font-mono text-3xl md:text-5xl lg:text-6xl" : "";

    return (
        <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl my-8">
            {/* Cinematic grain overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '100px'
                }}
            />
            
            {/* Ambient light effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-primary-500/5 animate-pulse pointer-events-none z-10" />
            
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-800/50 z-30">
                <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.016, ease: "linear" }}
                />
            </div>

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
                                transition={{ 
                                    duration: 0.6, 
                                    ease: [0.25, 0.1, 0.25, 1]
                                }}
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
                                    className={`text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r ${currentMessage.gradient || "from-sky-500 to-blue-600"} bg-clip-text text-transparent tracking-tight ${urlTextStyle}`}
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
                                
                                {/* Decorative underline */}
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
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(() => {
                                        setCurrentIndex(idx);
                                        setProgress(0);
                                        setIsVisible(true);
                                    }, 300);
                                }}
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
