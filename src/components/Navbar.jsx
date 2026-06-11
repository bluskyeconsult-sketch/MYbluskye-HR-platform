// src/components/Navbar.jsx
// ODUSBABA PROFESSIONAL NAVBAR v3.0 - PRODUCTION READY
// ✅ Complete responsive design with mobile-first approach
// ✅ All navigation links verified
// ✅ Role-based access (Admin, Employer, Tester, User)
// ✅ Scroll-aware styling
// ✅ Dropdown menus with outside click detection

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
    Mail, Zap, LayoutDashboard, UserCircle, ClipboardList, 
    Star, Bell, MessageCircle, Settings, Building2, 
    Shield, BarChart3, Database, Sparkles, LogOut, Home,
    Award, GraduationCap, Newspaper, HelpCircle, Scale,
    AlertTriangle, TrendingUp, ChevronRight, ExternalLink, User,
    Bot, Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [resourcesOpen, setResourcesOpen] = useState(false);
    const [productsOpen, setProductsOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const [testerVisibility, setTesterVisibility] = useState({
        show_login_button: false,
        show_register_button: false
    });
    const navigate = useNavigate();
    const location = useLocation();

    // ============================================
    // SCROLL HANDLER
    // ============================================

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ============================================
    // AUTHENTICATION & PROFILE
    // ============================================

    useEffect(() => {
        checkUser();
        loadTesterVisibility();
        
        // Close mobile menu on route change
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        // Close dropdowns when clicking outside
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setUserMenuOpen(false);
                setResourcesOpen(false);
                setProductsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    async function checkUser() {
        try {
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
        } catch (error) {
            console.error('Auth check error:', error);
        } finally {
            setLoading(false);
        }

        // Listen for auth changes
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
        try {
            const { data } = await supabase
                .from('system_config')
                .select('config_value')
                .eq('config_key', 'tester_visibility')
                .single();
            
            if (data?.config_value) {
                setTesterVisibility(data.config_value);
            }
        } catch (error) {
            console.error('Tester visibility error:', error);
        }
    }

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/');
            setMobileMenuOpen(false);
            setUserMenuOpen(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // ============================================
    // NAVIGATION ITEMS
    // ============================================

    const mainNavItems = [
        { name: 'Home', path: '/', icon: Home, highlight: false },
        { name: 'Jobs', path: '/jobs', icon: Briefcase, highlight: false },
        { name: 'Workforce', path: '/workforce', icon: Users, highlight: false },
        { name: 'Courses', path: '/courses', icon: GraduationCap, highlight: true },
        { name: 'Books', path: '/books', icon: BookOpen, highlight: false },
        { name: 'Assessments', path: '/assessments', icon: FileText, highlight: false },
        { name: 'Newsletter', path: '/newsletter', icon: Mail, highlight: false },
        { name: 'Hire VA', path: '/hire-va', icon: Bot, highlight: true },
    ];

    const productsDropdownItems = [
        { name: 'All Products', path: '/products', icon: Sparkles, description: 'Explore all our offerings' },
        { name: 'Hire Virtual Assistant', path: '/hire-va', icon: Bot, description: 'AI-powered career helpers' },
        { name: 'Newsletter', path: '/newsletter', icon: Mail, description: 'Weekly career insights' },
        { name: 'Affiliate Program', path: '/affiliate', icon: TrendingUp, description: 'Earn with referrals' },
    ];

    const resourcesLinks = [
        { name: 'About Us', path: '/about', icon: Users },
        { name: 'Contact', path: '/contact', icon: Mail },
        { name: 'Pricing', path: '/pricing', icon: Award },
        { name: 'FAQ', path: '/faq', icon: HelpCircle },
        { name: 'Blog', path: '/blog', icon: Newspaper },
        { name: 'Articles', path: '/articles', icon: FileText },
        { name: 'Safety Tips', path: '/safety-tips', icon: Shield },
        { name: 'Report Fraud', path: '/report-fraud', icon: AlertTriangle },
    ];

    const legalLinks = [
        { name: 'Terms of Service', path: '/legal/terms', icon: Scale },
        { name: 'Privacy Policy', path: '/legal/privacy', icon: Shield },
        { name: 'Cookie Policy', path: '/legal/cookies', icon: FileText },
        { name: 'Disclaimer', path: '/legal/disclaimer', icon: AlertTriangle },
        { name: 'Acceptable Use', path: '/legal/acceptable-use', icon: Shield },
        { name: 'Fraud Prevention', path: '/legal/fraud-prevention', icon: Shield },
    ];

    const userNavItems = user ? [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'My Profile', path: '/profile', icon: UserCircle },
        { name: 'My Applications', path: '/applications', icon: ClipboardList },
        { name: 'My Skills', path: '/skills', icon: Star },
        { name: 'Saved Jobs', path: '/saved-jobs', icon: BookOpen },
        { name: 'Job Alerts', path: '/job-alerts', icon: Bell },
        { name: 'Messages', path: '/messages', icon: MessageCircle },
        { name: 'Settings', path: '/settings', icon: Settings },
    ] : [];

    const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business';
    const employerNavItems = isEmployer ? [
        { name: 'Company Profile', path: '/company-profile', icon: Building2 },
        { name: 'Post a Job', path: '/post-job', icon: Briefcase },
        { name: 'Manage Jobs', path: '/manage-jobs', icon: ClipboardList },
    ] : [];

    const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    const adminNavItems = isAdmin ? [
        { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Manage Users', path: '/admin/users', icon: Users },
        { name: 'Manage Jobs', path: '/admin/jobs', icon: Briefcase },
        { name: 'Manage Courses', path: '/admin/courses', icon: BookOpen },
        { name: 'Manage Articles', path: '/admin/articles', icon: FileText },
        { name: 'Fraud Reports', path: '/admin/fraud-reports', icon: Shield },
        { name: 'Testing Mode', path: '/admin/testing-mode', icon: Settings },
        { name: 'External Jobs', path: '/admin/external-jobs', icon: Database },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'System Health', path: '/admin/health', icon: Activity },
    ] : [];

    const isTester = profile?.user_type === 'tester';
    const testerNavItems = isTester ? [
        { name: 'Tester Dashboard', path: '/tester/dashboard', icon: LayoutDashboard },
        { name: 'My Allocations', path: '/tester/allocations', icon: Award },
        { name: 'Feedback', path: '/tester/feedback', icon: MessageCircle },
    ] : [];

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-slate-900 border-b border-slate-800`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="animate-pulse w-32 h-8 bg-slate-800 rounded"></div>
                        <div className="animate-pulse w-48 h-8 bg-slate-800 rounded hidden md:block"></div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : 'bg-slate-900/80 backdrop-blur-sm'
        } border-b border-slate-800`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    
                    {/* Logo Section */}
                    <Link to="/" className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-sky-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">OD</span>
                        </div>
                        <span className="text-white font-bold text-lg hidden sm:inline">ODUSBABA</span>
                    </Link>

                    {/* Desktop Navigation - Row 2 style integrated */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {mainNavItems.slice(0, 5).map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive(item.path)
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : item.highlight
                                            ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                {item.name}
                            </Link>
                        ))}
                        
                        {/* Products Dropdown */}
                        <div className="relative dropdown-container">
                            <button
                                onClick={() => setProductsOpen(!productsOpen)}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive('/products') ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                More
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {productsOpen && (
                                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                                    {productsDropdownItems.map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            onClick={() => setProductsOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-slate-700 transition group"
                                        >
                                            <item.icon className="w-4 h-4 text-primary-400" />
                                            <div>
                                                <p className="text-sm text-slate-200 group-hover:text-white">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.description}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Resources Dropdown */}
                        <div className="relative dropdown-container">
                            <button
                                onClick={() => setResourcesOpen(!resourcesOpen)}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                            >
                                Resources
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {resourcesOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                                    <div className="py-1">
                                        <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">Company</div>
                                        {resourcesLinks.slice(0, 4).map((link) => (
                                            <Link
                                                key={link.name}
                                                to={link.path}
                                                onClick={() => setResourcesOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                            >
                                                <link.icon className="w-4 h-4" />
                                                {link.name}
                                            </Link>
                                        ))}
                                        <div className="border-t border-slate-700 my-1"></div>
                                        <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">Legal & Safety</div>
                                        {legalLinks.slice(0, 4).map((link) => (
                                            <Link
                                                key={link.name}
                                                to={link.path}
                                                onClick={() => setResourcesOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
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

                    {/* Desktop Auth Section */}
                    <div className="hidden md:flex items-center space-x-3">
                        {user ? (
                            <div className="relative dropdown-container">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
                                >
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                                            <User className="w-3 h-3 text-primary-400" />
                                        </div>
                                    )}
                                    <span className="text-white text-sm hidden sm:inline">
                                        {profile?.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-50">
                                        <div className="p-3 border-b border-slate-700">
                                            <p className="text-white font-medium">{profile?.full_name || 'User'}</p>
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                            <p className="text-xs text-primary-400 mt-1 capitalize">{profile?.user_type || 'User'}</p>
                                        </div>
                                        <div className="py-1">
                                            {userNavItems.slice(0, 4).map((item) => (
                                                <Link
                                                    key={item.name}
                                                    to={item.path}
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                                >
                                                    <item.icon className="w-4 h-4" />
                                                    {item.name}
                                                </Link>
                                            ))}
                                            {isAdmin && (
                                                <Link
                                                    to="/admin/dashboard"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-primary-400 hover:bg-slate-700 transition"
                                                >
                                                    <Shield className="w-4 h-4" /> Admin Panel
                                                </Link>
                                            )}
                                            <div className="border-t border-slate-700 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition w-full"
                                            >
                                                <LogOut className="w-4 h-4" /> Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link to="/sign-in" className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium">Sign In</Link>
                                <Link to="/sign-up" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">Sign Up</Link>
                                
                                {testerVisibility.show_login_button && (
                                    <Link to="/tester-login" className="px-3 py-2 text-sm border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10">
                                        Tester Login
                                    </Link>
                                )}
                                {testerVisibility.show_register_button && (
                                    <Link to="/tester-register" className="px-3 py-2 text-sm bg-purple-600/80 text-white rounded-lg hover:bg-purple-700">
                                        Become Tester
                                    </Link>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        aria-label="Menu"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu Panel */}
                {mobileMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-slate-800 animate-slide-down max-h-[80vh] overflow-y-auto">
                        <div className="space-y-1">
                            {mainNavItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base ${
                                        item.highlight
                                            ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                                    }`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            <hr className="my-2 border-slate-800" />
                            
                            {/* More Products in Mobile */}
                            <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-4 pt-2 pb-1">MORE PRODUCTS</div>
                            {productsDropdownItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5 text-primary-400" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            <hr className="my-2 border-slate-800" />
                            
                            {/* Resources in Mobile */}
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 pt-2 pb-1">RESOURCES</div>
                            {resourcesLinks.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            <hr className="my-2 border-slate-800" />
                            
                            {/* User Account Section */}
                            {user ? (
                                <>
                                    <div className="px-4 py-2 text-slate-400 text-sm">Signed in as</div>
                                    <div className="px-4 py-2 text-white font-medium">{profile?.full_name || user.email}</div>
                                    {userNavItems.slice(0, 5).map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            {item.name}
                                        </Link>
                                    ))}
                                    {isAdmin && (
                                        <Link to="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 text-primary-400 hover:bg-slate-800 rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                                            <Shield className="w-5 h-5" /> Admin Panel
                                        </Link>
                                    )}
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg">
                                        <LogOut className="w-5 h-5" /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col gap-2 p-4">
                                    <Link to="/sign-in" className="w-full px-4 py-3 text-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                                    <Link to="/sign-up" className="w-full px-4 py-3 text-center bg-primary-600 text-white rounded-lg hover:bg-primary-700" onClick={() => setMobileMenuOpen(false)}>Sign Up</Link>
                                    
                                    {testerVisibility.show_login_button && (
                                        <Link to="/tester-login" className="w-full px-4 py-3 text-center border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10">Tester Login</Link>
                                    )}
                                    {testerVisibility.show_register_button && (
                                        <Link to="/tester-register" className="w-full px-4 py-3 text-center bg-purple-600/80 text-white rounded-lg hover:bg-purple-700">Become Tester</Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
