// src/components/admin/AdminLayout.jsx
// NEW FILE (2026-08-20) — shared shell for every /admin/* page. Fixes the
// confirmed inconsistency across the admin section: some pages had a
// "Back to Dashboard" button and implied sidebar navigation, most didn't,
// with no single shared wrapper enforcing it. Rather than patch each
// admin page individually (fragile, easy to miss one), this wraps all of
// them once, centrally — every admin page gets the same persistent
// sidebar and consistent way back to the dashboard, with zero chance of
// a future new admin page forgetting to include it.

import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, Briefcase, BookOpen, FileText, ShieldAlert,
    Mail, Globe, Database, Book, ClipboardList, Bot, Sparkles, Flag,
    Activity, Shield, BarChart3, UserCheck, Lightbulb, DollarSign,
    FlaskConical, KeyRound, ChevronLeft, Menu, X, Building2, Brain,
    Network, Share2, Gauge, FileSearch, MessageSquare, Eye, Stethoscope, Megaphone
} from 'lucide-react';
import { useState } from 'react';

// Single source of truth for the admin nav — every real /admin/* route
// confirmed in the project brief, in one place. Adding a new admin page
// going forward means adding one line here, not touching every page.
const ADMIN_NAV = [
    { section: 'Overview', items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/health', label: 'System Health', icon: Activity },
        { path: '/admin/diagnostics', label: 'Diagnostics', icon: Stethoscope },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/admin/usage-meter', label: 'Usage Meter', icon: Gauge },
        { path: '/admin/security', label: 'Security', icon: Shield },
        { path: '/admin/audit', label: 'Audit Log', icon: FileSearch },
    ]},
    { section: 'People', items: [
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/employer-verification', label: 'Employer Verification', icon: UserCheck },
        { path: '/admin/fraud-reports', label: 'Fraud Reports', icon: ShieldAlert },
        { path: '/admin/testing-mode', label: 'Testing Mode', icon: FlaskConical },
        { path: '/admin/tester-invites', label: 'Tester Invite Codes', icon: KeyRound },
        { path: '/admin/settings/tester-visibility', label: 'Tester Visibility', icon: Eye },
        { path: '/admin/tester-feedback', label: 'Tester Feedback', icon: MessageSquare },
    ]},
    { section: 'Content', items: [
        { path: '/admin/jobs', label: 'Job Management', icon: Briefcase },
        { path: '/admin/external-jobs', label: 'External Jobs', icon: Globe },
        { path: '/admin/employer-sources', label: 'Employer Sources', icon: Building2 },
        { path: '/admin/banner-messages', label: 'Banner Messages', icon: Megaphone },
        { path: '/admin/workforce', label: 'Workforce Marketplace', icon: Network },
        { path: '/admin/courses', label: 'Courses', icon: BookOpen },
        { path: '/admin/ai-course-builder', label: 'AI Course Builder', icon: Sparkles },
        { path: '/admin/articles', label: 'Articles', icon: FileText },
        { path: '/admin/books', label: 'Books', icon: Book },
        { path: '/admin/assessments', label: 'Assessments', icon: ClipboardList },
        { path: '/admin/virtual-assistants', label: 'Virtual Assistants', icon: Bot },
        { path: '/admin/skills', label: 'Skills', icon: Flag },
    ]},
    { section: 'Communications', items: [
        { path: '/admin/newsletter', label: 'Newsletter', icon: Mail },
        { path: '/admin/email-test', label: 'Email Test', icon: Mail },
        { path: '/admin/knowledge-sources', label: 'Knowledge Sources', icon: Database },
    ]},
    { section: 'Growth', items: [
        { path: '/admin/insight-engine', label: 'Insight Engine', icon: Brain },
        { path: '/admin/opportunity-gaps', label: 'Opportunity Gaps', icon: Lightbulb },
        { path: '/admin/affiliate-management', label: 'Affiliate Program', icon: Share2 },
        { path: '/admin/refund-requests', label: 'Refund Requests', icon: DollarSign },
    ]},
];

export default function AdminLayout({ children }) {
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const currentLabel = ADMIN_NAV
        .flatMap(section => section.items)
        .find(item => location.pathname.startsWith(item.path))?.label || 'Admin';

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile nav toggle */}
            <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
            >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800
                overflow-y-auto z-40 transition-transform duration-200
                ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-4 border-b border-slate-800">
                    <Link to="/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </Link>
                    <h1 className="text-white font-bold text-lg mt-3">Admin Panel</h1>
                </div>

                <nav className="p-3 space-y-5">
                    {ADMIN_NAV.map((section) => (
                        <div key={section.section}>
                            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-2 mb-1.5">
                                {section.section}
                            </p>
                            <div className="space-y-0.5">
                                {section.items.map((item) => {
                                    const isActive = location.pathname.startsWith(item.path);
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileNavOpen(false)}
                                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition ${
                                                isActive
                                                    ? 'bg-primary-600/20 text-primary-400 font-medium'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Mobile overlay */}
            {mobileNavOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setMobileNavOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="flex-1 min-w-0">
                <div className="lg:hidden h-14" />
                <div className="hidden lg:block px-6 pt-6 pb-2">
                    <p className="text-slate-500 text-sm">Admin / <span className="text-slate-300">{currentLabel}</span></p>
                </div>
                {children}
            </main>
        </div>
    );
}
