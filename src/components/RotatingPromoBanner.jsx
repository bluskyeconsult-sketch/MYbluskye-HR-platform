// src/components/RotatingPromoBanner.jsx
// ENHANCED - Larger size, dynamic promos from site activities, glowing border, professional hover effects

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { X, TrendingUp, Star, Zap, Gift, Rocket, Sparkles, Briefcase, BookOpen, Users, Award, Clock } from 'lucide-react';

export default function RotatingPromoBanner() {
  const [currentPromo, setCurrentPromo] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch dynamic promos from database
  useEffect(() => {
    fetchDynamicPromos();
  }, []);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (promos.length === 0) return;
    const timer = setInterval(() => {
      setCurrentPromo((prev) => (prev + 1) % promos.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [promos]);

  async function fetchDynamicPromos() {
    setLoading(true);
    
    try {
      // 1. Fetch popular courses (high enrollment)
      const { data: popularCourses } = await supabase
        .from('courses')
        .select('id, title, slug, enrollment_count, difficulty')
        .eq('is_published', true)
        .order('enrollment_count', { ascending: false })
        .limit(2);

      // 2. Fetch trending jobs (high search/view count)
      const { data: trendingJobs } = await supabase
        .from('jobs')
        .select('id, title, company, salary_min, view_count')
        .eq('status', 'active')
        .order('view_count', { ascending: false })
        .limit(2);

      // 3. Fetch featured products
      const { data: featuredProducts } = await supabase
        .from('products')
        .select('id, name, slug, price, is_featured')
        .eq('is_featured', true)
        .limit(2);

      // 4. Fetch popular assessments
      const { data: popularAssessments } = await supabase
        .from('assessments')
        .select('id, title, slug, takers_count')
        .order('takers_count', { ascending: false })
        .limit(1);

      // Build dynamic promos array
      const dynamicPromos = [];

      // Add popular courses
      popularCourses?.forEach(course => {
        dynamicPromos.push({
          id: `course-${course.id}`,
          type: 'course',
          icon: BookOpen,
          title: '🔥 POPULAR COURSE',
          highlight: `${course.enrollment_count || 0}+ enrolled`,
          description: course.title,
          buttonText: 'Enroll Now →',
          buttonLink: `/courses/${course.slug}`,
          bgGradient: 'from-blue-600/30 via-indigo-600/20 to-blue-600/30',
          borderColor: 'border-blue-500/40',
          textColor: 'text-blue-400',
          iconColor: 'bg-blue-500/20'
        });
      });

      // Add trending jobs
      trendingJobs?.forEach(job => {
        dynamicPromos.push({
          id: `job-${job.id}`,
          type: 'job',
          icon: Briefcase,
          title: '📈 TRENDING JOB',
          highlight: `${job.view_count || 0}+ views`,
          description: `${job.title} at ${job.company}`,
          buttonText: 'Apply Now →',
          buttonLink: `/jobs/${job.id}`,
          bgGradient: 'from-emerald-600/30 via-teal-600/20 to-emerald-600/30',
          borderColor: 'border-emerald-500/40',
          textColor: 'text-emerald-400',
          iconColor: 'bg-emerald-500/20'
        });
      });

      // Add featured products
      featuredProducts?.forEach(product => {
        dynamicPromos.push({
          id: `product-${product.id}`,
          type: 'product',
          icon: Gift,
          title: '✨ FEATURED',
          highlight: `$${product.price}`,
          description: product.name,
          buttonText: 'View Product →',
          buttonLink: `/products/${product.slug}`,
          bgGradient: 'from-purple-600/30 via-violet-600/20 to-purple-600/30',
          borderColor: 'border-purple-500/40',
          textColor: 'text-purple-400',
          iconColor: 'bg-purple-500/20'
        });
      });

      // Add popular assessments
      popularAssessments?.forEach(assessment => {
        dynamicPromos.push({
          id: `assessment-${assessment.id}`,
          type: 'assessment',
          icon: Award,
          title: '📊 TRENDING ASSESSMENT',
          highlight: `${assessment.takers_count || 0}+ taken`,
          description: assessment.title,
          buttonText: 'Take Assessment →',
          buttonLink: `/assessments/${assessment.id}`,
          bgGradient: 'from-amber-600/30 via-orange-600/20 to-amber-600/30',
          borderColor: 'border-amber-500/40',
          textColor: 'text-amber-400',
          iconColor: 'bg-amber-500/20'
        });
      });

      // If no dynamic promos, use fallback promos
      if (dynamicPromos.length === 0) {
        setPromos(getFallbackPromos());
      } else {
        setPromos(dynamicPromos.slice(0, 5)); // Limit to 5 promos
      }
    } catch (error) {
      console.error('Error fetching promos:', error);
      setPromos(getFallbackPromos());
    } finally {
      setLoading(false);
    }
  }

  function getFallbackPromos() {
    return [
      {
        id: 1,
        type: 'offer',
        icon: Gift,
        title: '🎁 LIMITED TIME OFFER',
        highlight: '20% OFF',
        description: 'Get 20% off on all CV optimization services',
        buttonText: 'Claim Offer →',
        buttonLink: '/hire-va',
        bgGradient: 'from-amber-600/30 via-orange-600/20 to-amber-600/30',
        borderColor: 'border-amber-500/40',
        textColor: 'text-amber-400',
        iconColor: 'bg-amber-500/20'
      },
      {
        id: 2,
        type: 'trial',
        icon: Rocket,
        title: '🚀 FREE TRIAL',
        highlight: '4 WEEKS FREE',
        description: 'Get 4 weeks of full tester access - No credit card required',
        buttonText: 'Start Free Trial →',
        buttonLink: '/tester-register',
        bgGradient: 'from-primary-600/30 via-sky-600/20 to-primary-600/30',
        borderColor: 'border-primary-500/40',
        textColor: 'text-primary-400',
        iconColor: 'bg-primary-500/20'
      },
      {
        id: 3,
        type: 'feature',
        icon: Zap,
        title: '⚡ NEW FEATURE',
        highlight: 'AI POWERED',
        description: 'AI-powered job matching now live! Get matched instantly',
        buttonText: 'Try AI Matching →',
        buttonLink: '/jobs',
        bgGradient: 'from-emerald-600/30 via-teal-600/20 to-emerald-600/30',
        borderColor: 'border-emerald-500/40',
        textColor: 'text-emerald-400',
        iconColor: 'bg-emerald-500/20'
      },
      {
        id: 4,
        type: 'sale',
        icon: Sparkles,
        title: '🎓 COURSE SALE',
        highlight: '30% OFF',
        description: 'All professional courses 30% off this week only!',
        buttonText: 'Browse Courses →',
        buttonLink: '/courses',
        bgGradient: 'from-purple-600/30 via-violet-600/20 to-purple-600/30',
        borderColor: 'border-purple-500/40',
        textColor: 'text-purple-400',
        iconColor: 'bg-purple-500/20'
      },
      {
        id: 5,
        type: 'skill',
        icon: Star,
        title: '⭐ SKILL VERIFICATION',
        highlight: 'GET VERIFIED',
        description: 'Get your skills verified and boost your Trust Score',
        buttonText: 'Verify Skills →',
        buttonLink: '/skills',
        bgGradient: 'from-yellow-600/30 via-amber-600/20 to-yellow-600/30',
        borderColor: 'border-yellow-500/40',
        textColor: 'text-yellow-400',
        iconColor: 'bg-yellow-500/20'
      }
    ];
  }

  if (!isVisible) return null;
  if (loading) {
    return (
      <div className="w-full h-24 bg-gradient-to-r from-slate-900 to-slate-950 border-y border-slate-800 animate-pulse"></div>
    );
  }

  const promo = promos[currentPromo];
  if (!promo) return null;

  const Icon = promo.icon;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Animated Glowing Border Container */}
      <div className="relative p-[2px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent animate-border-flow">
        <div className={`relative bg-gradient-to-r ${promo.bgGradient} border-y-2 ${promo.borderColor} py-5 md:py-7 px-4 md:px-6`}>
          
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
              
              {/* Left side - Icon & Highlight */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${promo.iconColor} flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110`}>
                  <Icon className={`w-7 h-7 ${promo.textColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${promo.textColor} bg-${promo.textColor.split('-')[1]}-500/20`}>
                      {promo.highlight}
                    </span>
                  </div>
                  <div className={`text-white font-bold text-lg md:text-2xl mt-1`}>
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
              
              {/* Right side - CTA Button with professional hover effect */}
              <Link
                to={promo.buttonLink}
                className={`group relative px-6 py-3 rounded-xl text-white font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden ${
                  promo.type === 'offer' 
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/30'
                    : promo.type === 'trial'
                    ? 'bg-gradient-to-r from-primary-600 to-sky-600 hover:from-primary-700 hover:to-sky-700 shadow-primary-500/30'
                    : promo.type === 'feature'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
                    : promo.type === 'sale'
                    ? 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-purple-500/30'
                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 shadow-yellow-500/30'
                }`}
              >
                {/* Hover shine effect */}
                <span className="absolute inset-0 overflow-hidden rounded-xl">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                </span>
                <span className="relative flex items-center gap-2">
                  {promo.buttonText}
                  <TrendingUp className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 transition-all duration-300 hover:scale-110 text-white/70 hover:text-white"
            aria-label="Close promo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-border-flow {
          background-size: 200% 200%;
          animation: border-flow 3s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}
