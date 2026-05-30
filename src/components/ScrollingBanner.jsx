// src/components/ScrollingBanner.jsx
// COMPLETE PROFESSIONAL SCROLLING BANNER - Dynamic content, unified API, accessibility

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Zap, Gift, TrendingUp, BookOpen, Briefcase, Star, Award, Clock, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Default fallback messages (used if API fails)
const DEFAULT_MESSAGES = [
    { id: 1, text: "🎓 Free users get 1 free assessment per month!", link: "/pricing", linkText: "Upgrade Now", icon: "🎓", priority: 1 },
    { id: 2, text: "🚀 Post your first job for free!", link: "/post-job", linkText: "Get Started", icon: "🚀", priority: 2 },
    { id: 3, text: "📚 New courses added weekly! Start learning today.", link: "/courses", linkText: "View Courses", icon: "📚", priority: 3 },
    { id: 4, text: "💼 Apply to jobs with verified skills!", link: "/skills", linkText: "Verify Skills", icon: "💼", priority: 4 },
    { id: 5, text: "🤖 AI-powered virtual assistants available 24/7!", link: "/hire-va", linkText: "Hire VA", icon: "🤖", priority: 5 },
    { id: 6, text: "📊 Take assessments to discover your strengths!", link: "/assessments", linkText: "Take Assessment", icon: "📊", priority: 6 }
];

// Icon mapping for dynamic icons
const iconMap = {
    "🎓": <GraduationCap className="w-3.5 h-3.5" />,
    "🚀": <Rocket className="w-3.5 h-3.5" />,
    "📚": <BookOpen className="w-3.5 h-3.5" />,
    "💼": <Briefcase className="w-3.5 h-3.5" />,
    "🤖": <Bot className="w-3.5 h-3.5" />,
    "📊": <BarChart3 className="w-3.5 h-3.5" />,
    "⭐": <Star className="w-3.5 h-3.5" />,
    "🎯": <Target className="w-3.5 h-3.5" />,
    "⚡": <Zap className="w-3.5 h-3.5" />
};

export default function ScrollingBanner() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [messages, setMessages] = useState(DEFAULT_MESSAGES);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    const animationRef = useRef(null);
    const scrollSpeed = useRef(0.8); // pixels per frame

    // Fetch dynamic banner content from unified API
    useEffect(() => {
        fetchBannerContent();
        
        // Check if banner was dismissed
        const dismissed = localStorage.getItem('banner_dismissed');
        if (dismissed === 'true') {
            setIsVisible(false);
        }
    }, []);

    async function fetchBannerContent() {
        try {
            // Use unified API endpoint
            const response = await fetch('/api/index?action=banner-content', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    setMessages(result.data);
                }
            }
        } catch (error) {
            console.warn('Failed to fetch banner content, using defaults:', error);
        } finally {
            setLoading(false);
        }
    }

    // Optimized scroll animation using requestAnimationFrame
    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer || !isVisible) return;
        
        let animationId;
        let lastTimestamp = 0;
        
        const animateScroll = (timestamp) => {
            if (!scrollContainer || isPaused) {
                animationId = requestAnimationFrame(animateScroll);
                return;
            }
            
            // Smooth scrolling with delta time for consistent speed across frame rates
            if (lastTimestamp === 0) {
                lastTimestamp = timestamp;
                animationId = requestAnimationFrame(animateScroll);
                return;
            }
            
            const delta = Math.min(16, timestamp - lastTimestamp); // Cap at 16ms
            const deltaScroll = scrollSpeed.current * (delta / 16);
            
            if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
                scrollContainer.scrollLeft = 0;
            } else {
                scrollContainer.scrollLeft += deltaScroll;
            }
            
            lastTimestamp = timestamp;
            animationId = requestAnimationFrame(animateScroll);
        };
        
        animationId = requestAnimationFrame(animateScroll);
        
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [isPaused, isVisible]);

    const handleDismiss = useCallback(() => {
        setIsVisible(false);
        localStorage.setItem('banner_dismissed', 'true');
    }, []);

    const handleMessageClick = useCallback((link) => {
        if (link) {
            navigate(link);
        }
    }, [navigate]);

    if (!isVisible) return null;

    // Duplicate messages for seamless infinite scrolling
    const scrollingMessages = [...messages, ...messages];

    // Get icon component from mapping or use default
    const getIcon = (iconName) => {
        if (iconName && iconMap[iconName]) {
            return iconMap[iconName];
        }
        return <Sparkles className="w-3.5 h-3.5 text-primary-400" />;
    };

    return (
        <div className="relative bg-gradient-to-r from-slate-800/95 via-slate-800/90 to-slate-800/95 border-y border-slate-700/50 overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 via-transparent to-sky-500/5 animate-pulse" />
            
            {/* Dot pattern overlay */}
            <div 
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ 
                    backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.3) 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }} 
            />
            
            <div className="relative py-3">
                <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Scrolling Messages Container */}
                    <div 
                        ref={scrollRef}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        className="flex-1 overflow-x-auto cursor-pointer"
                        style={{ 
                            scrollbarWidth: 'none', 
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        <div className="flex items-center gap-8 whitespace-nowrap">
                            {scrollingMessages.map((message, idx) => (
                                <div 
                                    key={`${message.id}-${idx}`} 
                                    onClick={() => handleMessageClick(message.link)}
                                    className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer group"
                                >
                                    <span className="flex-shrink-0 text-base group-hover:scale-110 transition-transform">
                                        {message.icon || getIcon(message.icon)}
                                    </span>
                                    <span className="truncate max-w-[300px] sm:max-w-none">
                                        {message.text}
                                    </span>
                                    {message.link && message.linkText && (
                                        <span className="text-primary-400 group-hover:text-primary-300 font-medium ml-1 transition-colors inline-flex items-center gap-0.5">
                                            {message.linkText}
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-0 group-hover:translate-x-1 inline-block">→</span>
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Loading indicator (shown briefly) */}
                    {loading && (
                        <div className="ml-3 flex-shrink-0">
                            <div className="w-4 h-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                        </div>
                    )}
                    
                    {/* Dismiss Button */}
                    <button 
                        onClick={handleDismiss}
                        className="ml-3 p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50 transition-all duration-200 flex-shrink-0 group"
                        aria-label="Close banner"
                    >
                        <X className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
            
            {/* Gradient fade edges for smoother appearance */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-800/95 to-transparent pointer-events-none" />
            <div className="absolute right-12 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-800/95 to-transparent pointer-events-none" />
        </div>
    );
}

// Import missing icons
import { GraduationCap, Rocket, Bot, BarChart3, Target } from 'lucide-react';
