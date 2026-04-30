import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Briefcase, FileText, Brain, TrendingUp, Gift, ArrowRight, Clock } from 'lucide-react';

const promoItems = [
    {
        id: 1,
        icon: Brain,
        title: "New: Psychometric Assessments",
        description: "Discover your work personality and strengths",
        cta: "Take Free Assessment →",
        link: "/assessments",
        color: "from-purple-500/20 to-purple-600/20",
        textColor: "text-purple-400",
        borderColor: "border-purple-500/30",
        badge: "NEW",
        badgeColor: "bg-purple-600"
    },
    {
        id: 2,
        icon: Briefcase,
        title: "Hire Virtual Assistants",
        description: "24 AI-powered VAs ready to help with CV, cover letters, and more",
        cta: "Explore VAs →",
        link: "/hire-va",
        color: "from-emerald-500/20 to-emerald-600/20",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        badge: "POPULAR",
        badgeColor: "bg-emerald-600"
    },
    {
        id: 3,
        icon: TrendingUp,
        title: "Limited Time Offer",
        description: "Get 20% off on all CV optimization services",
        cta: "Claim Offer →",
        link: "/hire-va?category=resume",
        color: "from-amber-500/20 to-amber-600/20",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        badge: "SALE",
        badgeColor: "bg-amber-600"
    },
    {
        id: 4,
        icon: Gift,
        title: "Refer & Earn",
        description: "Join our affiliate program and earn 10% commission",
        cta: "Become an Affiliate →",
        link: "/affiliate",
        color: "from-sky-500/20 to-sky-600/20",
        textColor: "text-sky-400",
        borderColor: "border-sky-500/30",
        badge: "EARN",
        badgeColor: "bg-sky-600"
    },
    {
        id: 5,
        icon: Clock,
        title: "4-Week Free Trial",
        description: "New users get 4 weeks of free tester access",
        cta: "Start Free Trial →",
        link: "/sign-up",
        color: "from-emerald-500/20 to-emerald-600/20",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        badge: "FREE",
        badgeColor: "bg-emerald-600"
    },
    {
        id: 6,
        icon: FileText,
        title: "Job Alert System",
        description: "Get notified when matching jobs are posted",
        cta: "Set Up Alerts →",
        link: "/job-alerts",
        color: "from-blue-500/20 to-blue-600/20",
        textColor: "text-blue-400",
        borderColor: "border-blue-500/30",
        badge: "NEW",
        badgeColor: "bg-blue-600"
    }
];

export default function RotatingPromoBanner() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            setDirection(1);
            setCurrentIndex((prev) => (prev + 1) % promoItems.length);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const currentItem = promoItems[currentIndex];

    return (
        <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentItem.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${currentItem.color} border ${currentItem.borderColor} p-5`}
                    >
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center">
                                    <currentItem.icon className={`w-6 h-6 ${currentItem.textColor}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white">{currentItem.title}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${currentItem.badgeColor} text-white font-medium`}>
                                            {currentItem.badge}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm md:text-base">{currentItem.description}</p>
                                </div>
                            </div>
                            <a
                                href={currentItem.link}
                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 rounded-lg text-sm font-medium text-white transition-all hover:gap-3 group"
                            >
                                {currentItem.cta}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        </div>

                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
                            <motion.div
                                key={currentItem.id}
                                className={`h-full rounded-full ${currentItem.textColor.replace('text-', 'bg-')}`}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 8, ease: "linear" }}
                                onAnimationComplete={() => {
                                    // Progress bar complete, next item will trigger via interval
                                }}
                            />
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Dot indicators */}
                <div className="flex justify-center gap-2 mt-3">
                    {promoItems.map((item, idx) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setDirection(idx > currentIndex ? 1 : -1);
                                setCurrentIndex(idx);
                            }}
                            className={`transition-all duration-300 rounded-full ${
                                idx === currentIndex 
                                    ? `w-6 h-1.5 ${item.textColor.replace('text-', 'bg-')}` 
                                    : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-500'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
