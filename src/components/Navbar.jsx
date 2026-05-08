// src/components/Navbar.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
  Mail, Zap, HelpCircle, ShoppingBag, Star, Shield, Bell,
  Home, LayoutDashboard, UserCircle, Settings, MessageCircle,
  LogOut, Award, TrendingUp, Scale, Globe, Eye, AlertTriangle
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
  const [notificationCount, setNotificationCount] = useState(0);
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
      
      // Fetch notification count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      setNotificationCount(count || 0);
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

  const mainNavItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Jobs', path: '/jobs', icon: Briefcase },
    { name: 'Workforce', path: '/workforce', icon: Users },
    { name: 'Courses', path: '/courses', icon: BookOpen, highlight: true },
    { name: 'Books', path: '/books', icon: BookOpen },
    { name: 'Assessments', path: '/assessments', icon: FileText },
    { name: 'Newsletter', path: '/newsletter', icon: Mail },
    { name: 'Hire VA', path: '/hire-va', icon: Zap, highlight: true },
  ];

  const resourcesLinks = [
    { name: 'About Us', path: '/about', icon: Users, category: 'Company' },
    { name: 'Contact', path: '/contact', icon: Mail, category: 'Company' },
    { name: 'Pricing', path: '/pricing', icon: Star, category: 'Company' },
    { name: 'FAQ', path: '/faq', icon: HelpCircle, category: 'Support' },
    { name: 'Blog', path: '/blog', icon: FileText, category: 'Content' },
    { name: 'Articles', path: '/articles', icon: FileText, category: 'Content' },
    { name: 'More Products', path: '/more-products', icon: ShoppingBag, category: 'Products' },
    { name: 'Affiliate Program', path: '/affiliate', icon: Award, category: 'Products' },
  ];

  const legalLinks = [
    { name: 'Terms of Service', path: '/legal/terms', icon: FileText },
    { name: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
    { name: 'Cookie Policy', path: '/legal/cookies', icon: Globe },
    { name: 'Disclaimer', path: '/legal/disclaimer', icon: AlertTriangle },
    { name: 'Acceptable Use', path: '/legal/acceptable-use', icon: Scale },
    { name: 'Fraud Prevention', path: '/fraud-prevention', icon: Eye },
  ];

  const userNavItems = user ? [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: UserCircle },
    { name: 'My Applications', path: '/applications', icon: Briefcase },
    { name: 'Messages', path: '/messages', icon: MessageCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ] : [];

  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
  const employerNavItems = isEmployer ? [
    { name: 'Company Profile', path: '/company-profile', icon: Briefcase },
    { name: 'Post a Job', path: '/post-job', icon: TrendingUp },
  ] : [];

  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
  const adminNavItems = isAdmin ? [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Manage Articles', path: '/admin/articles', icon: FileText },
    { name: 'Manage Books', path: '/admin/books', icon: BookOpen },
    { name: 'Manage Courses', path: '/admin/courses', icon: BookOpen },
  ] : [];

  const isTester = profile?.user_type === 'tester';
  const testerNavItems = isTester ? [
    { name: 'Tester Dashboard', path: '/tester/dashboard', icon: LayoutDashboard },
    { name: 'Submit Feedback', path: '/tester/feedback', icon: MessageCircle },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Row 1: Logo + Auth Buttons */}
        <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-800/50">
          
          {/* Logo Section - Using Logo Component */}
          <div className="text-center sm:text-left mb-3 sm:mb-0">
            <Logo size="md" showText={true} linkTo="/" />
          </div>
          
          {/* Auth Buttons */}
          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-wrap">
            {!user ? (
              <>
                <Link to="/sign-in" className="px-4 py-2 text-sm font-medium border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-800">
                  Log In
                </Link>
                <Link to="/sign-up" className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 shadow-lg shadow-primary-500/20">
                  Sign Up Free
                </Link>
              </>
            ) : (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800">
                  <div className="relative">
                    <Bell className="w-5 h-5 text-slate-400" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </div>
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
                        <Link key={item.name} to={item.path} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
                          <item.icon className="w-4 h-4" />
                          {item.name}
                        </Link>
                      ))}
                      <button onClick={handleLogout} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 border-t border-slate-700">
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
            {mainNavItems.map((item) => (
              <Link key={item.name} to={item.path} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${item.highlight ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-slate-200 hover:text-white hover:bg-slate-800'}`}>
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Products Dropdown */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setProductsOpen(!productsOpen); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                Products <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <Link to="/more-products" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
                      <ShoppingBag className="w-4 h-4" />
                      <div><div className="font-medium">More Products</div><div className="text-xs text-slate-500">Explore all offerings</div></div>
                    </Link>
                    <Link to="/hire-va" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
                      <Zap className="w-4 h-4" />
                      <div><div className="font-medium">Hire VA</div><div className="text-xs text-slate-500">AI-powered assistants</div></div>
                    </Link>
                    <Link to="/newsletter" onClick={() => setProductsOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
                      <Mail className="w-4 h-4" />
                      <div><div className="font-medium">Newsletter</div><div className="text-xs text-slate-500">Stay updated</div></div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            {/* Role-based Links */}
            {employerNavItems.map((item) => (
              <Link key={item.name} to={item.path} className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1">
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {testerNavItems.map((item) => (
              <Link key={item.name} to={item.path} className="px-3 py-1.5 rounded-lg text-sm font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex items-center gap-1">
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {adminNavItems.map((item) => (
              <Link key={item.name} to={item.path} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 flex items-center gap-1">
                <item.icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            ))}
            
            {/* Resources Dropdown */}
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setResourcesOpen(!resourcesOpen); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800">
                Resources <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                  <div className="max-h-96 overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-900/50">Company</div>
                    {resourcesLinks.filter(l => l.category === 'Company').map((link) => (
                      <Link key={link.name} to={link.path} onClick={() => setResourcesOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
                        <link.icon className="w-4 h-4" />
                        {link.name}
                      </Link>
                    ))}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase bg-slate-900/50 mt-1">Legal & Safety</div>
                    {legalLinks.map((link) => (
                      <Link key={link.name} to={link.path} onClick={() => setResourcesOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
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
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`px-3 py-2 rounded-lg text-base font-semibold flex items-center gap-2 ${item.highlight ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'text-slate-200 hover:text-white hover:bg-slate-800'}`}>
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              <div className="text-xs font-semibold text-purple-400 uppercase px-3 pt-4 pb-1">PRODUCTS</div>
              <Link to="/more-products" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"><ShoppingBag className="w-4 h-4" />More Products</Link>
              <Link to="/hire-va" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"><Zap className="w-4 h-4" />Hire Virtual Assistant</Link>
              <Link to="/newsletter" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-base text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"><Mail className="w-4 h-4" />Newsletter</Link>
              
              {user && <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">YOUR ACCOUNT</div>}
              {userNavItems.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              {employerNavItems.length > 0 && <div className="text-xs font-semibold text-emerald-400 uppercase px-3 pt-4 pb-1">EMPLOYER</div>}
              {employerNavItems.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              {testerNavItems.length > 0 && <div className="text-xs font-semibold text-purple-400 uppercase px-3 pt-4 pb-1">TESTER</div>}
              {testerNavItems.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
              
              {adminNavItems.length > 0 && <div className="text-xs font-semibold text-primary-400 uppercase px-3 pt-4 pb-1">ADMIN</div>}
              {adminNavItems.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 text-center">
                  {item.name}
                </Link>
              ))}
              
              <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">RESOURCES</div>
              {resourcesLinks.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800">
                  {item.name}
                </Link>
              ))}
              
              <div className="text-xs font-semibold text-slate-500 uppercase px-3 pt-4 pb-1">LEGAL & SAFETY</div>
              {legalLinks.map((item) => (
                <Link key={item.name} to={item.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-slate-800">
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
