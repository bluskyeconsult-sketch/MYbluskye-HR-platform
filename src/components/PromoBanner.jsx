// src/components/PromoBanner.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap, Gift, TrendingUp, Star, Users, Briefcase } from 'lucide-react';

const promos = [
  {
    id: 1,
    title: "Stay Ahead in HR & Recruitment",
    description: "Join thousands of HR professionals getting weekly insights, job alerts, and exclusive content.",
    stats: [
      { icon: Star, value: "4.9/5", label: "from 500+ subscribers", color: "text-amber-400" },
      { icon: TrendingUp, value: "Weekly", label: "on Tuesdays", color: "text-emerald-400" },
      { icon: Users, value: "10,000+", label: "subscribers", color: "text-blue-400" }
    ],
    cta: { text: "Subscribe Now", link: "/newsletter" },
    icon: Zap,
    gradient: "from-primary-600/20 to-purple-600/20"
  },
  {
    id: 2,
    title: "Free Tester Access",
    description: "Get 4 weeks of full platform access as a tester. No credit card required.",
    stats: [
      { icon: Briefcase, value: "24/7", label: "AI Support", color: "text-emerald-400" },
      { icon: Star, value: "100%", label: "Free", color: "text-amber-400" },
      { icon: Users, value: "No Card", label: "Required", color: "text-blue-400" }
    ],
    cta: { text: "Become a Tester", link: "/tester-register" },
    icon: Gift,
    gradient: "from-emerald-600/20 to-teal-600/20"
  },
  {
    id: 3,
    title: "Post Your First Job Free",
    description: "Reach qualified candidates and find the perfect hire for your team.",
    stats: [
      { icon: TrendingUp, value: "7", label: "Countries", color: "text-purple-400" },
      { icon: Users, value: "Verified", label: "Candidates", color: "text-emerald-400" },
      { icon: Briefcase, value: "Free", label: "First Post", color: "text-amber-400" }
    ],
    cta: { text: "Post a Job", link: "/post-job" },
    icon: Briefcase,
    gradient: "from-blue-600/20 to-cyan-600/20"
  }
];

export default function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promos.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const promo = promos[currentIndex];
  const Icon = promo.icon;

  return (
    <div className={`bg-gradient-to-r ${promo.gradient} border-y border-primary-500/20 overflow-hidden transition-all duration-500`}>
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary-400" />
              </div>
              <h2 className="text-base md:text-lg font-semibold text-white">{promo.title}</h2>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-1 max-w-md">{promo.description}</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            {promo.stats.map((stat, idx) => (
              <div key={idx} className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 min-w-[80px] text-center">
                <div className={`text-sm font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Link
            to={promo.cta.link}
            className="group px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-500 transition-all duration-200 flex items-center gap-1 shadow-lg shadow-primary-500/20 flex-shrink-0"
          >
            {promo.cta.text}
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
