// src/components/Navbar.jsx
// COMPLETE TWO-ROW NAVIGATION WITH CONSOLIDATED AUTH BUTTONS

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Menu, X, ChevronDown } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
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

  // Navigation items - All products/services clearly visible
  const mainNavItems = [
    { name: 'Home', path: '/' },
    { name: 'Jobs', path: '/jobs' },
    { name: 'Workforce', path: '/workforce' },
    { name: 'Courses', path: '/courses', highlight: true },
    { name: 'Books', path: '/books' },
    { name: 'Assessments', path: '/assessments' },
    { name: 'Newsletter', path: '/newsletter' },
    { name: 'Hire VA', path: '/hire-va', highlight: true },
  ];

  const secondaryNavItems = [
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Affiliate', path: '/affiliate' },
    { name: 'Articles', path: '/articles' },
  ];

  // Logged-in user specific links
  const userNavItems = user ? [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Saved Jobs', path: '/saved-jobs' },
    { name: 'Job Alerts', path: '/job-alerts' },
    { name: 'My Skills', path: '/skills' },
    { name: 'My Applications', path: '/applications' },
    { name: 'Messages', path: '/messages' },
    { name: 'Settings', path: '/settings' },
  ] : [];

  // Employer specific links
  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
  const employerNavItems = isEmployer ? [
    { name: 'Company Profile', path: '/company-profile' },
  ] : [];

  // Admin specific links
  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
  const adminNavItems = isAdmin ? [
    { name: 'Admin Dashboard', path: '/admin/dashboard' },
    { name: 'Admin Articles', path: '/admin/articles' },
    { name: 'Testing Mode', path: '/admin/testing-mode' },
    { name: 'Email Test', path: '/admin/email-test' },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ============================================ */}
        {/* ROW 1: Logo + Auth Buttons (No menu items here) */}
        {/* ============================================ */}
        <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800/50">
          
          {/* Logo Section - Now has its own row space */}
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
                BluSkye Integrated Consult
              </h1>
              <p className="text-xs sm:text-sm text-primary-400 mt-0.5">
                powered by <span className="font-semibold">ODUSBABA</span> intelligence
              </p>
            </Link>
          </div>
          
          {/* Auth Buttons - Consolidated (Single Login, Single Signup, Single Tester) */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
            {!user ? (
              <>
                {/* Regular User Auth - Single button each */}
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
                
                {/* Tester Auth - Single button each (conditionally visible) */}
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
              // Logged in user menu
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
            
            {/* Mobile Menu Toggle Button */}
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
        {/* ROW 2: Navigation Menu (Desktop) */}
        {/* ============================================ */}
        <div className="hidden lg:block py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {/* Main Navigation - Products/Services prominently displayed */}
            {mainNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  item.highlight 
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 hover:bg-primary-500/30' 
                    : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* User-specific nav items (Dashboard, etc.) */}
            {userNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Employer nav items */}
            {employerNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Admin nav items */}
            {adminNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Secondary Navigation */}
            {secondaryNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* MOBILE MENU (Full width, scrollable) */}
        {/* ============================================ */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 max-h-[80vh] overflow-y-auto">
            <div className="flex flex-col space-y-2">
              {/* Main Nav - Products/Services */}
              <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-2 pb-1">
                PRODUCTS & SERVICES
              </div>
              {mainNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-base font-semibold ${
                    item.highlight 
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 text-center' 
                      : 'text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Logged-in User Links */}
              {user && userNavItems.length > 0 && (
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
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                    EMPLOYER
                  </div>
                  {employerNavItems.map((item) => (
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
              
              {/* Secondary Nav */}
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">
                RESOURCES
              </div>
              {secondaryNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Auth on Mobile (if not logged in) */}
              {!user && (
                <div className="pt-4 mt-2 border-t border-slate-800 flex flex-col gap-2">
                  <Link 
                    to="/sign-in" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-center text-sm font-medium border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-800"
                  >
                    Log In
                  </Link>
                  <Link 
                    to="/sign-up" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 text-center text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    Sign Up Free
                  </Link>
                  
                  {testerVisibility.show_login_button && (
                    <Link 
                      to="/tester-login" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 text-center text-sm font-medium border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10"
                    >
                      Tester Login
                    </Link>
                  )}
                  {testerVisibility.show_register_button && (
                    <Link 
                      to="/tester-register" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 text-center text-sm font-medium bg-purple-600/80 text-white rounded-lg hover:bg-purple-700"
                    >
                      Become a Tester
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700">
                <Link to="/admin/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200">
                  Admin
                </Link>
                <Link to="/admin/articles" className="px-3 py-2 rounded-lg text-sm font-medium border border-primary-500/50 text-primary-400 hover:text-white hover:bg-primary-500/20 transition-all duration-200">
                  Articles
                </Link>
              </div>
            )}

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={() => setResourcesOpen(!resourcesOpen)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition-all duration-200"
              >
                Resources <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  {resourcesLinks.map((link) => (
                    <Link
                      key={link.name}
                      to={link.path}
                      onClick={() => setResourcesOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white border-b border-slate-700 last:border-b-0"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Auth Buttons - SINGLE source of truth */}
          <div className="hidden md:block">
            <UnifiedAuthButtons user={user} onLogout={handleLogout} />
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation - Clean, no duplicate auth */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold ${
                    link.highlight 
                      ? 'bg-primary-500 text-white text-center' 
                      : 'text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              
              {user && userLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              
              {isEmployer && employerLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              
              {testerVisibility.show_login_button && !user && (
                <Link to="/tester-login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-center">
                  Tester Login
                </Link>
              )}
              {testerVisibility.show_register_button && !user && (
                <Link to="/tester-register" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 text-center">
                  Become a Tester
                </Link>
              )}
              
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/articles" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-primary-500/50 text-primary-400 hover:bg-primary-500/20 text-center">
                    Manage Articles
                  </Link>
                </>
              )}
              
              <div className="px-3 py-2 text-sm font-bold text-slate-400 border-b border-slate-700">Resources</div>
              {resourcesLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="pl-6 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              
              {/* SINGLE Auth buttons on mobile - no duplicate */}
              <div className="pt-4 mt-2 border-t border-slate-800">
                <UnifiedAuthButtons user={user} onLogout={handleLogout} />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
