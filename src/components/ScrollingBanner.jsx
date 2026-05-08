// src/components/ScrollingBanner.jsx
import { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Zap, Gift, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const messages = [
  { id: 1, text: "🎓 Free users get 1 free assessment per month!", link: "/pricing", linkText: "Upgrade Now" },
  { id: 2, text: "🚀 Post your first job for free!", link: "/post-job", linkText: "Get Started" },
  { id: 3, text: "📚 New courses added weekly! Start learning today.", link: "/courses", linkText: "View Courses" },
  { id: 4, text: "💼 Apply to jobs with verified skills!", link: "/skills", linkText: "Verify Skills" },
  { id: 5, text: "🤖 AI-powered virtual assistants available 24/7!", link: "/hire-va", linkText: "Hire VA" }
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
    <div className="relative bg-gradient-to-r from-primary-600/20 via-purple-600/20 to-primary-600/20 border-b border-primary-500/20 overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
      
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
                  <Link to={message.link} className="text-primary-400 hover:text-primary-300 font-medium ml-1">
                    {message.linkText} →
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          {/* Dismiss Button */}
          <button 
            onClick={() => setIsVisible(false)} 
            className="ml-3 p-1 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
