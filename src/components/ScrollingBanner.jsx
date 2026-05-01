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
    "🎉 Welcome to ODUSBABA - Creating Value for Partnership",
    "📢 New jobs added daily from 7 countries",
    "🤖 AI-powered CV matching now available",
    "📚 New courses and books added weekly",
    "💡 Contact ODUSBABA for any assistance - We're here to help",
    "⭐ Registered users get FREE unlimited job applications!",
    "🎓 Take free assessments to discover your strengths",
  ];

  // Duplicate for seamless loop
  const scrollingAnnouncements = [...announcements, ...announcements];

  function handleDismiss() {
    localStorage.setItem('banner-dismissed', 'true');
    setDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || dismissed) return null;

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-sky-900/30 to-emerald-900/30 border-b border-sky-500/20 overflow-hidden">
      <div className="relative">
        <div className="animate-marquee whitespace-nowrap py-2.5">
          {scrollingAnnouncements.map((text, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 mx-6 text-sm text-slate-300">
              <span className="text-lg">{text.charAt(0)}</span>
              {text}
              <span className="text-slate-500 mx-2">•</span>
            </span>
          ))}
        </div>
        
        <button 
          onClick={handleDismiss} 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-10 bg-slate-900/50 rounded-full p-1 backdrop-blur-sm"
          aria-label="Close announcements"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
