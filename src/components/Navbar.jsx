import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Menu, X, ChevronDown } from 'lucide-react';
import Logo from './Logo';
import UnifiedAuthButtons from './UnifiedAuthButtons';

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
        setProfile(data);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        const { data } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
        setProfile(data);
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
  };

  const navLinks = [
    { name: 'Home', path: '/', bold: true },
    { name: 'Jobs', path: '/jobs', bold: true },
    { name: 'Workforce', path: '/workforce', bold: true },
    { name: 'Courses', path: '/courses', bold: true },
    { name: 'Books', path: '/books', bold: true },
    { name: 'Assessments', path: '/assessments', bold: true },
    { name: 'Newsletter', path: '/newsletter', bold: true },
    { name: 'Hire VA', path: '/hire-va', bold: true, highlight: true },
  ];

  const userLinks = [
    { name: 'Saved Jobs', path: '/saved-jobs' },
    { name: 'Job Alerts', path: '/job-alerts' },
  ];

  const employerLinks = [
    { name: 'Company Profile', path: '/company-profile' },
  ];

  const resourcesLinks = [
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Blog', path: '/blog' },
    { name: 'Articles', path: '/articles' },
    { name: 'Affiliate', path: '/affiliate' },
  ];

  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex-shrink-0"><Logo /></Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                  link.highlight 
                    ? 'bg-primary-500 text-white border-primary-400 hover:bg-primary-600' 
                    : 'border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
            
            {/* User-specific links */}
            {user && userLinks.map((link) => (
              <Link key={link.name} to={link.path} className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200">
                {link.name}
              </Link>
            ))}
            
            {/* Employer-specific links */}
            {isEmployer && employerLinks.map((link) => (
              <Link key={link.name} to={link.path} className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200">
                {link.name}
              </Link>
            ))}

            {/* Tester Buttons (Conditional) */}
            {testerVisibility.show_login_button && !user && (
              <Link to="/tester-login" className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-all duration-200">
                Tester Login
              </Link>
            )}
            {testerVisibility.show_register_button && !user && (
              <Link to="/tester-register" className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-all duration-200">
                Become a Tester
              </Link>
            )}

            {/* Admin Links */}
            {isAdmin && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700">
                <Link to="/admin/dashboard" className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800 transition-all duration-200">
                  Admin
                </Link>
                <Link to="/admin/articles" className="px-3 py-2 rounded-lg text-sm font-medium border border-primary-500/50 text-primary-400 hover:text-white hover:bg-primary-500/20 transition-all duration-200">
                  Manage Articles
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

          {/* Auth Buttons */}
          <div className="hidden md:block">
            <UnifiedAuthButtons user={user} onLogout={handleLogout} />
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold border ${
                    link.highlight 
                      ? 'bg-primary-500 text-white border-primary-400 text-center' 
                      : 'border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {user && userLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              {isEmployer && employerLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              {testerVisibility.show_login_button && !user && (
                <Link to="/tester-login" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                  Tester Login
                </Link>
              )}
              {testerVisibility.show_register_button && !user && (
                <Link to="/tester-register" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium border border-purple-500/50 text-purple-400 hover:bg-purple-500/10">
                  Become a Tester
                </Link>
              )}
              {isAdmin && (
                <div className="space-y-2 pt-2 border-t border-slate-700">
                  <Link to="/admin/dashboard" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800">
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/articles" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium border border-primary-500/50 text-primary-400 hover:text-white hover:bg-primary-500/20">
                    Manage Articles
                  </Link>
                </div>
              )}
              <div className="px-3 py-2 text-sm font-bold text-slate-400 border-b border-slate-700">Resources</div>
              {resourcesLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="pl-6 px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
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
