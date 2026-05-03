// src/components/ScrollingBanner.jsx
// STICKY notification bar - always visible at top, reappears on refresh

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Megaphone, X, Bell } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ScrollingBanner() {
  // Check sessionStorage for dismissed state (not localStorage - reappears on refresh)
  const [isVisible, setIsVisible] = useState(() => {
    const dismissed = sessionStorage.getItem('notificationBannerDismissed');
    return dismissed !== 'true';
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real notifications with actual content
  const defaultNotifications = [
    { id: 1, type: 'newsletter', message: '📰 Subscribe to our weekly newsletter for expert career insights and job search tips!', link: '/newsletter', emoji: '📰' },
    { id: 2, type: 'jobs', message: '💼 50+ new jobs posted this week across 7 countries! Find your next opportunity.', link: '/jobs', emoji: '💼' },
    { id: 3, type: 'courses', message: '🎓 NEW: "AI for HR Professionals" course launched. Enroll today and get certified!', link: '/courses', emoji: '🎓' },
    { id: 4, type: 'assessment', message: '📊 Free career assessment - Discover your strengths and get personalized recommendations.', link: '/assessments', emoji: '📊' },
    { id: 5, type: 'offer', message: '🔥 Limited offer: 20% off all VA services for first-time users. Use code: SKY20', link: '/hire-va', emoji: '🔥' },
    { id: 6, type: 'skill', message: '⭐ New skill badges available - Get verified and boost your Trust Score today!', link: '/skills', emoji: '⭐' },
  ];

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const formatted = data.map(item => ({
          id: item.id,
          type: item.type,
          message: item.message,
          link: item.link || '/',
          emoji: item.emoji || '📢'
        }));
        setNotifications(formatted);
      } else {
        setNotifications(defaultNotifications);
      }
    } catch (error) {
      console.warn('Using default notifications:', error);
      setNotifications(defaultNotifications);
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('notificationBannerDismissed', 'true');
  };

  if (!isVisible) return null;
  if (loading) {
    return (
      <div className="sticky top-0 z-50 w-full h-10 bg-gradient-to-r from-slate-900 to-slate-950 border-b border-slate-800 animate-pulse"></div>
    );
  }

  const marqueeContent = [...notifications, ...notifications].map((note, idx) => (
    <Link
      key={`${note.id}-${idx}`}
      to={note.link}
      className="inline-flex items-center gap-2 mx-6 px-3 py-1 hover:text-primary-400 transition-colors group"
    >
      <span className="text-base">{note.emoji}</span>
      <span className="text-sm font-medium group-hover:text-primary-400 transition">
        {note.message}
      </span>
      <span className="text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition">→</span>
    </Link>
  ));

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary-900/40 via-slate-900 to-primary-900/40 border-b border-primary-500/20 py-2 overflow-hidden backdrop-blur-sm">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 max-w-full overflow-hidden">
        <div className="flex-shrink-0 ml-2 z-20 bg-slate-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Bell className="w-3 h-3 text-primary-400 animate-pulse" />
          <Megaphone className="w-3 h-3 text-primary-400" />
        </div>
        
        <div className="relative overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap inline-block">
            {marqueeContent}
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 mr-2 p-1 hover:bg-slate-800 rounded-full transition z-20"
          aria-label="Close notifications"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-white" />
        </button>
      </div>
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          display: inline-block;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
