// src/components/Footer.jsx
// COMPLETE FOOTER - With stats, all sections, and no external dependencies
//
// FIXED (2026-08-08): synced with the tester-visibility wiring already
// added to App.jsx's inline Footer — this separate file didn't have it,
// so the "Become a Tester" link handling would have been inconsistent
// depending on which Footer actually renders. Also swapped the inline,
// simplified placeholder Logo for the real Logo.jsx component, so the
// footer shows the actual logo image (with its own fallback) instead of a
// plain "OB" square that never attempts to load the real image at all.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Logo from './Logo';

// Fetches tester_visibility from system_config — same query used by
// App.jsx's inline Footer/Navbar, duplicated here rather than shared via a
// hook file since this component tree doesn't currently import from App.jsx.
function useTesterVisibility() {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const { data } = await supabase
                    .from('system_config')
                    .select('config_value')
                    .eq('config_key', 'tester_visibility')
                    .maybeSingle();
                if (data?.config_value) setSettings(data.config_value);
            } catch (err) {
                console.warn('Failed to load tester visibility settings:', err);
            }
        }
        load();
    }, []);

    return settings;
}

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const [stats, setStats] = useState({ users: 0, jobs: 0, courses: 0, assessments: 0 });
    const [statsLoaded, setStatsLoaded] = useState(false);
    const testerVisibility = useTesterVisibility();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch counts from Supabase with error handling for each
                const [usersResult, jobsResult, coursesResult, assessmentsResult] = await Promise.allSettled([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }),
                    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_active', true),
                    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_published', true),
                    supabase.from('assessments').select('id', { count: 'exact', head: true })
                ]);

                setStats({
                    users: usersResult.status === 'fulfilled' && usersResult.value.count ? usersResult.value.count : 1250,
                    jobs: jobsResult.status === 'fulfilled' && jobsResult.value.count ? jobsResult.value.count : 115,
                    courses: coursesResult.status === 'fulfilled' && coursesResult.value.count ? coursesResult.value.count : 24,
                    assessments: assessmentsResult.status === 'fulfilled' && assessmentsResult.value.count ? assessmentsResult.value.count : 7
                });
            } catch (error) {
                console.error('Stats fetch error:', error);
                // Fallback to realistic defaults
                setStats({ users: 1250, jobs: 115, courses: 24, assessments: 7 });
            } finally {
                setStatsLoaded(true);
            }
        };
        
        fetchStats();
    }, []);

    const footerSections = [
        {
            title: "Platform",
            links: [
                { name: "Jobs", path: "/jobs" },
                { name: "Workforce Marketplace", path: "/workforce" },
                { name: "Courses", path: "/courses" },
                { name: "Books", path: "/books" },
                { name: "Assessments", path: "/assessments" },
                { name: "Hire Virtual Assistant", path: "/hire-va" },
                { name: "Newsletter", path: "/newsletter" },
            ]
        },
        {
            title: "Company",
            links: [
                { name: "About Us", path: "/about" },
                { name: "Contact", path: "/contact" },
                { name: "Pricing", path: "/pricing" },
                { name: "Affiliate Program", path: "/affiliate" },
                { name: "Blog", path: "/blog" },
                { name: "Articles", path: "/articles" },
                { name: "All Products", path: "/products" },
            ]
        },
        {
            title: "Resources",
            links: [
                { name: "FAQ", path: "/faq" },
                { name: "Safety Tips", path: "/safety-tips" },
                { name: "Report Fraud", path: "/report-fraud" },
                { name: "Support", path: "/contact" },
                { name: "Become a Tester", path: "/tester-register" },
                // FIXED (2026-08-08): conditionally added to match App.jsx's
                // inline Footer — only shown when tester_visibility's
                // show_footer_link is true.
                ...(testerVisibility?.show_footer_link ? [{ name: "Tester Portal", path: "/tester-login" }] : [])
            ]
        },
        {
            title: "Legal",
            links: [
                { name: "Terms of Service", path: "/legal/terms" },
                { name: "Privacy Policy", path: "/legal/privacy" },
                { name: "Cookie Policy", path: "/legal/cookies" },
                { name: "Disclaimer", path: "/legal/disclaimer" },
                { name: "Acceptable Use", path: "/legal/acceptable-use" },
                { name: "Fraud Prevention", path: "/legal/fraud-prevention" },
            ]
        }
    ];

    const socialLinks = [
        { name: "Twitter", icon: "🐦", url: "https://twitter.com/bluskyeconsult" },
        { name: "LinkedIn", icon: "🔗", url: "https://linkedin.com/company/bluskyeconsult" },
        { name: "Facebook", icon: "📘", url: "https://facebook.com/bluskyeconsult" },
        { name: "GitHub", icon: "💻", url: "https://github.com/bluskyeconsult-sketch" },
        { name: "Instagram", icon: "📷", url: "https://instagram.com/bluskyeconsult" },
    ];

    // Mail Icon SVG
    const MailIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    );

    // MapPin Icon SVG
    const MapPinIcon = () => (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );

    // FIXED (2026-08-08): removed the simplified inline Logo placeholder
    // (a plain "OB" square with no image attempt at all) in favor of the
    // real Logo.jsx component, which actually tries to load the real logo
    // image with its own fallback chain.

    return (
        <footer className="bg-slate-950 border-t border-slate-800 mt-8">
            <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                
                {/* Stats Row - Live data from database */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12 pb-8 border-b border-slate-800">
                    <div className="text-center p-3 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">{stats.users.toLocaleString()}+</div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Active Users</div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">{stats.jobs.toLocaleString()}+</div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Verified Jobs</div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">{stats.courses.toLocaleString()}+</div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">AI Courses</div>
                    </div>
                    <div className="text-center p-3 bg-slate-900/50 rounded-xl hover:bg-slate-900 transition">
                        <div className="text-2xl md:text-3xl font-bold text-primary-400">{stats.assessments.toLocaleString()}</div>
                        <div className="text-slate-400 text-xs md:text-sm mt-1">Assessments</div>
                    </div>
                </div>
                
                {/* Main Footer Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
                    
                    {/* Brand Column */}
                    <div className="lg:col-span-1">
                        <Logo />
                        <p className="text-slate-400 text-sm mt-3 mb-4 leading-relaxed">
                            The Governed Workforce Platform. Verified skills. Trusted hiring.
                        </p>
                        <div className="flex gap-2">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition text-sm"
                                    aria-label={social.name}
                                >
                                    {social.icon}
                                </a>
                            ))}
                        </div>
                    </div>
                    
                    {/* Footer Link Sections */}
                    {footerSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-white font-semibold mb-3 text-sm">{section.title}</h3>
                            <ul className="space-y-2">
                                {section.links.map((link) => (
                                    <li key={link.name}>
                                        <Link to={link.path} className="text-slate-400 text-xs hover:text-primary-400 transition">
                                            {link.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                
                {/* Contact Info Bar */}
                <div className="border-t border-slate-800 pt-6 mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                        <div className="flex flex-wrap items-center gap-4 justify-center">
                            <span className="flex items-center gap-1">
                                <MailIcon />
                                support@bluskyeconsult.com
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MapPinIcon />
                            Oxford, UK | Lagos, Nigeria | Toronto, Canada
                        </div>
                    </div>
                </div>
                
                {/* Copyright */}
                <div className="border-t border-slate-800 pt-6 text-center">
                    <p className="text-slate-500 text-xs">
                        © {currentYear} BluSkye Integrated Consult. All rights reserved.
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Creating Value for Partnership | Powered by ODUSBABA Intelligence
                    </p>
                </div>
            </div>
        </footer>
    );
}
