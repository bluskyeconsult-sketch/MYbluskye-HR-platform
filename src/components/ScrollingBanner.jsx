import { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

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
    "💡 Contact ODUSBABA for any assistance - We're here to help"
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
    <div className="bg-gradient-to-r from-sky-900/50 to-emerald-900/50 border-b border-sky-500/20">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <ChevronRight className="w-4 h-4 text-sky-400 animate-pulse flex-shrink-0" />
            <p className="text-sm text-slate-300 truncate animate-slide">
              {announcements[currentIndex]}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
