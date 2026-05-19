// src/components/CinematicTextAdvert.jsx
// Cinematic animated text advert - Adds visual appeal without breaking existing layout

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const messages = [
    {
        text: "www.bluskyeconsult.com",
        subtext: "Your Trusted Career Platform",
        icon: "🌐",
        gradient: "from-sky-500 to-blue-600",
        duration: 4000
    },
    {
        text: "AI-Powered Career Intelligence",
        subtext: "Powered by advanced neural networks",
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
        subtext: "ATS-friendly, recruiter-approved",
        icon: "📄",
        gradient: "from-amber-500 to-orange-500",
        duration: 3500
    },
    {
        text: "Virtual Assistant Ecosystem",
        subtext: "24/7 career guidance at your fingertips",
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
        text: "www.bluskyeconsult.com",
        subtext: "Join Thousands of Success Stories",
        icon: "🚀",
        gradient: "from-sky-500 to-blue-600",
        duration: 4000
    }
];

export default function CinematicTextAdvert() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    const currentMessage = messages[currentIndex];
    const displayDuration = currentMessage.duration;

    useEffect(() => {
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
            cancelAnimationFrame(animationFrame);
        };
    }, [currentIndex, displayDuration]);

    const isUrlMessage = currentMessage.text.includes("bluskyeconsult.com");
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
                        {isVisible && (
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
                                    {currentMessage.icon}
                                </motion.div>
                                
                                {/* Main text */}
                                <motion.h2
                                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                                    transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className={`text-3xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r ${currentMessage.gradient} bg-clip-text text-transparent tracking-tight ${urlTextStyle}`}
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
                                
                                {/* Underline */}
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 0.6, delay: 0.5 }}
                                    className="w-24 h-px bg-gradient-to-r from-transparent via-sky-500 to-transparent mx-auto"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Navigation dots */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
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
            </div>

            {/* Vignette effect */}
            <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/20" />
            <div className="absolute inset-0 pointer-events-none z-20 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]" />
        </div>
    );
}
