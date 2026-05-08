// src/components/ScrollingBanner.jsx
import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Zap, Gift, TrendingUp, BookOpen, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

const messages = [
  { id: 1, text: "🎓 Free users get 1 free assessment per month!", link: "/pricing", linkText: "Upgrade Now" },
  { id: 2, text: "🚀 Post your first job for free!", link: "/post-job", linkText: "Get Started" },
  { id: 3, text: "📚 New courses added weekly! Start learning today.", link: "/courses", linkText: "View Courses" },
  { id: 4, text: "💼 Apply to jobs with verified skills!", link: "/skills", linkText: "Verify Skills" },
  { id: 5, text: "🤖 AI-powered virtual assistants available 24/7!", link: "/hire-va", linkText: "Hire VA" },
  { id: 6, text: "📊 Take assessments to discover your strengths!", link: "/assessments", linkText: "Take Assessment" }
];

export default function ScrollingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scroll = () => {
      if (!isPaused && scrollContainer) {
        if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
          scrollContainer.scrollLeft = 0;
        } else {
          scrollContainer.scrollLeft += 1;
        }
      }
    };

    const interval = setInterval(scroll, 30);
    return () => clearInterval(interval);
  }, [isPaused]);

  if (!isVisible) return null;

  // Duplicate messages for seamless scrolling
  const scrollingMessages = [...messages, ...messages];

  return (
    <div className="relative bg-gradient-to-r from-slate-800/80 via-slate-800/90 to-slate-800/80 border-y border-slate-700/50 overflow-hidden">
      {/* Simple dot pattern overlay */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.2) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      <div className="relative py-2.5">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Scrolling Messages */}
          <div 
            ref={scrollRef}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex items-center gap-8 whitespace-nowrap">
              {scrollingMessages.map((message, idx) => (
                <div key={`${message.id}-${idx}`} className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400 animate-pulse" />
                  <span>{message.text}</span>
                  <Link to={message.link} className="text-primary-400 hover:text-primary-300 font-medium ml-1 transition-colors">
                    {message.linkText} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dismiss Button */}
          <button 
            onClick={() => setIsVisible(false)} 
            className="ml-3 p-1 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600/50 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
