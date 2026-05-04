// src/components/Navbar.jsx
// ULTIMATE ROBUST VERSION - All features + enhancements

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
  Mail, Zap, HelpCircle, ShoppingBag, Star, Shield, Home, 
  LayoutDashboard, UserCircle, Settings, MessageCircle, 
  Award, TrendingUp, Scale, FileSignature, Globe, ExternalLink,
  LogOut, UserPlus, Lock, Eye, AlertTriangle
} from 'lucide-react';
import Logo from './Logo';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [testerVisibility, setTesterVisibility] = useState({
    show_login_button: false,
    show_register_button: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current route is active
  const isActiveRoute = useCallback((path) => {
    if (path === '/') return location.pathname === path;
    return location.pathname.startsWith(path);
  }, [location.pathname]);

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
        .select('user_type, tier, full_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      setProfile(data);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('user_type, tier, full_name, avatar_url')
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
    setUserMenuOpen(false);
  };

  // Main navigation items
  const mainNavItems = useMemo(() => [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Workforce', path: '/workforce', icon: Users },
    { name: 'Courses', path: '/courses', icon: BookOpen, highlight: true },
    { name: 'Books', path: '/books', icon: BookOpen },
    { name: 'Assessments', path: '/assessments', icon: FileText },
    { name: 'Newsletter', path: '/newsletter', icon: Mail },
    { name: 'Hire VA', path: '/hire-va', icon: Zap, highlight: true },
  ], []);

  // Enhanced Resources Links (merged from both versions)
  const resourcesLinks = useMemo(() => [
    { name: 'About Us', path: '/about', icon: Users, category: 'Company' },
    { name: 'Contact', path: '/contact', icon: Mail, category: 'Company' },
    { name: 'Pricing', path: '/pricing', icon: Star, category: 'Company' },
    { name: 'FAQ', path: '/faq', icon: HelpCircle, category: 'Support' },
    { name: 'Blog', path: '/blog', icon: FileText, category: 'Content' },
    { name: 'Articles', path: '/articles', icon: FileText, category: 'Content' },
    { name: 'More Products', path: '/more-products', icon: ShoppingBag, category: 'Products' },
    { name: 'Affiliate Program', path: '/affiliate', icon: Award, category: 'Products' },
  ], []);

  // Legal & Safety Links
  const legalLinks = useMemo(() => [
    { name: 'Terms of Service', path: '/legal/terms', icon: FileSignature },
    { name: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
    { name: 'Cookie Policy', path: '/legal/cookies', icon: Globe },
    { name: 'Disclaimer', path: '/legal/disclaimer', icon: AlertTriangle },
    { name: 'Acceptable Use', path: '/legal/acceptable-use', icon: Scale },
    { name: 'Fraud Prevention', path: '/fraud-prevention', icon: Lock },
    { name: 'Safety Tips', path: '/safety-tips', icon: Eye },
  ], []);

  // User navigation items
  const userNavItems = useMemo(() => user ? [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
    { name: 'My Applications', path: '/applications', icon: Briefcase },
    { name: 'My Skills', path: '/skills', icon: TrendingUp },
    { name: 'Saved Jobs', path: '/saved-jobs', icon: BookOpen },
    { name: 'Job Alerts', path: '/job-alerts', icon: Bell },
    { name: 'Messages', path: '/messages', icon: MessageCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ] : [], [user]);

  // Role-based navigation
  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
  const employerNavItems = useMemo(() => isEmployer ? [
    { name: 'Company Profile', path: '/company-profile', icon: Building },
    { name: 'Post a Job', path: '/post-job', icon: Plus },
    { name: 'Manage Jobs', path: '/manage-jobs', icon: Briefcase },
    { name: 'Candidate Search', path: '/candidates', icon: Users },
  ] : [], [isEmployer]);

  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
  const adminNavItems = useMemo(() => isAdmin ? [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Manage Jobs', path: '/admin/jobs', icon: Briefcase },
    { name: 'Manage Articles', path: '/admin/articles', icon: FileText },
    { name: 'Fraud Reports', path: '/admin/fraud-reports', icon: AlertTriangle },
    { name: 'Testing Mode', path: '/admin/testing-mode', icon: Lock },
  ] : [], [isAdmin]);

  const isTester = profile?.user_type === 'tester';
  const testerNavItems = useMemo(() => isTester ? [
    { name: 'Tester Dashboard', path: '/tester/dashboard', icon: LayoutDashboard },
    { name: 'Submit Feedback', path: '/tester/feedback', icon: MessageCircle },
    { name: 'Bug Reports', path: '/tester/bugs', icon: AlertTriangle },
  ] : [], [isTester]);

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setResourcesOpen(false);
      setProductsOpen(false);
      setUserMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Row 1: Logo + Auth Buttons */}
        <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800/50">
          
          {/* Logo Section */}
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
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-all duration-200"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-primary-400" />
                    </div>
                  )}
                  <div className="text-left hidden sm:block">
                    <p className="text-xs text-slate-400">{profile?.tier || profile?.user_type || 'Member'}</p>
                    <p className="text-sm text-white font-medium max-w-[120px] truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-700">
                      <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      {userNavItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      ))}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 border-t border-slate-700"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
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

        {/* Row 2: Desktop Navigation */}
        <div className="hidden lg:block py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            
            {/* Main Navigation */}
            {mainNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1 ${
                  isActiveRoute(item.path)
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : item.highlight 
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20' 
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
                onClick={(e) => { e.stopPropagation(); setProductsOpen(!productsOpen); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  productsOpen ? 'bg-slate-800 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-2">
                    <Link to="/more-products" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                      <ShoppingBag className="w-4 h-4" />
                      <div>
                        <div className="font-medium">More Products</div>
                        <div className="text-xs text-slate-500">Explore all our offerings</div>
                      </div>
                    </Link>
                    <Link to="/hire-va" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Zap className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Hire VA</div>
                        <div className="text-xs text-slate-500">AI-powered virtual assistants</div>
                      </div>
                    </Link>
                    <Link to="/newsletter" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 hover:text-white">
                      <Mail className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Newsletter</div>
                        <div className="text-xs text-slate-500">Stay updated with news</div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Employer Links */}
            {employerNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 flex items-center gap-1"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Tester Links */}
            {testerNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200 flex items-center gap-1"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Admin Links */}
            {adminNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-all duration-200 flex items-center gap-1"
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setResourcesOpen(!resourcesOpen); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  resourcesOpen ? 'bg-slate-800 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Resources <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="max-h-96 overflow-y-auto">
                    {/* Company Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-900/50">Company</div>
                    {resourcesLinks.filter(l => l.category === 'Company').map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {link.icon && <link.icon className="w-4 h-4" />}
                        {link.name}
                      </Link>
                    ))}
                    
                    {/* Products Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-900/50 mt-1">Products</div>
                    {resourcesLinks.filter(l => l.category === 'Products').map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {link.icon && <link.icon className="w-4 h-4" />}
                        {link.name}
                      </Link>
                    ))}
                    
                    {/* Legal & Safety Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-900/50 mt-1">Legal & Safety</div>
                    {legalLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {link.icon && <link.icon className="w-4 h-4" />}
                        {link.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
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
                    isActiveRoute(item.path)
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : item.highlight 
                        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
                        : 'text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.name}
                </Link>
              ))}
              
              {/* Products Section */}
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 pt-4 pb-1">
                PRODUCTS
              </div>
              <Link to="/more-products" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                More Products
              </Link>
              <Link to="/hire-va" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Hire Virtual Assistant
              </Link>
              <Link to="/newsletter" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4" />
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
                      className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <item.icon className="w-4 h-4" />
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
                      className="px-3 py-2 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2"
                    >
                      <item.icon className="w-4 h-4" />
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
                      className="px-3 py-2 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex items-center gap-2"
                    >
                      <item.icon className="w-4 h-4" />
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
                LEGAL & SAFETY
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
