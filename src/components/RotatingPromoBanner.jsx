// src/components/RotatingPromoBanner.jsx
// COMPLETE - Promo banner with working offer links

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Gift, Sparkles, Zap, Star } from 'lucide-react';

const promos = [
  {
    id: 1,
    icon: Gift,
    title: "Limited Time Offer",
    description: "Get 20% off on all CV optimization services",
    buttonText: "Claim Offer",
    buttonLink: "/hire-va",
    bgColor: "from-purple-600/20 to-purple-800/20",
    borderColor: "border-purple-500/30",
    textColor: "text-purple-400"
  },
  {
    id: 2,
    icon: Sparkles,
    title: "Free Trial",
    description: "4 weeks of full access as a tester",
    buttonText: "Start Free Trial",
    buttonLink: "/tester-register",
    bgColor: "from-primary-600/20 to-primary-800/20",
    borderColor: "border-primary-500/30",
    textColor: "text-primary-400"
  },
  {
    id: 3,
    icon: Zap,
    title: "New Feature",
    description: "AI-powered job matching now live!",
    buttonText: "Try It Now",
    buttonLink: "/jobs",
    bgColor: "from-amber-600/20 to-amber-800/20",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400"
  }
];

export default function RotatingPromoBanner() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promos.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  if (!isVisible) return null;

  const promo = promos[currentPromo];
  const Icon = promo.icon;

  return (
    <div className={`relative bg-gradient-to-r ${promo.bgColor} border-y ${promo.borderColor} py-2.5 px-4`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${promo.textColor}`} />
            <span className={`font-semibold text-sm ${promo.textColor}`}>{promo.title}</span>
          </div>
          <p className="text-white text-sm">{promo.description}</p>
          <Link
            to={promo.buttonLink}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              promo.id === 1 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : promo.id === 2
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {promo.buttonText} →
          </Link>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
