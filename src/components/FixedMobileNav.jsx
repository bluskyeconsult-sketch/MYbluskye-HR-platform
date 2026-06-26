// src/components/FixedMobileNav.jsx
// COMPLETE MOBILE NAVIGATION FIX - Unified API Integration
// ✅ Optimized with RUTH Standard
// ✅ Uses unified API (api/index.js)
// ✅ All features preserved
// ✅ Mobile-first responsive

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    Home, Briefcase, Users, BookOpen, Brain, Bot, 
    User, Settings, LogOut, Menu, X, ChevronRight,
    LayoutDashboard, FileText, Award, TrendingUp,
    GraduationCap, Mail, Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function FixedMobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // ============================================
    // AUTHENTICATION - USING UNIFIED API
    // ============================================

    useEffect(() => {
        checkUser();
        // Close menu on route change
        setIsOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        // Prevent body scroll when menu is open
        if (isOpen) {
            document.body.classList.add('mobile-menu-open');
        } else {
            document.body.classList.remove('mobile-menu-open');
        }
        return () => document.body.classList.remove('mobile-menu-open');
    }, [isOpen]);

    async function checkUser() {
        try {
            // Using unified API for session check
            const sessionResponse = await fetch(`${API_BASE}?action=session`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const sessionData = await sessionResponse.json();
            
            setUser(sessionData.user || null);
            
            if (sessionData.user) {
                // Get profile using unified API
                const profileResponse = await fetch(`${API_BASE}?action=profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: sessionData.user.id })
                });
                const profileData = await profileResponse.json();
                setProfile(profileData.data);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // Fallback to direct Supabase if API fails
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
                if (user) {
                    const { data } = await supabase
                        .from('profiles')
                        .select('user_type, tier, full_name')
                        .eq('id', user.id)
                        .single();
                    setProfile(data);
                }
            } catch (fallbackError) {
                console.error('Fallback auth error:', fallbackError);
            }
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = async () => {
        try {
            // Use unified API for logout
            await fetch(`${API_BASE}?action=logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            setIsOpen(false);
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback to direct Supabase
            await supabase.auth.signOut();
            setIsOpen(false);
            window.location.href = '/';
        }
    };

    // ============================================
    // NAVIGATION ITEMS
    // ============================================

    const isActive = (path) => location.pathname === path;

    const mainLinks = [
        { path: '/', icon: Home, label: 'Home', highlight: false },
        { path: '/jobs', icon: Briefcase, label: 'Jobs', highlight: true },
        { path: '/workforce', icon: Users, label: 'Workforce', highlight: false },
        { path: '/courses', icon: GraduationCap, label: 'Courses', highlight: false },
        { path: '/books', icon: BookOpen, label: 'Books', highlight: false },
        { path: '/assessments', icon: Brain, label: 'Assessments', highlight: false },
        { path: '/hire-va', icon: Bot, label: 'Hire VA', highlight: true },
        { path: '/newsletter', icon: Mail, label: 'Newsletter', highlight: false },
    ];

    const userLinks = user ? [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/profile', icon: User, label: 'Profile' },
        { path: '/applications', icon: FileText, label: 'Applications' },
        { path: '/saved-jobs', icon: BookOpen, label: 'Saved Jobs' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ] : [];

    const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'super_admin';
    const isTester = profile?.user_type === 'tester';

    // ============================================
    // RENDER
    // ============================================

    if (loading) {
        return (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800">
                <div className="flex items-center justify-around h-16 px-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5 px-2 py-1">
                            <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
                            <div className="w-8 h-2 bg-slate-700 rounded animate-pulse"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Bottom Navigation - Always visible on mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 safe-bottom">
                <div className="flex items-center justify-around h-16 px-2">
                    {mainLinks.slice(0, 4).map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition ${
                                    active ? 'text-primary-400' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{link.label}</span>
                                {link.highlight && active && (
                                    <span className="absolute -top-1 right-0 w-1.5 h-1.5 bg-primary-400 rounded-full"></span>
                                )}
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-slate-400 hover:text-white transition"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                        <span className="text-[10px] font-medium">More</span>
                        {!user && (
                            <span className="absolute -top-1 right-1 w-2 h-2 bg-primary-400 rounded-full animate-pulse"></span>
                        )}
                    </button>
                </div>
            </div>

            {/* Full Menu Overlay - Slide up from bottom */}
            <div className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
                isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${
                        isOpen ? 'opacity-100' : 'opacity-0'
                    }`} 
                    onClick={() => setIsOpen(false)} 
                />
                
                {/* Menu Panel */}
                <div className={`absolute bottom-0 left-0 right-0 max-h-[85vh] bg-slate-950 rounded-t-2xl shadow-2xl transition-transform duration-300 ${
                    isOpen ? 'translate-y-0' : 'translate-y-full'
                }`}>
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-slate-800">
                        <div>
                            <h2 className="text-lg font-bold text-white">Menu</h2>
                            {user && profile && (
                                <p className="text-xs text-slate-400">
                                    Signed in as {profile.full_name || user.email}
                                </p>
                            )}
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)} 
                            className="p-2 text-slate-400 hover:text-white transition"
                            aria-label="Close menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="overflow-y-auto p-4 space-y-1 max-h-[70vh] overscroll-contain">
                        {mainLinks.map((link) => {
                            const Icon = link.icon;
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                                        active ? 'bg-primary-600/10 text-primary-400' : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Icon className={`w-5 h-5 ${active ? 'text-primary-400' : 'text-slate-400'}`} />
                                    <span className="text-sm font-medium">{link.label}</span>
                                    {link.highlight && (
                                        <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-white">
                                            PRO
                                        </span>
                                    )}
                                    {active && <ChevronRight className="w-4 h-4 ml-auto text-primary-400" />}
                                </Link>
                            );
                        })}

                        {user && (
                            <>
                                <div className="border-t border-slate-800 my-3" />
                                
                                {/* User Links */}
                                {userLinks.map((link) => {
                                    const Icon = link.icon;
                                    const active = isActive(link.path);
                                    return (
                                        <Link
                                            key={link.path}
                                            to={link.path}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition ${
                                                active ? 'bg-primary-600/10 text-primary-400' : 'text-slate-300 hover:bg-slate-800'
                                            }`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <Icon className={`w-5 h-5 ${active ? 'text-primary-400' : 'text-slate-400'}`} />
                                            <span className="text-sm font-medium">{link.label}</span>
                                        </Link>
                                    );
                                })}

                                {/* Admin Link */}
                                {isAdmin && (
                                    <Link
                                        to="/admin/dashboard"
                                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-primary-400 hover:bg-primary-500/10 transition"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <LayoutDashboard className="w-5 h-5" />
                                        <span className="text-sm font-medium">Admin Panel</span>
                                    </Link>
                                )}

                                {/* Tester Links */}
                                {isTester && (
                                    <Link
                                        to="/tester/dashboard"
                                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-purple-400 hover:bg-purple-500/10 transition"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Award className="w-5 h-5" />
                                        <span className="text-sm font-medium">Tester Dashboard</span>
                                    </Link>
                                )}

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-3 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </>
                        )}

                        {!user && (
                            <div className="border-t border-slate-800 mt-3 pt-3 space-y-2">
                                <Link 
                                    to="/sign-in" 
                                    className="block px-3 py-3 text-slate-300 hover:bg-slate-800 rounded-lg text-center transition"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link 
                                    to="/sign-up" 
                                    className="block px-3 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-center transition"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Get Started
                                </Link>
                                <div className="flex gap-2">
                                    <Link 
                                        to="/tester-login" 
                                        className="flex-1 px-3 py-2 border border-purple-500/50 text-purple-400 rounded-lg text-center text-sm hover:bg-purple-500/10 transition"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Tester Login
                                    </Link>
                                    <Link 
                                        to="/tester-register" 
                                        className="flex-1 px-3 py-2 bg-purple-600/80 text-white rounded-lg text-center text-sm hover:bg-purple-700 transition"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Become Tester
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
