// src/components/FraudAlertBanner.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, Mail, Phone, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FraudAlertBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Check local storage for dismissal status
  useEffect(() => {
    const dismissed = localStorage.getItem('fraudAlertDismissed');
    const dismissedTime = localStorage.getItem('fraudAlertDismissedTime');
    
    if (dismissed === 'true' && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      // Show reminder after 7 days
      if (daysSinceDismissed >= 7) {
        setShowReminder(true);
        setIsVisible(true);
        setIsDismissed(false);
      } else {
        setIsVisible(false);
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('fraudAlertDismissed', 'true');
    localStorage.setItem('fraudAlertDismissedTime', Date.now().toString());
  };

  const handleShowAgain = () => {
    setShowReminder(false);
    setIsVisible(true);
    setIsDismissed(false);
  };

  if (!isVisible && !showReminder) return null;

  // Reminder version (smaller, less intrusive)
  if (showReminder && !isVisible) {
    return (
      <div className="bg-amber-600/20 border-l-4 border-amber-500 p-3 mb-3 rounded-r-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-amber-400">Fraud prevention tips available</span>
          </div>
          <button onClick={handleShowAgain} className="text-xs text-amber-400 hover:text-amber-300 underline">
            Show safety tips →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-red-950/90 to-red-900/90 border-b border-red-800/50">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Left side - Icon and Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">⚠️ Fraud Prevention Alert</h3>
              <p className="text-xs text-red-300">Stay safe while using our platform</p>
            </div>
          </div>
          
          {/* Middle - Safety Tips */}
          <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <span className="flex items-center gap-1 text-red-200">
              <Shield className="w-3 h-3" /> Never pay for job applications
            </span>
            <span className="flex items-center gap-1 text-red-200">
              <Shield className="w-3 h-3" /> Verify employer details
            </span>
            <span className="flex items-center gap-1 text-red-200">
              <Shield className="w-3 h-3" /> Report suspicious activity
            </span>
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link 
              to="/fraud-prevention" 
              className="text-xs text-red-300 hover:text-white transition flex items-center gap-1"
            >
              Learn more <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-red-400 hover:text-white hover:bg-red-800/50 transition"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
