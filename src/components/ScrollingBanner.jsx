// src/components/ScrollingBanner.jsx
// RESTORED - Scrolling notification bar for announcements

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Megaphone, X } from 'lucide-react';

export default function ScrollingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default notifications (fallback if database empty)
  const defaultNotifications = [
    { id: 1, type: 'newsletter', message: '📰 Subscribe to our newsletter for weekly career insights!', link: '/newsletter', emoji: '📰' },
    { id: 2, type: 'jobs', message: '💼 50+ new jobs posted this week! Browse now.', link: '/jobs', emoji: '💼' },
    { id: 3, type: 'courses', message: '🎓 New AI course: "Mastering HR Analytics" - Enroll today!', link: '/courses', emoji: '🎓' },
    { id: 4, type: 'assessment', message: '📊 Free career assessment - Discover your strengths!', link: '/assessments', emoji: '📊' },
    { id: 5, type: 'event', message: '🎉 Webinar: "Future of Work 2026" - Register now!', link: '/events', emoji: '🎉' },
    { id: 6, type: 'offer', message: '🔥 Limited offer: 20% off all VA services!', link: '/hire-va', emoji: '🔥' },
    { id: 7, type: 'skill', message: '⭐ New skill badges available - Get verified today!', link: '/skills', emoji: '⭐' },
  ];

  useEffect(() => {
    fetchNotifications();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      // Try to fetch from database
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

  if (!isVisible) return null;
  if (loading) return <div className="h-8 bg-slate-900/50"></div>;

  // Create marquee content
  const marqueeContent = [...notifications, ...notifications].map((note, idx) => (
    <Link
      key={`${note.id}-${idx}`}
      to={note.link}
      className="inline-flex items-center gap-2 mx-6 px-3 py-1 hover:text-primary-400 transition-colors"
      onClick={(e) => {
        if (!note.link || note.link === '/') e.preventDefault();
      }}
    >
      <span className="text-base">{note.emoji}</span>
      <span className="text-sm font-medium">{note.message}</span>
    </Link>
  ));

  return (
    <div className="relative bg-gradient-to-r from-primary-900/40 via-slate-900 to-primary-900/40 border-y border-primary-500/20 py-2 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
      
      <div className="flex items-center gap-2 max-w-full overflow-hidden">
        <div className="flex-shrink-0 ml-2 z-20 bg-slate-950/80 px-2 py-0.5 rounded-full">
          <Megaphone className="w-4 h-4 text-primary-400" />
        </div>
        
        <div className="relative overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap inline-block">
            {marqueeContent}
          </div>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 mr-2 p-1 hover:bg-slate-800 rounded-full transition z-20"
          aria-label="Close notifications"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-white" />
        </button>
      </div>
      
      {/* CSS for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          display: inline-block;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
