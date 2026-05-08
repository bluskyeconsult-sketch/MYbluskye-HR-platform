// src/components/FraudAlertBanner.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X, CheckCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FraudAlertBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user dismissed the alert
    const dismissed = localStorage.getItem('fraudAlertDismissed');
    const dismissedTime = localStorage.getItem('fraudAlertDismissedTime');
    
    if (dismissed === 'true' && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed >= 7) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    } else {
      setIsVisible(true);
    }
    setIsLoading(false);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('fraudAlertDismissed', 'true');
    localStorage.setItem('fraudAlertDismissedTime', Date.now().toString());
  };

  if (isLoading) return null;
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 border-b border-red-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left side - Icon and Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">⚠️ Fraud Prevention Alert</h3>
                <p className="text-xs text-red-300">Protect yourself from scams</p>
              </div>
            </div>

            {/* Middle - Tips */}
            <div className="flex-1 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-red-200">
                <Shield className="w-3.5 h-3.5" />
                <span>Never pay for job applications</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verify employer details</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-200">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Report suspicious activity</span>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link 
                to="/fraud-prevention" 
                className="text-xs px-3 py-1.5 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Learn More
              </Link>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg bg-red-800/50 text-red-300 hover:text-white hover:bg-red-800/80 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add padding to body to prevent content shift */}
      <div className="h-0" />
    </div>
  );
}
