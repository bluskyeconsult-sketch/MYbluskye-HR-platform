import { useState, useEffect } from 'react';
import { X, ChevronRight, Bell } from 'lucide-react';

export default function ScrollingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('banner-dismissed');
    if (saved) setDismissed(true);
  }, []);

  const announcements = [
    { icon: "🎉", text: "Welcome to ODUSBABA - Creating Value for Partnership" },
    { icon: "📢", text: "New jobs added daily from 7 countries" },
    { icon: "🤖", text: "AI-powered CV matching now available" },
    { icon: "📚", text: "New courses and books added weekly" },
    { icon: "💡", text: "Contact ODUSBABA for any assistance - We're here to help" },
    { icon: "⭐", text: "Registered users get FREE unlimited job applications!" },
    { icon: "🎓", text: "Take free assessments to discover your strengths" },
  ];

  // Duplicate announcements for seamless loop
  const scrollingAnnouncements = [...announcements, ...announcements];

  function handleDismiss() {
    localStorage.setItem('banner-dismissed', 'true');
    setDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-900/30 to-emerald-900/30 border-b border-sky-500/20 overflow-hidden">
      <div className="relative">
        <div className="animate-marquee whitespace-nowrap py-2.5">
          {scrollingAnnouncements.map((announcement, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 mx-6 text-sm text-slate-300">
              <span className="text-lg">{announcement.icon}</span>
              {announcement.text}
              <span className="text-slate-500 mx-2">•</span>
            </span>
          ))}
        </div>
        
        {/* Dismiss button */}
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
