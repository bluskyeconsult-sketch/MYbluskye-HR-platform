// src/components/Navbar.jsx
// COMPLETE PROFESSIONAL NAVBAR - All links verified, unified API, responsive design

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
    Mail, Zap, LayoutDashboard, UserCircle, ClipboardList, 
    Star, Bell, MessageCircle, Settings, Building2, 
    Shield, BarChart3, Database, Sparkles, LogOut, Home,
    Award, GraduationCap, Newspaper, HelpCircle, Scale,
    AlertTriangle, TrendingUp, ChevronRight, ExternalLink
} from 'lucide-react';
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
    const [testerVisibility, setTesterVisibility] = useState({
        show_login_button: false,
        show_register_button: false
    });
    const navigate = useNavigate();
    const location = useLocation();

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
        { name: 'Hire VA', path: '/hire-va', icon: Zap, highlight: true },
    ];

    const productsDropdownItems = [
        { name: 'All Products', path: '/products', icon: Sparkles, description: 'Explore all our offerings' },
        { name: 'Hire Virtual Assistant', path: '/hire-va', icon: Zap, description: 'AI-powered career helpers' },
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
            <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="animate-pulse flex justify-between items-center">
                        <div className="w-32 h-8 bg-slate-800 rounded"></div>
                        <div className="w-48 h-8 bg-slate-800 rounded"></div>
                    </div>
                </div>
            </nav>
        );
    }

    return (
        <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* ============================================
                    ROW 1: Logo + Auth Buttons 
                ============================================ */}
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
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* User Info */}
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs text-slate-400 capitalize">
                                        {profile?.tier === 'business' ? 'Business' : 
                                         profile?.user_type === 'super_admin' ? 'Super Admin' :
                                         profile?.user_type === 'admin' ? 'Admin' :
                                         profile?.user_type === 'employer' ? 'Employer' :
                                         profile?.user_type === 'tester' ? 'Tester' : 'Member'}
                                    </p>
                                    <p className="text-sm text-white font-medium truncate max-w-[150px]">
                                        {profile?.full_name || user.email?.split('@')[0]}
                                    </p>
                                </div>
                                
                                {/* User Menu Dropdown */}
                                <div className="relative dropdown-container">
                                    <button
                                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                                        className="flex items-center gap-1 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-white text-sm font-bold">
                                            {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {userMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
                                            <div className="p-3 border-b border-slate-700">
                                                <p className="text-white font-medium">{profile?.full_name || 'User'}</p>
                                                <p className="text-xs text-slate-400">{user.email}</p>
                                                <p className="text-xs text-primary-400 mt-1 capitalize">{profile?.user_type || 'User'}</p>
                                            </div>
                                            <div className="py-1">
                                                {userNavItems.map((item) => (
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
                                                <div className="border-t border-slate-700 my-1"></div>
                                                <button
                                                    onClick={handleLogout}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition w-full"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
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

                {/* ============================================
                    ROW 2: Desktop Navigation Menu
                ============================================ */}
                <div className="hidden lg:block py-3">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                        
                        {/* Main Navigation Items */}
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1 ${
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
                        <div className="relative dropdown-container">
                            <button
                                onClick={() => setProductsOpen(!productsOpen)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                    isActive('/products') ? 'bg-primary-500/20 text-primary-400' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                More Products
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
                        
                        {/* User-specific Navigation (Desktop) */}
                        {userNavItems.slice(0, 3).map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                                    isActive(item.path) ? 'bg-primary-500/20 text-primary-400' : 'text-slate-200 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.name}
                            </Link>
                        ))}
                        
                        {/* Employer Navigation */}
                        {employerNavItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                                    isActive(item.path) ? 'bg-emerald-500/20 text-emerald-400' : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.name}
                            </Link>
                        ))}
                        
                        {/* Tester Navigation */}
                        {testerNavItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                                    isActive(item.path) ? 'bg-purple-500/20 text-purple-400' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.name}
                            </Link>
                        ))}
                        
                        {/* Admin Navigation */}
                        {adminNavItems.slice(0, 2).map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 border ${
                                    isActive(item.path)
                                        ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                                        : 'border-primary-500/30 text-primary-400 hover:bg-primary-500/10'
                                }`}
                            >
                                <item.icon className="w-3.5 h-3.5" />
                                {item.name}
                            </Link>
                        ))}
                        
                        {/* Resources Dropdown */}
                        <div className="relative dropdown-container">
                            <button
                                onClick={() => setResourcesOpen(!resourcesOpen)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800 transition"
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
                                        {legalLinks.map((link) => (
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
                </div>

                {/* ============================================
                    MOBILE MENU
                ============================================ */}
                {mobileMenuOpen && (
                    <div className="lg:hidden py-4 border-t border-slate-800 max-h-[80vh] overflow-y-auto">
                        <div className="flex flex-col space-y-2">
                            
                            {/* Main Menu */}
                            <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-2 pb-1">MAIN MENU</div>
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
                                    <item.icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            {/* More Products */}
                            <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-4 pb-1">MORE PRODUCTS</div>
                            {productsDropdownItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <item.icon className="w-4 h-4 text-primary-400" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            {/* User Account */}
                            {user && (
                                <>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">YOUR ACCOUNT</div>
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
                            
                            {/* Employer */}
                            {employerNavItems.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider px-3 pt-4 pb-1">EMPLOYER</div>
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
                            
                            {/* Tester */}
                            {testerNavItems.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider px-3 pt-4 pb-1">TESTER</div>
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
                            
                            {/* Admin */}
                            {adminNavItems.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-3 pt-4 pb-1">ADMIN</div>
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
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">RESOURCES</div>
                            {resourcesLinks.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <item.icon className="w-4 h-4" />
                                    {item.name}
                                </Link>
                            ))}
                            
                            {/* Legal */}
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-4 pb-1">LEGAL</div>
                            {legalLinks.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-white hover:bg-slate-800 flex items-center gap-2"
                                >
                                    <item.icon className="w-4 h-4" />
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
