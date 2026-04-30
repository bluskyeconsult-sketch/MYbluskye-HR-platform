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
  const navigate = useNavigate();

  useEffect(() => {
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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Jobs', path: '/jobs' },
    { name: 'Workforce', path: '/workforce' },
    { name: 'Courses', path: '/courses' },
    { name: 'Books', path: '/books' },
    { name: 'Newsletter', path: '/newsletter' },
    { name: 'Affiliate', path: '/affiliate' },
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
  ];

  const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex-shrink-0"><Logo /></Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link key={link.name} to={link.path} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                {link.name}
              </Link>
            ))}
            
            {/* User-specific links */}
            {user && userLinks.map((link) => (
              <Link key={link.name} to={link.path} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                {link.name}
              </Link>
            ))}
            
            {/* Employer-specific links */}
            {isEmployer && employerLinks.map((link) => (
              <Link key={link.name} to={link.path} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                {link.name}
              </Link>
            ))}

            {/* Resources Dropdown */}
            <div className="relative">
              <button onClick={() => setResourcesOpen(!resourcesOpen)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
                Resources <ChevronDown className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                  {resourcesLinks.map((link) => (
                    <Link key={link.name} to={link.path} onClick={() => setResourcesOpen(false)} className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">
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
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              {user && userLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              {isEmployer && employerLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800">
                  {link.name}
                </Link>
              ))}
              <div className="px-3 py-2 text-sm font-medium text-slate-400">Resources</div>
              {resourcesLinks.map((link) => (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className="pl-8 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800">
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
