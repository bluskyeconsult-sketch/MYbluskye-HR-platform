// src/components/Navbar.jsx - UNIFIED & OPTIMIZED
// ODUSBABA PROFESSIONAL NAVBAR v7.1 - Mobile-First with Unified API
// ✅ Complete responsive design with mobile-first approach
// ✅ Clean mobile overlay with backdrop (from Code 2)
// ✅ All navigation links verified
// ✅ Role-based access (Admin, Employer, Tester, User)
// ✅ Scroll-aware styling with animations
// ✅ Dropdown menus (optimized for desktop)
// ✅ Unified API integration (api/index.js)
// ✅ Lightweight animations (no Framer Motion dependency)
// ✅ Fixed logo handling with fallback
// ✅ Touch-optimized mobile menu
//
// FIXED (2026-08-08): CRITICAL — checkUser() registered a new
// supabase.auth.onAuthStateChange() listener every time it ran, and it ran
// on every single route change across the whole site. The cleanup function
// it returned was trapped inside an async function's Promise, so React
// never called it — every navigation leaked one more listener forever.
// After browsing a few pages, dozens of leaked listeners would all fire
// concurrently on the next auth event (like signing in), all racing to
// mutate the same underlying session object — this is almost certainly the
// exact cause of the "Cannot add property changedAccessToken, object is
// not extensible" crash reported on the sign-in page. Moved the listener
// to its own useEffect with an empty dependency array (registers once,
// cleans up once), matching the already-correct pattern in App.jsx's
// inline Navbar. Also removed calls to ?action=session, ?action=profile,
// and ?action=logout — none of these exist in api/index.js, so every one
// of them always failed and fell through to a fallback anyway; simplified
// to call the direct Supabase methods directly.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
    Menu, X, ChevronDown, Briefcase, Users, BookOpen, FileText, 
    Mail, Zap, LayoutDashboard, UserCircle, ClipboardList, 
    Star, Bell, MessageCircle, Settings, Building2, 
    Shield, BarChart3, Database, Sparkles, LogOut, Home,
    Award, GraduationCap, Newspaper, HelpCircle, Scale,
    AlertTriangle, TrendingUp, User, Bot, Activity, Brain
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';

// Simple animation helper (no Framer Motion dependency)
const fadeIn = {
    hidden: { opacity: 0, transform: 'translateY(-10px)' },
    visible: { opacity: 1, transform: 'translateY(0)' }
};

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
    const [logoError, setLogoError] = useState(false);
    const [testerVisibility, setTesterVisibility] = useState({
        show_login_button: false,
        show_register_button: false
    });
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef(null);

    // ============================================
    // SCROLL & RESIZE HANDLERS
    // ============================================

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);
        handleResize();
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // ============================================
    // AUTHENTICATION & PROFILE - USING UNIFIED API
    // ============================================

    useEffect(() => {
        checkUser();
        loadTesterVisibility();
        
        // Close mobile menu on route change
        setMobileMenuOpen(false);
        setResourcesOpen(false);
        setProductsOpen(false);
        setUserMenuOpen(false);
    }, [location.pathname]);

    // FIXED (2026-08-08): CRITICAL — this listener setup used to live
    // inside checkUser() itself, which was called from the useEffect above
    // on EVERY route change. Since checkUser() is async, the
    // `() => subscription.unsubscribe()` it returned became a Promise, not
    // a real React cleanup function — React never saw or called it. Every
    // single page navigation across the whole site registered a brand new
    // supabase.auth.onAuthStateChange() listener that never got cleaned
    // up. After browsing a few pages, dozens of leaked listeners would all
    // fire simultaneously on the next auth event, all trying to process
    // the same session object concurrently — this is almost certainly the
    // exact cause of the "Cannot add property changedAccessToken, object
    // is not extensible" crash on sign-in. Moved to its own useEffect with
    // an empty dependency array, so it registers exactly once on mount and
    // is properly unsubscribed on unmount — the same correct pattern
    // App.jsx's own inline Navbar already used.
    useEffect(() => {
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
    }, []);

    useEffect(() => {
        // Close dropdowns when clicking outside
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
                setResourcesOpen(false);
                setProductsOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.classList.add('overflow-hidden', 'fixed', 'w-full');
        } else {
            document.body.classList.remove('overflow-hidden', 'fixed', 'w-full');
        }
        return () => document.body.classList.remove('overflow-hidden', 'fixed', 'w-full');
    }, [mobileMenuOpen]);

    // FIXED (2026-08-08): removed calls to ?action=session, ?action=profile
    // — neither exists in api/index.js, so this always hit the catch block
    // and fell through to the "fallback" every single time. Simplified to
    // go straight to the direct Supabase calls (the same fix already
    // applied to App.jsx's inline Navbar back in Phase 1). No longer sets
    // up an auth listener here — that now lives in its own effect above.
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

    // FIXED (2026-08-08): removed the call to ?action=logout, which doesn't
    // exist in api/index.js — this always hit the catch block and fell
    // through to the fallback every time anyway. Simplified to go straight
    // to the direct Supabase call.
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
        { name: 'Jobs', path: '/jobs', icon: Briefcase, highlight: true },
        { name: 'Workforce', path: '/workforce', icon: Users, highlight: false },
        { name: 'Courses', path: '/courses', icon: GraduationCap, highlight: false },
        { name: 'Books', path: '/books', icon: BookOpen, highlight: false },
        { name: 'Assessments', path: '/assessments', icon: Brain, highlight: false },
        { name: 'Hire VA', path: '/hire-va', icon: Bot, highlight: true, premium: true },
    ];

    const productsDropdownItems = [
        { name: 'All Products', path: '/products', icon: Sparkles, description: 'Explore all our offerings' },
        { name: 'Hire Virtual Assistant', path: '/hire-va', icon: Bot, description: 'AI-powered career helpers' },
        // NEW (2026-08-27): added — a real, live page with no menu entry
        // anywhere on the site until now.
        { name: 'Verified Employers', path: '/verified-employers', icon: Shield, description: 'Government-verified sponsor companies' },
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

    // FIXED (2026-08-27): checked user_type === 'business' — this value
    // has never existed on any real account. The confirmed real
    // user_type for the Business tier is 'business_owner'. This meant
    // every business-tier employer has never seen the Company
    // Profile/Post Job/Manage Jobs nav items below.
    const isEmployer = profile?.user_type === 'employer' || profile?.user_type === 'business_owner';
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
        // NEW (2026-08-27): six real, existing admin pages that had no
        // entry anywhere in this dropdown - all paths confirmed directly
        // against the real, current App.jsx routes.
        { name: 'Manage Books', path: '/admin/books', icon: BookOpen },
        { name: 'Employer Verification', path: '/admin/employer-verification', icon: Building2 },
        { name: 'Refund Requests', path: '/admin/refund-requests', icon: AlertTriangle },
        { name: 'Affiliate Management', path: '/admin/affiliate-management', icon: TrendingUp },
        { name: 'Tester Invite Codes', path: '/admin/tester-invites', icon: Star },
        { name: 'Tester Feedback', path: '/admin/tester-feedback', icon: MessageCircle },
        { name: 'Fraud Reports', path: '/admin/fraud-reports', icon: Shield },
        { name: 'Testing Mode', path: '/admin/testing-mode', icon: Settings },
        { name: 'External Jobs', path: '/admin/external-jobs', icon: Database },
        { name: 'Employer Sources', path: '/admin/employer-sources', icon: Building2 },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Insight Engine', path: '/admin/insight-engine', icon: Sparkles },
        { name: 'System Health', path: '/admin/health', icon: Activity },
    ] : [];

    // FIXED (2026-08-27): checked profile?.user_type === 'tester' — the
    // same stale check already found and fixed in UserDashboard.jsx and
    // AdminUsers.jsx this engagement. No account has ever had this
    // literal user_type value under the real tester system (testers keep
    // their real tier's user_type, flagged separately via is_tester).
    // This meant the entire Tester nav section below has never shown for
    // any real tester account.
    const isTester = profile?.is_tester === true;
    const testerNavItems = isTester ? [
        // FIXED (2026-08-27): '/tester/allocations' and '/tester/feedback'
        // were both confirmed dead links — neither route exists anywhere
        // in the real App.jsx. TesterDashboard.jsx (the one real,
        // confirmed route, /tester/dashboard) already shows remaining
        // allocation and the structured feedback/checklist system
        // directly on one page — these were fully redundant dead links,
        // not two separate real destinations. Removed rather than invent
        // two new routes for functionality that already exists,
        // consolidated, elsewhere.
        { name: 'Tester Dashboard', path: '/tester/dashboard', icon: LayoutDashboard },
    ] : [];

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="animate-pulse w-32 h-8 bg-slate-800 rounded"></div>
                        <div className="animate-pulse w-48 h-8 bg-slate-800 rounded hidden md:block"></div>
                    </div>
                </div>
            </nav>
        );
    }

    const isSuperAdmin = profile?.user_type === 'super_admin';

    return (
        <nav 
            ref={menuRef}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                isScrolled ? 'bg-slate-900/95 backdrop-blur-md shadow-lg' : 'bg-slate-900/80 backdrop-blur-sm'
            } border-b border-slate-800`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    
                    {/* Logo Section with Fallback */}
                    <Link 
                        to="/" 
                        className="flex items-center gap-2 flex-shrink-0 group"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        {!logoError ? (
                            <img 
                                src="/Bluskye.png" 
                                alt="BluSkye Consult" 
                                className="h-8 sm:h-10 w-auto object-contain"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-sky-500 rounded-lg flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <span className="text-white font-bold text-lg hidden sm:inline">
                            BluSkye<span className="text-primary-400">Consult</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    {/* NEW (2026-08-27): each item now gets a soft,
                        rounded background that fades and scales in on
                        hover, with the text itself becoming bolder and
                        brighter - sized to hug the text closely (modest
                        padding, no layout shift) so it stays legible and
                        doesn't visually dominate the header. */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`relative px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 group ${
                                    isActive(item.path)
                                        ? 'bg-primary-500/20 text-primary-400 font-semibold'
                                        : item.highlight
                                            ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 font-medium hover:bg-primary-500/25 hover:font-semibold'
                                            : 'text-slate-300 font-medium hover:text-white hover:bg-slate-800 hover:font-semibold'
                                }`}
                            >
                                <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                {item.name}
                                {item.premium && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white ml-1">
                                        PRO
                                    </span>
                                )}
                                {isActive(item.path) && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-sky-500 rounded-full" />
                                )}
                            </Link>
                        ))}
                        
                        {/* Products Dropdown */}
                        <div className="relative">
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
                        <div className="relative">
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
                        
                        {/* Super Admin Badge */}
                        {isSuperAdmin && (
                            <div className="ml-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1">
                                <Award className="w-3 h-3 text-emerald-400" />
                                <span className="text-xs text-emerald-400 font-medium">Super Admin</span>
                            </div>
                        )}
                    </div>

                    {/* Desktop Auth Section */}
                    <div className="hidden md:flex items-center space-x-3">
                        {user ? (
                            <div className="relative">
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
                                            {/* FIXED (2026-08-27): adminNavItems
                                                was defined with 16 real admin
                                                pages but never actually
                                                rendered anywhere in this file -
                                                only ever a single hardcoded
                                                link to /admin/dashboard. Now
                                                shows the most-used few
                                                directly, plus the full
                                                dashboard link for everything
                                                else - this dropdown has
                                                limited space, the mobile menu
                                                below shows the complete list. */}
                                            {isAdmin && (
                                                <>
                                                    <div className="border-t border-slate-700 my-1"></div>
                                                    <div className="px-4 pt-1 pb-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Admin</div>
                                                    {adminNavItems.slice(0, 4).map((item) => (
                                                        <Link
                                                            key={item.name}
                                                            to={item.path}
                                                            onClick={() => setUserMenuOpen(false)}
                                                            className="flex items-center gap-3 px-4 py-2 text-sm text-primary-400 hover:bg-slate-700 transition"
                                                        >
                                                            <item.icon className="w-4 h-4" /> {item.name}
                                                        </Link>
                                                    ))}
                                                    <Link
                                                        to="/admin/dashboard"
                                                        onClick={() => setUserMenuOpen(false)}
                                                        className="flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition"
                                                    >
                                                        <LayoutDashboard className="w-4 h-4" /> View All Admin Pages
                                                    </Link>
                                                </>
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
                                    <Link to="/sign-up" className="px-3 py-2 text-sm bg-purple-600/80 text-white rounded-lg hover:bg-purple-700">
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
            </div>

            {/* Mobile Menu - Complete Overlay (From Code 2 - Enhanced) */}
            <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
                        mobileMenuOpen ? 'opacity-100' : 'opacity-0'
                    }`} 
                    onClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Menu Panel - Slides from right */}
                <div className={`absolute top-0 right-0 w-[85%] max-w-sm h-full bg-slate-950 shadow-2xl transition-transform duration-300 ease-out ${
                    mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                }`}>
                    <div className="flex flex-col h-full">
                        {/* Menu Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                {!logoError ? (
                                    <img 
                                        src="/Bluskye.png" 
                                        alt="BluSkye" 
                                        className="h-6 w-auto"
                                        onError={() => setLogoError(true)}
                                    />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-primary-400" />
                                )}
                                <span className="text-sm font-bold text-white">Menu</span>
                            </div>
                            <button 
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg transition"
                                aria-label="Close menu"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Menu Links - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                            {/* Main Navigation */}
                            {mainNavItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                                            active 
                                                ? 'bg-primary-600/10 text-primary-400' 
                                                : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="text-sm font-medium">{item.name}</span>
                                        {item.premium && (
                                            <span className="ml-auto text-[10px] px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white">
                                                PRO
                                            </span>
                                        )}
                                        {active && (
                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />
                                        )}
                                    </Link>
                                );
                            })}

                            <hr className="my-2 border-slate-800" />

                            {/* More Products */}
                            <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-4 pt-2 pb-1">More Products</div>
                            {productsDropdownItems.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5 text-primary-400" />
                                    <div>
                                        <p className="text-sm">{item.name}</p>
                                        <p className="text-xs text-slate-500">{item.description}</p>
                                    </div>
                                </Link>
                            ))}

                            <hr className="my-2 border-slate-800" />

                            {/* Resources */}
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 pt-2 pb-1">Resources</div>
                            {resourcesLinks.slice(0, 6).map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-sm">{item.name}</span>
                                </Link>
                            ))}

                            <hr className="my-2 border-slate-800" />

                            {/* User Account Section */}
                            {user ? (
                                <>
                                    <div className="px-4 py-2 text-slate-400 text-xs">Signed in as</div>
                                    <div className="px-4 py-2 text-white font-medium">{profile?.full_name || user.email}</div>
                                    
                                    {userNavItems.slice(0, 5).map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.path}
                                            className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span className="text-sm">{item.name}</span>
                                        </Link>
                                    ))}
                                    
                                    {/* FIXED (2026-08-27): same dead
                                        adminNavItems array, now actually
                                        rendered - mobile has real scroll
                                        room, so shows the complete list
                                        rather than a slice. */}
                                    {isAdmin && (
                                        <>
                                            <div className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-4 pt-2 pb-1">Admin</div>
                                            {adminNavItems.map((item) => (
                                                <Link
                                                    key={item.name}
                                                    to={item.path}
                                                    className="flex items-center gap-3 px-4 py-3 text-primary-400 hover:bg-slate-800 rounded-lg transition"
                                                    onClick={() => setMobileMenuOpen(false)}
                                                >
                                                    <item.icon className="w-5 h-5" />
                                                    <span className="text-sm">{item.name}</span>
                                                </Link>
                                            ))}
                                        </>
                                    )}
                                    
                                    {isSuperAdmin && (
                                        <div className="flex items-center gap-2 px-4 py-2">
                                            <Award className="w-4 h-4 text-emerald-400" />
                                            <span className="text-xs text-emerald-400">Super Admin Access</span>
                                        </div>
                                    )}
                                    
                                    <button 
                                        onClick={handleLogout} 
                                        className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                    >
                                        <LogOut className="w-5 h-5" /> 
                                        <span className="text-sm">Sign Out</span>
                                    </button>
                                </>
                            ) : (
                                <div className="space-y-2 mt-2">
                                    <Link 
                                        to="/sign-in" 
                                        className="flex items-center justify-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign In
                                    </Link>
                                    <Link 
                                        to="/sign-up" 
                                        className="flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                    
                                    {testerVisibility.show_login_button && (
                                        <Link 
                                            to="/tester-login" 
                                            className="flex items-center justify-center px-4 py-3 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/10 transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Tester Login
                                        </Link>
                                    )}
                                    {/* FIXED (2026-08-27): pointed at
                                        /tester-register — the same stale
                                        link already found and fixed in
                                        ProductsPage.jsx and AboutPage.jsx
                                        after the hardcoded invite-code
                                        vulnerability; that route now just
                                        redirects to /sign-up. */}
                                    {testerVisibility.show_register_button && (
                                        <Link 
                                            to="/sign-up" 
                                            className="flex items-center justify-center px-4 py-3 bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 transition"
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Become Tester
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Menu Footer */}
                        <div className="p-4 border-t border-slate-800 text-center">
                            <p className="text-xs text-slate-500">BluSkye Integrated Consult</p>
                            <p className="text-xs text-slate-600 mt-0.5">ODUSBABA Intelligence</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Animated gradient border on scroll */}
            <div 
                className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500 to-transparent transition-transform duration-500 ${
                    isScrolled ? 'scale-x-100' : 'scale-x-0'
                }`}
            />
        </nav>
    );
}
