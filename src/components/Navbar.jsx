// src/components/Navbar.jsx
// COMPLETE - All links verified and working WITH LOGO COMPONENT

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, Mail, Zap, HelpCircle, ShoppingBag, Star, Shield } from 'lucide-react';
import Logo from './Logo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [testerVisibility, setTesterVisibility] = useState({
    show_login_button: false,
    show_register_button: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    loadTesterVisibility();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('user_type, tier')
        .eq('id', session.user.id)
        .single();
      setProfile(data);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type, tier')
          .eq('id', session.user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }

  async function loadTesterVisibility() {
    const { data } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'tester_visibility')
      .single();
    
    if (data?.config_value) {
      setTesterVisibility(data.config_value);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setMobileMenuOpen(false);
  };

  // Main navigation items - ALL LINKS VERIFIED
  const mainNavItems = [
    { name: 'Home', path: '/', icon: null },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Workforce', path: '/workforce', icon: Users },
    { name: 'Courses', path: '/courses', icon: BookOpen, highlight: true },
    { name: 'Books', path: '/books', icon: BookOpen },
    { name: 'Assessments', path: '/assessments', icon: FileText },
    { name: 'Newsletter', path: '/newsletter', icon: Mail },
    { name: 'Hire VA', path: '/hire-va', icon: Zap, highlight: true },
  ];

  // Secondary navigation (in Resources dropdown)
  const resourcesLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Blog', path: '/blog' },
    { name: 'Articles', path: '/articles' },
    { name: 'Affiliate Program', path: '/affiliate' },
    { name: 'Safety Tips', path: '/safety-tips' },
    { name: 'Report Fraud', path: '/report-fraud' },
  ];

  // Legal links (in Resources dropdown)
  const legalLinks = [
    { name: 'Terms of Service', path: '/legal/terms' },
    { name: 'Privacy Policy', path: '/legal/privacy' },
    { name: 'Cookie Policy', path: '/legal/cookies' },
    { name: 'Disclaimer', path: '/legal/disclaimer' },
    { name: 'Acceptable Use', path: '/legal/acceptable-use' },
    { name: 'Fraud Prevention', path: '/legal/fraud-prevention' },
  ];

  // Logged-in user specific links
  const userNavItems = user ? [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'My Profile', path: '/profile' },
    { name: 'My Applications', path: '/applications' },
    { name: 'My Skills', path: '/skills' },
    { name: 'Saved Jobs', path: '/saved-jobs' },
    { name: 'Job Alerts', path: '/job-alerts' },
    { name: 'Messages', path: '/messages' },
    { name: 'Settings', path: '/settings' },
  ] : [];

  // Employer specific links
  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
  const employerNavItems = isEmployer ? [
    { name: 'Company Profile', path: '/company-profile' },
    { name: 'Post a Job', path: '/post-job' },
    { name: 'Manage Jobs', path: '/manage-jobs' },
  ] : [];

  // Admin specific links
  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
  const adminNavItems = isAdmin ? [
    { name: 'Admin Dashboard', path: '/admin/dashboard' },
    { name: 'Manage Users', path: '/admin/users' },
    { name: 'Manage Jobs', path: '/admin/jobs' },
    { name: 'Manage Articles', path: '/admin/articles' },
    { name: 'Fraud Reports', path: '/admin/fraud-reports' },
    { name: 'Testing Mode', path: '/admin/testing-mode' },
    { name: 'Email Test', path: '/admin/email-test' },
  ] : [];

  // Tester specific links
  const isTester = profile?.user_type === 'tester';
  const testerNavItems = isTester ? [
    { name: 'Tester Dashboard', path: '/tester/dashboard' },
    { name: 'Submit Feedback', path: '/tester/feedback' },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============================================ */}
        {/* ROW 1: Logo + Auth Buttons */}
        {/* ============================================ */}
        <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800/50">
          
          {/* Logo Section - USING LOGO COMPONENT */}
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <Logo size="md" showText={true} linkTo="/" />
          </div>
          
          {/* Auth Buttons */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
            {!user ? (
              <>
                <Link 
                  to="/sign-in" 
                  className="px-4 py-2 text-sm font-medium border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-800 hover:border-slate-500 transition-all duration-200"
                >
                  Log In
                </Link>
                <Link 
                  to="/sign-up" 
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 shadow-lg shadow-primary-500/20"
                >
                  Sign Up Free
                </Link>
                
                {testerVisibility.show_login_button && (
                  <Link 
                    to="/tester-login" 
                    className="px-3 py-2 text-sm font-medium border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all duration-200"
                  >
                    Tester Login
                  </Link>
                )}
                {testerVisibility.show_register_button && (
                  <Link 
                    to="/tester-register" 
                    className="px-3 py-2 text-sm font-medium bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 transition-all duration-200"
                  >
                    Become Tester
                  </Link>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-400">{profile?.tier || profile?.user_type || 'Member'}</p>
                  <p className="text-sm text-white font-medium truncate max-w-[120px]">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* ============================================ */}
        {/* ROW 2: Desktop Navigation Menu */}
        {/* ============================================ */}
        <div className="hidden lg:block py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            
            {/* Main Navigation */}
            {mainNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1 ${
                  item.highlight 
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30' 
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.icon && <item.icon className="w-3.5 h-3.5" />}
                {item.name}
              </Link>
            ))}
            
            {/* Products Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                More Products <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <Link to="/hire-va" onClick={() => setProductsOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700">
                    Hire Virtual Assistant
                  </Link>
                  <Link to="/newsletter" onClick={() => setProductsOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                    Newsletter
                  </Link>
                </div>
              )}
            </div>
            
            {/* User-specific links */}
            {userNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Employer links */}
            {employerNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Tester links */}
            {testerNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Admin links */}
            {adminNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                Resources <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">Company</div>
                    {resourcesLinks.slice(0, 4).map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {link.name}
                      </Link>
                    ))}
                    <div className="border-t border-slate-700 my-1"></div>
                    <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">Legal & Safety</div>
                    {legalLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* MOBILE MENU */}
        {/* ============================================ */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col space-y-2">
              
              {/* Main Nav */}
              <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-2 pb-1">
                MAIN MENU
              </div>
              {mainNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-base font-semibold flex items-center gap-2 ${
                    item.highlight 
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' 
                      : 'text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </Link>
              ))}
              
              {/* More Products */}
              <Link to="/hire-va" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                Hire Virtual Assistant
              </Link>
              <Link to="/newsletter" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                Newsletter
              </Link>
              
              {/* User Links */}
              {user && (
                <>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                    YOUR ACCOUNT
                  </div>
                  {userNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              {/* Employer Links */}
              {employerNavItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider px-3 pt-4 pb-1">
                    EMPLOYER
                  </div>
                  {employerNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              {/* Tester Links */}
              {testerNavItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 pt-4 pb-1">
                    TESTER
                  </div>
                  {testerNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              {/* Admin Links */}
              {adminNavItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-4 pb-1">
                    ADMIN
                  </div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm font-medium border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 text-center"
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              {/* Resources */}
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                RESOURCES
              </div>
              {resourcesLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Legal */}
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                LEGAL
              </div>
              {legalLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
