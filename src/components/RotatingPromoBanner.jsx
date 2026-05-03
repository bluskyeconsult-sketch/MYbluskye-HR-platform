// src/components/RotatingPromoBanner.jsx
// LARGER PROMO BANNER - More visible for sales

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Gift, Sparkles, Zap, Star, TrendingUp, Rocket } from 'lucide-react';

const promos = [
  {
    id: 1,
    icon: Gift,
    title: "🎁 LIMITED TIME OFFER",
    description: "Get 20% off on all CV optimization services",
    buttonText: "Claim 20% Off →",
    buttonLink: "/hire-va",
    bgGradient: "from-amber-600/30 via-orange-600/20 to-amber-600/30",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-400",
    highlight: "SAVE 20%"
  },
  {
    id: 2,
    icon: Rocket,
    title: "🚀 FREE TRIAL",
    description: "4 weeks of full tester access - No credit card required",
    buttonText: "Start Free Trial →",
    buttonLink: "/tester-register",
    bgGradient: "from-primary-600/30 via-sky-600/20 to-primary-600/30",
    borderColor: "border-primary-500/40",
    textColor: "text-primary-400",
    highlight: "FREE 4 WEEKS"
  },
  {
    id: 3,
    icon: TrendingUp,
    title: "📈 NEW FEATURE",
    description: "AI-powered job matching now live! Get matched instantly",
    buttonText: "Try AI Matching →",
    buttonLink: "/jobs",
    bgGradient: "from-emerald-600/30 via-teal-600/20 to-emerald-600/30",
    borderColor: "border-emerald-500/40",
    textColor: "text-emerald-400",
    highlight: "NEW"
  },
  {
    id: 4,
    icon: Sparkles,
    title: "🎓 COURSE SALE",
    description: "All professional courses 30% off this week only!",
    buttonText: "Browse Courses →",
    buttonLink: "/courses",
    bgGradient: "from-purple-600/30 via-violet-600/20 to-purple-600/30",
    borderColor: "border-purple-500/40",
    textColor: "text-purple-400",
    highlight: "30% OFF"
  }
];

export default function RotatingPromoBanner() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promos.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [isHovered]);

  if (!isVisible) return null;

  const promo = promos[currentPromo];
  const Icon = promo.icon;

  return (
    <div 
      className={`relative bg-gradient-to-r ${promo.bgGradient} border-y-2 ${promo.borderColor} py-4 md:py-5 px-4 cursor-pointer transition-all duration-500`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          
          {/* Left side - Icon & Highlight */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-${promo.textColor.split('-')[1]}-500/20 flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${promo.textColor}`} />
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${promo.textColor}`}>
                {promo.highlight}
              </span>
              <div className="text-white font-bold text-lg md:text-xl">
                {promo.title}
              </div>
            </div>
          </div>
          
          {/* Middle - Description */}
          <div className="flex-1">
            <p className="text-white/90 text-base md:text-lg font-medium">
              {promo.description}
            </p>
          </div>
          
          {/* Right side - CTA Button */}
          <Link
            to={promo.buttonLink}
            className={`px-6 py-3 rounded-xl text-white font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
              promo.id === 1 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30'
                : promo.id === 2
                ? 'bg-gradient-to-r from-primary-600 to-sky-600 hover:from-primary-700 hover:to-sky-700 shadow-primary-500/30'
                : promo.id === 3
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
                : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-purple-500/30'
            }`}
          >
            {promo.buttonText}
          </Link>
        </div>
      </div>
      
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 transition text-white/70 hover:text-white"
        aria-label="Close promo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
