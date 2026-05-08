// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
  Mail, Zap, HelpCircle, ShoppingBag, Star, Shield, Bell,
  Home, LayoutDashboard, UserCircle, Settings, MessageCircle,
  LogOut, Award, TrendingUp, Scale, Globe, Eye, AlertTriangle,
  Building, BookMarked, GraduationCap, Brain, Bot, Newspaper
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
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Main navigation items
  const mainNavItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Workforce', path: '/workforce', icon: Users },
    { name: 'Courses', path: '/courses', icon: GraduationCap, highlight: true },
    { name: 'Books', path: '/books', icon: BookOpen },
    { name: 'Assessments', path: '/assessments', icon: Brain },
    { name: 'Newsletter', path: '/newsletter', icon: Newspaper },
    { name: 'Hire VA', path: '/hire-va', icon: Bot, highlight: true },
  ];

  // Products dropdown items
  const productsItems = [
    { name: 'More Products', path: '/more-products', icon: ShoppingBag, description: 'Explore all offerings' },
    { name: 'Hire VA', path: '/hire-va', icon: Bot, description: 'AI-powered assistants' },
    { name: 'Newsletter', path: '/newsletter', icon: Mail, description: 'Stay updated' },
  ];

  // Resources dropdown - Company section
  const companyLinks = [
    { name: 'About Us', path: '/about', icon: Building },
    { name: 'Contact', path: '/contact', icon: Mail },
    { name: 'Pricing', path: '/pricing', icon: Star },
    { name: 'FAQ', path: '/faq', icon: HelpCircle },
    { name: 'Blog', path: '/blog', icon: FileText },
    { name: 'Articles', path: '/articles', icon: Newspaper },
    { name: 'Affiliate Program', path: '/affiliate', icon: Award },
  ];

  // Resources dropdown - Legal & Safety section
  const legalLinks = [
    { name: 'Terms of Service', path: '/legal/terms', icon: Scale },
    { name: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
    { name: 'Cookie Policy', path: '/legal/cookies', icon: Globe },
    { name: 'Disclaimer', path: '/legal/disclaimer', icon: AlertTriangle },
    { name: 'Acceptable Use', path: '/legal/acceptable-use', icon: Eye },
    { name: 'Fraud Prevention', path: '/fraud-prevention', icon: Shield },
  ];

  // User navigation items
  const userNavItems = user ? [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
    { name: 'My Applications', path: '/applications', icon: Briefcase },
    { name: 'My Skills', path: '/skills', icon: Star },
    { name: 'Saved Jobs', path: '/saved-jobs', icon: BookMarked },
    { name: 'Job Alerts', path: '/job-alerts', icon: Bell },
    { name: 'Messages', path: '/messages', icon: MessageCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ] : [];

  // Admin navigation items
  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
  const adminNavItems = isAdmin ? [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Manage Articles', path: '/admin/articles', icon: FileText },
    { name: 'Manage Books', path: '/admin/books', icon: BookOpen },
    { name: 'Manage Courses', path: '/admin/courses', icon: GraduationCap },
    { name: 'Manage VAs', path: '/admin/virtual-assistants', icon: Bot },
    { name: 'Manage Assessments', path: '/admin/assessments', icon: Brain },
    { name: 'External Jobs', path: '/admin/external-jobs', icon: Globe },
  ] : [];

  // Close dropdowns when clicking outside
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
          
          {/* Logo */}
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <Logo size="md" showText={true} linkTo="/" />
          </div>
          
          {/* Auth Buttons */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
            {!user ? (
              <>
                <Link to="/sign-in" className="px-4 py-2 text-sm font-medium border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-800 transition">
                  Log In
                </Link>
                <Link to="/sign-up" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-lg shadow-primary-500/20">
                  Sign Up Free
                </Link>
              </>
            ) : (
              <div className="relative">
                <button onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition">
                  <div className="w-8 h-8 rounded-full bg-primary-600/20 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs text-slate-400">{profile?.tier || profile?.user_type || 'Member'}</p>
                    <p className="text-sm text-white font-medium max-w-[120px] truncate">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-700">
                      <p className="text-sm font-medium text-white">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      {userNavItems.map((item) => (
                        <Link key={item.name} to={item.path} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition">
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      ))}
                      {adminNavItems.map((item) => (
                        <Link key={item.name} to={item.path} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-primary-400 hover:bg-primary-500/10 transition">
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      ))}
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 border-t border-slate-700 transition">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700">
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
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                  isActive(item.path)
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : item.highlight 
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Products Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setProductsOpen(!productsOpen); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  productsOpen ? 'bg-slate-800 text-white' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                }`}
              >
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="p-2">
                    {productsItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={() => setProductsOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition"
                      >
                        <item.icon className="w-4 h-4 text-primary-400" />
                        <div>
                          <div className="font-medium text-white">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Resources Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setResourcesOpen(!resourcesOpen); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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
                    {companyLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.path}
                        onClick={() => setResourcesOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
                      >
                        <link.icon className="w-4 h-4" />
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
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition"
                      >
                        <link.icon className="w-4 h-4" />
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
              <div className="text-xs font-semibold text-primary-400 uppercase px-3 pt-2 pb-1">MAIN MENU</div>
              {mainNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-base font-semibold flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : item.highlight
                        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                        : 'text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              <div className="text-xs font-semibold text-purple-400 uppercase px-3 pt-4 pb-1">PRODUCTS</div>
              {productsItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-base text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">COMPANY</div>
              {companyLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">LEGAL & SAFETY</div>
              {legalLinks.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-slate-800"
                >
                  {item.name}
                </Link>
              ))}
              
              {user && (
                <>
                  <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">YOUR ACCOUNT</div>
                  {userNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              {isAdmin && (
                <>
                  <div className="text-xs font-semibold text-primary-400 uppercase px-3 pt-4 pb-1">ADMIN</div>
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3 py-2 rounded-lg text-sm border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 text-center"
                    >
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
