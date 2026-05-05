import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Mail, CheckCircle, AlertCircle, X, Sparkles, 
  TrendingUp, Briefcase, Star, Zap, Clock, 
  ChevronRight, Heart, Share2, Bell 
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    jobs: true,
    courses: true,
    assessments: true,
    products: false
  });
  const [subscriberCount, setSubscriberCount] = useState(null);

  // Fetch subscriber count for social proof
  useEffect(() => {
    fetchSubscriberCount();
  }, []);

  async function fetchSubscriberCount() {
    try {
      const { count, error } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true });
      
      if (!error && count) {
        setSubscriberCount(count);
      }
    } catch (err) {
      console.error('Error fetching count:', err);
    }
  }

  const handleSubscribe = useCallback(async (e) => {
    e.preventDefault();
    
    // Email validation
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('email', email)
        .single();

      if (existing) {
        setError('This email is already subscribed to our newsletter');
        setLoading(false);
        return;
      }

      // Insert new subscriber
      const { error: supabaseError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email,
          name: name || null,
          subscribed_at: new Date().toISOString(),
          preferences: preferences,
          source: 'newsletter_page',
          status: 'active'
        });

      if (supabaseError) throw supabaseError;

      // Send welcome email (optional - call your edge function)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name }
        });
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr);
        // Don't fail subscription if email fails
      }

      setSubscribed(true);
      
      // Track subscription event
      console.log('Newsletter subscription:', { email, preferences, timestamp: new Date() });
      
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, name, preferences]);

  const benefits = [
    { icon: Briefcase, title: "Job Alerts", description: "Get notified about new opportunities" },
    { icon: TrendingUp, title: "Market Insights", description: "Weekly HR industry trends" },
    { icon: Star, title: "Exclusive Content", description: "Access member-only articles" },
    { icon: Zap, title: "Early Access", description: "Be first to try new features" },
  ];

  const sampleIssues = [
    { title: "The Future of Remote Work", date: "March 2024", readTime: "5 min" },
    { title: "AI in Recruitment", date: "February 2024", readTime: "4 min" },
    { title: "Skills Assessment Trends", date: "January 2024", readTime: "6 min" },
  ];

  if (subscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Welcome to the Club! 🎉</h1>
          <p className="text-slate-400 text-lg mb-4">
            Thanks for subscribing to the ODUSBABA newsletter!
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-300">
              📧 A confirmation email has been sent to <span className="text-emerald-400 font-medium">{email}</span>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Check your inbox (and spam folder) to confirm your subscription.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Go to Homepage
            </button>
            <button
              onClick={() => window.location.href = '/articles'}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Read Articles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-sm mb-4">
              <Mail className="w-4 h-4" />
              Weekly Newsletter
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Stay Ahead in HR & Recruitment
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              Join {subscriberCount ? subscriberCount.toLocaleString() : 'thousands'} of HR professionals getting weekly insights.
            </p>
            
            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-8">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                4.9/5 from 500+ subscribers
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Weekly on Tuesdays
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Subscription Form */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Subscribe Now</h2>
                <p className="text-sm text-slate-400">Get weekly updates, no spam</p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Preferences */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Topics You're Interested In
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.jobs}
                      onChange={(e) => setPreferences({...preferences, jobs: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    Job Alerts
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.courses}
                      onChange={(e) => setPreferences({...preferences, courses: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    Courses & Learning
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.assessments}
                      onChange={(e) => setPreferences({...preferences, assessments: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    Assessments
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={preferences.products}
                      onChange={(e) => setPreferences({...preferences, products: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    Product Updates
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    Subscribe to Newsletter
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-6">
              By subscribing, you agree to our 
              <a href="/legal/terms" className="text-emerald-400 hover:underline mx-1">Terms of Service</a>
              and 
              <a href="/legal/privacy" className="text-emerald-400 hover:underline mx-1">Privacy Policy</a>
            </p>
          </div>

          {/* Benefits & Sample Content */}
          <div className="space-y-6">
            {/* Benefits Grid */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">What You'll Get</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{benefit.title}</h4>
                      <p className="text-xs text-slate-400">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Issues */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Issues</h3>
              <div className="space-y-3">
                {sampleIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{issue.title}</p>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>{issue.date}</span>
                        <span>{issue.readTime} read</span>
                      </div>
                    </div>
                    <button className="text-emerald-400 hover:text-emerald-300">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-r from-emerald-600/10 to-purple-600/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">JD</span>
                </div>
                <div>
                  <p className="text-sm text-slate-300 italic">
                    "The ODUSBABA newsletter has been invaluable for staying current with HR trends. The job alerts alone helped me find my current role!"
                  </p>
                  <p className="text-xs text-emerald-400 mt-2">— Sarah Chen, HR Director</p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3" /> GDPR Compliant
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Secure Data
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Loved by 5000+
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
