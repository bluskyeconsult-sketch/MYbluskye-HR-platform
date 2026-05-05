import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Mail, CheckCircle, AlertCircle, X, Sparkles, 
  TrendingUp, Briefcase, Star, Zap, Clock, 
  ChevronRight, Heart, Share2, Bell, Shield,
  Lock, Users, BookOpen, Award, ThumbsUp,
  Send, Loader2
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NewsletterPage() {
  // Form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  
  // Preferences
  const [preferences, setPreferences] = useState({
    jobs: true,
    courses: true,
    assessments: true,
    products: false,
    events: false
  });
  
  // Analytics state
  const [subscriberCount, setSubscriberCount] = useState(null);
  const [recentSubscribers, setRecentSubscribers] = useState([]);
  const [isAddingToWaitlist, setIsAddingToWaitlist] = useState(false);
  
  // Email validation regex
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;

  // Fetch subscriber count on mount
  useEffect(() => {
    fetchSubscriberCount();
    fetchRecentSubscribers();
    
    // Track page view
    trackPageView();
  }, []);

  async function fetchSubscriberCount() {
    try {
      const { count, error } = await supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      if (!error && count) {
        setSubscriberCount(count);
      }
    } catch (err) {
      console.error('Error fetching count:', err);
    }
  }

  async function fetchRecentSubscribers() {
    try {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('name, subscribed_at')
        .eq('status', 'active')
        .order('subscribed_at', { ascending: false })
        .limit(3);
      
      if (!error && data) {
        setRecentSubscribers(data);
      }
    } catch (err) {
      console.error('Error fetching recent subscribers:', err);
    }
  }

  function trackPageView() {
    try {
      console.log('Newsletter Page Viewed', {
        timestamp: new Date().toISOString(),
        referrer: document.referrer,
        path: window.location.pathname
      });
    } catch (err) {}
  }

  function trackSubscription(email, preferences) {
    try {
      console.log('Newsletter Subscription', {
        email: email.substring(0, 3) + '***', // Partial for privacy
        preferences,
        timestamp: new Date().toISOString(),
        source: 'newsletter_page'
      });
    } catch (err) {}
  }

  const handleSubscribe = useCallback(async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g., name@example.com)');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // Check for existing subscription
      const { data: existing, error: checkError } = await supabase
        .from('newsletter_subscribers')
        .select('email, status')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        if (existing.status === 'active') {
          setError('This email is already subscribed to our newsletter');
          setLoading(false);
          return;
        } else if (existing.status === 'unsubscribed') {
          // Reactivate subscription
          const { error: updateError } = await supabase
            .from('newsletter_subscribers')
            .update({
              status: 'active',
              resubscribed_at: new Date().toISOString(),
              preferences: preferences
            })
            .eq('email', email);
          
          if (updateError) throw updateError;
          setSubscribed(true);
          trackSubscription(email, preferences);
          setLoading(false);
          return;
        }
      }

      // Insert new subscriber
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email,
          name: name.trim() || null,
          subscribed_at: new Date().toISOString(),
          preferences: preferences,
          source: 'newsletter_page',
          status: 'active',
          user_agent: navigator.userAgent,
          referrer: document.referrer
        });

      if (insertError) throw insertError;

      // Send welcome email (non-blocking)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { email, name: name.trim() || email.split('@')[0] }
        });
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr);
        // Don't fail subscription if email service fails
      }

      setSubscribed(true);
      setShowSuccessToast(true);
      trackSubscription(email, preferences);
      
      // Refresh subscriber count
      fetchSubscriberCount();
      fetchRecentSubscribers();
      
      // Auto-hide success toast after 5 seconds
      setTimeout(() => setShowSuccessToast(false), 5000);
      
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Unable to subscribe. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [email, name, preferences]);

  const handleAddToWaitlist = useCallback(async () => {
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address to join the waitlist');
      return;
    }
    
    setIsAddingToWaitlist(true);
    
    try {
      const { error: waitlistError } = await supabase
        .from('newsletter_waitlist')
        .insert({
          email,
          name: name.trim() || null,
          joined_at: new Date().toISOString(),
          source: 'newsletter_page'
        });
      
      if (waitlistError) throw waitlistError;
      
      setError('');
      alert('You\'ve been added to our waitlist! We\'ll notify you when spots open up.');
      setEmail('');
      setName('');
      
    } catch (err) {
      console.error('Waitlist error:', err);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setIsAddingToWaitlist(false);
    }
  }, [email, name]);

  const benefits = useMemo(() => [
    { icon: Briefcase, title: "Job Alerts", description: "Get notified about new opportunities", color: "emerald" },
    { icon: TrendingUp, title: "Market Insights", description: "Weekly HR industry trends", color: "blue" },
    { icon: Star, title: "Exclusive Content", description: "Access member-only articles", color: "amber" },
    { icon: Zap, title: "Early Access", description: "Be first to try new features", color: "purple" },
    { icon: Award, title: "Certifications", description: "Free course certificates", color: "pink" },
    { icon: Users, title: "Networking", description: "Connect with peers", color: "indigo" },
  ], []);

  const sampleIssues = useMemo(() => [
    { title: "The Future of Remote Work", date: "March 2024", readTime: "5 min", likes: 234 },
    { title: "AI in Recruitment: 2024 Trends", date: "February 2024", readTime: "4 min", likes: 189 },
    { title: "Skills Assessment Revolution", date: "January 2024", readTime: "6 min", likes: 312 },
    { title: "Diversity & Inclusion Best Practices", date: "December 2023", readTime: "7 min", likes: 456 },
  ], []);

  if (subscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Go to Homepage
            </Link>
            <Link
              to="/articles"
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Browse Articles
            </Link>
            <Link
              to="/assessments"
              className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take Assessments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="bg-emerald-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="font-semibold">Successfully Subscribed!</p>
              <p className="text-sm opacity-90">Welcome to our newsletter community</p>
            </div>
            <button onClick={() => setShowSuccessToast(false)} className="ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-purple-600/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-sm mb-4 animate-pulse">
              <Mail className="w-4 h-4" />
              Weekly Newsletter
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Stay Ahead in
              <span className="bg-gradient-to-r from-emerald-400 to-purple-400 bg-clip-text text-transparent"> HR & Recruitment</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-6">
              Join {subscriberCount ? subscriberCount.toLocaleString() : 'thousands'} of HR professionals getting weekly insights, job alerts, and exclusive content.
            </p>
            
            {/* Social Proof Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 mb-8">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                4.9/5 from 500+ subscribers
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Weekly on Tuesdays
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {subscriberCount ? subscriberCount.toLocaleString() : '10,000+'}+ subscribers
              </span>
            </div>
            
            {/* Recent Activity */}
            {recentSubscribers.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mb-8">
                <div className="flex -space-x-2">
                  {recentSubscribers.map((sub, idx) => (
                    <div key={idx} className="w-6 h-6 rounded-full bg-emerald-600/20 border border-slate-700 flex items-center justify-center">
                      <span className="text-[10px] text-emerald-400">
                        {sub.name ? sub.name.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                  ))}
                </div>
                <span>+{recentSubscribers.length} joined this week</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Subscription Form Card */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center animate-pulse">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Subscribe Now</h2>
                <p className="text-sm text-slate-400">Get weekly updates, no spam. Unsubscribe anytime.</p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Preferences Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Topics You're Interested In
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.jobs}
                      onChange={(e) => setPreferences({...preferences, jobs: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    Job Alerts
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.courses}
                      onChange={(e) => setPreferences({...preferences, courses: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    Courses
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.assessments}
                      onChange={(e) => setPreferences({...preferences, assessments: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    Assessments
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.products}
                      onChange={(e) => setPreferences({...preferences, products: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    Product Updates
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.events}
                      onChange={(e) => setPreferences({...preferences, events: e.target.checked})}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    Events & Webinars
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Subscribe to Newsletter
                  </>
                )}
              </button>
            </form>

            {/* Waitlist Option */}
            <div className="mt-4 text-center">
              <button
                onClick={handleAddToWaitlist}
                disabled={isAddingToWaitlist}
                className="text-sm text-slate-500 hover:text-emerald-400 transition-colors"
              >
                {isAddingToWaitlist ? 'Adding...' : 'Newsletter full? Join waitlist →'}
              </button>
            </div>

            {/* Legal Links */}
            <p className="text-xs text-slate-500 text-center mt-6">
              By subscribing, you agree to our 
              <Link to="/legal/terms" className="text-emerald-400 hover:underline mx-1">Terms</Link>
              and 
              <Link to="/legal/privacy" className="text-emerald-400 hover:underline mx-1">Privacy Policy</Link>
            </p>
          </div>

          {/* Right Column - Benefits & Social Proof */}
          <div className="space-y-6">
            {/* Benefits Grid */}
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                What You'll Get
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex gap-3 group cursor-pointer">
                    <div className={`w-8 h-8 bg-${benefit.color}-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                      <benefit.icon className={`w-4 h-4 text-${benefit.color}-400`} />
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
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Recent Issues
              </h3>
              <div className="space-y-3">
                {sampleIssues.map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-all group cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {issue.title}
                      </p>
                      <div className="flex gap-3 text-xs text-slate-500 mt-1">
                        <span>{issue.date}</span>
                        <span>{issue.readTime} read</span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {issue.likes}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
              <Link to="/articles" className="text-sm text-emerald-400 hover:text-emerald-300 mt-4 inline-flex items-center gap-1">
                View all articles <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-r from-emerald-600/10 to-purple-600/10 border border-emerald-500/20 rounded-2xl p-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400 font-bold">SC</span>
                </div>
                <div>
                  <div className="flex gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-300 italic">
                    "The ODUSBABA newsletter has been invaluable for staying current with HR trends. The job alerts alone helped me find my current role!"
                  </p>
                  <p className="text-xs text-emerald-400 mt-2">— Sarah Chen, HR Director at TechCorp</p>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Shield className="w-3 h-3" /> SOC2 Compliant
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" /> 256-bit Encryption
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Loved by 10,000+
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Mail className="w-3 h-3" /> 42% Open Rate
              </span>
            </div>

            {/* Referral Program Teaser */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-600">
                🎁 Refer a friend and get a free assessment credit. 
                <button className="text-emerald-400 hover:underline ml-1">Learn more</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA for mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 p-4 z-40">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}

// Add to global CSS
const styles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .animate-fade-in { animation: fade-in 0.5s ease-out; }
  .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
  .animate-shake { animation: shake 0.3s ease-in-out; }
`;
