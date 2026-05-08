// src/components/ScrollingBanner.jsx
import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const messages = [
  { 
    type: 'promo', 
    text: "🎓 Free users get 1 free assessment per month!", 
    link: "/pricing", 
    linkText: "Upgrade to Professional",
    icon: null
  },
  { 
    type: 'promo', 
    text: "🚀 Post your first job for free!", 
    link: "/post-job", 
    linkText: "Get Started",
    icon: null
  },
  { 
    type: 'security', 
    text: "⚠️ Never pay for job applications. Legitimate employers never ask for payment.", 
    link: "/fraud-prevention", 
    linkText: "Learn More",
    icon: AlertTriangle,
    highlight: true
  },
  { 
    type: 'security', 
    text: "🛡️ Verify employer details before sharing personal information.", 
    link: "/safety-tips", 
    linkText: "Safety Tips",
    icon: Shield,
    highlight: true
  }
];

export default function ScrollingBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const currentMessage = messages[currentIndex];
  const isSecurityMessage = currentMessage.type === 'security';
  const Icon = currentMessage.icon;

  return (
    <div className={`relative ${isSecurityMessage ? 'bg-red-950/90 border-b border-red-800/50' : 'bg-gradient-to-r from-primary-900/50 to-primary-800/50 border-b border-primary-800/30'}`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left side - Message */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${isSecurityMessage ? 'text-red-400' : 'text-primary-400'}`} />}
            <p className={`text-sm truncate ${isSecurityMessage ? 'text-red-200' : 'text-slate-300'}`}>
              {currentMessage.text}
            </p>
          </div>
          
          {/* Right side - Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentMessage.link && (
              <Link 
                to={currentMessage.link} 
                className={`text-xs font-medium ${isSecurityMessage ? 'text-red-300 hover:text-white' : 'text-primary-400 hover:text-primary-300'} transition`}
              >
                {currentMessage.linkText} →
              </Link>
            )}
            <button
              onClick={handleDismiss}
              className={`p-1 rounded ${isSecurityMessage ? 'text-red-400 hover:text-white hover:bg-red-800/50' : 'text-slate-500 hover:text-white hover:bg-slate-800'} transition`}
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
