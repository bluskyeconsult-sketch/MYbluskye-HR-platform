import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function ScrollingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('banner-dismissed');
    if (saved) setDismissed(true);
  }, []);

  const announcements = [
    "🎉 Welcome to BluSkye Integrated Consult - Creating Value for Partnership",
    "📢 New jobs added daily from 7 countries",
    "🤖 AI-powered CV matching now available",
    "📚 New courses and books added weekly",
    "💡 Contact ODUSBABA for any assistance - We're here to help",
    "⭐ Registered users get FREE unlimited job applications!",
    "🎓 Take free assessments to discover your strengths",
  ];

  const scrollingAnnouncements = [...announcements, ...announcements];

  function handleDismiss() {
    localStorage.setItem('banner-dismissed', 'true');
    setDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-primary-900/50 to-primary-800/30 border-b border-primary-500/20 overflow-hidden">
      <div className="relative">
        <div className="animate-marquee whitespace-nowrap py-2.5 sm:py-3">
          {scrollingAnnouncements.map((text, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 mx-4 sm:mx-6 text-xs sm:text-sm text-slate-300">
              <span className="text-base sm:text-lg">{text.charAt(0)}</span>
              <span className="truncate max-w-[200px] sm:max-w-none">{text}</span>
              <span className="text-slate-500 mx-1 sm:mx-2">•</span>
            </span>
          ))}
        </div>
        
        <button 
          onClick={handleDismiss} 
          className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10 bg-slate-900/50 rounded-full p-1 backdrop-blur-sm"
          aria-label="Close announcements"
        >
          <X className="w-3 h-3 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
