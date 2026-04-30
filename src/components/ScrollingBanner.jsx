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
    { icon: "💡", text: "Contact ODUSBABA for any assistance - We're here to help" }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);

  function handleDismiss() {
    localStorage.setItem('banner-dismissed', 'true');
    setDismissed(true);
    setIsVisible(false);
  }

  if (!isVisible || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-sky-900/30 to-emerald-900/30 border-b border-sky-500/20">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <Bell className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-lg">{announcements[currentIndex].icon}</span>
              <p className="text-sm text-slate-300 font-medium truncate">
                {announcements[currentIndex].text}
              </p>
            </div>
            <ChevronRight className="w-3 h-3 text-slate-500 animate-pulse flex-shrink-0" />
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-slate-800"
            aria-label="Close announcements"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
