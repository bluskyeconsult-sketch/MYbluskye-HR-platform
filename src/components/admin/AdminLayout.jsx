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
    Activity, Shield, ShieldCheck, BarChart3, UserCheck, Lightbulb, DollarSign,
    FlaskConical, HeartHandshake, KeyRound, ChevronLeft, Menu, X, Building2, Brain,
    Network, Share2, Gauge, FileSearch, MessageSquare, Eye, Stethoscope, Megaphone, Wrench, LifeBuoy, Bell, Image, Video, Calendar, FolderOpen, UserPlus
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../../lib/authFetch';
import { supabase } from '../../lib/supabase';
import { FreshnessReminder } from '../../pages/admin/AdminDataFreshness';

// Single source of truth for the admin nav — every real /admin/* route
// confirmed in the project brief, in one place. Adding a new admin page
// going forward means adding one line here, not touching every page.
const ADMIN_NAV = [
    { section: 'Overview', items: [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/health', label: 'System Health', icon: Activity },
        { path: '/admin/readiness-check', label: 'Readiness Check', icon: ShieldCheck },
        { path: '/admin/diagnostics', label: 'Diagnostics', icon: Stethoscope },
        { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/admin/usage-meter', label: 'Usage Meter', icon: Gauge },
        { path: '/admin/security', label: 'Security', icon: Shield },
        { path: '/admin/audit', label: 'Audit Log', icon: FileSearch },
    ]},
    { section: 'People', items: [
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/employer-verification', label: 'Employer Verification', icon: UserCheck },
        { path: '/admin/employer-jobs', label: 'Employer Jobs', icon: Briefcase },
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
        { path: '/admin/dashboard-announcements', label: 'Dashboard Announcements', icon: Bell },
        { path: '/admin/workforce', label: 'Workforce Marketplace', icon: Network },
        { path: '/admin/compliance-rules', label: 'Compliance Rules', icon: ShieldCheck },
        { path: '/admin/geo-pricing', label: 'Regional Pricing', icon: Globe },
        { path: '/admin/employer-registers', label: 'Employer Lists', icon: Globe },
        { path: '/admin/data-freshness', label: 'Keep Up To Date', icon: Bell },
        { path: '/admin/lmia-explorer', label: 'LMIA Explorer', icon: Database },
        { path: '/admin/find-websites', label: 'Find Employer Websites', icon: Globe },
        { path: '/admin/courses', label: 'Courses', icon: BookOpen },
        { path: '/admin/ai-course-builder', label: 'AI Course Builder', icon: Sparkles },
        { path: '/admin/articles', label: 'Articles', icon: FileText },
        { path: '/admin/books', label: 'Books', icon: Book },
        { path: '/admin/assessments', label: 'Assessments', icon: ClipboardList },
        { path: '/admin/virtual-assistants', label: 'Virtual Assistants', icon: Bot },
        { path: '/admin/hr-tool-builder', label: 'HR Tool Builder', icon: Wrench },
        { path: '/admin/openai-usage', label: 'OpenAI Usage & Security', icon: ShieldAlert },
        { path: '/admin/renewals', label: 'Renewals Monitor', icon: Calendar },
        { path: '/admin/personal-media-studio', label: 'Media Studio', icon: Image },
        { path: '/admin/video-creator', label: 'Video Creator', icon: Video },
        { path: '/admin/media-library', label: 'Media Library', icon: FolderOpen },
        { path: '/admin/page-backdrops', label: 'Page Backdrops', icon: Image },
        { path: '/admin/support-tickets', label: 'Support Tickets', icon: LifeBuoy },
        { path: '/admin/skills', label: 'Skills', icon: Flag },
    ]},
    { section: 'Communications', items: [
        { path: '/admin/inbox', label: 'Inbox', icon: Mail, badgeKey: 'inbox' },
        { path: '/admin/newsletter', label: 'Newsletter', icon: Mail },
        { path: '/admin/newsletter-subscribers', label: 'Subscribers', icon: Users },
        { path: '/admin/invitations', label: 'Invite People', icon: UserPlus },
        { path: '/admin/member-engagement', label: 'Member Engagement', icon: HeartHandshake },
        { path: '/admin/email-test', label: 'Email Test', icon: Mail },
        { path: '/admin/knowledge-sources', label: 'Knowledge Sources', icon: Database },
    ]},
    { section: 'Growth', items: [
        { path: '/admin/insight-engine', label: 'Insight Engine', icon: Brain },
        { path: '/admin/pipeline', label: 'Sales Pipeline', icon: ClipboardList },
        { path: '/admin/finance', label: 'Finance & Compliance', icon: DollarSign },
        { path: '/admin/opportunity-gaps', label: 'Opportunity Gaps', icon: Lightbulb },
        { path: '/admin/affiliate-management', label: 'Affiliate Program', icon: Share2 },
        { path: '/admin/refund-requests', label: 'Refund Requests', icon: DollarSign },
    ]},
];

// NEW (2026-11-06): amber asterisk on a menu item when something there needs your attention.
// Each check counts only rows waiting for a decision. A failed check shows nothing, never an error.
const countRows = async (table, column, values) => {
    try {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).in(column, values);
        return count || 0;
    } catch (e) { return 0; }
};
const ATTENTION_CHECKS = {
    '/admin/external-jobs': () => countRows('external_jobs', 'status', ['pending_approval']),
    '/admin/employer-verification': () => countRows('employer_verifications', 'verification_status', ['pending']),
    '/admin/fraud-reports': () => countRows('fraud_reports', 'status', ['pending']),
    '/admin/refund-requests': () => countRows('refund_requests', 'status', ['pending']),
    '/admin/support-tickets': () => countRows('support_tickets', 'status', ['open']),
    '/admin/affiliate-management': () => countRows('affiliate_withdrawals', 'status', ['pending']),
    '/admin/employer-jobs': async () => {
        try { const d = await authenticatedFetch('admin-employer-jobs-list', { status: 'pending' }); return (d.jobs || []).length; } catch (e) { return 0; }
    },
    '/admin/data-freshness': async () => {
        try {
            const { data } = await supabase.rpc('admin_freshness');
            return (data || []).filter((r) => r.status && r.status !== 'ok').length;
        } catch (e) { return 0; }
    }
};

export default function AdminLayout({ children }) {
    const location = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    // NEW (2026-10-16): unread count for the Inbox menu item. The Inbox item only shows for people allowed to use it.
    const [inbox, setInbox] = useState({ allowed: false, count: 0 });
    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const d = await authenticatedFetch('mail-unread-count', {});
                if (!stop) setInbox({ allowed: !!d.allowed, count: d.count || 0 });
            } catch (e) { /* menu badge is optional */ }
        };
        load();
        const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 90000);
        return () => { stop = true; clearInterval(t); };
    }, [location.pathname]);

    // NEW (2026-11-06): counts of things waiting for you, keyed by menu path.
    const [attention, setAttention] = useState({});
    useEffect(() => {
        let stop = false;
        const load = async () => {
            const entries = await Promise.all(Object.entries(ATTENTION_CHECKS).map(async ([path, fn]) => [path, await fn()]));
            if (!stop) setAttention(Object.fromEntries(entries));
        };
        load();
        const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 120000);
        return () => { stop = true; clearInterval(t); };
    }, [location.pathname]);
    const anyAttention = inbox.count > 0 || Object.values(attention).some((n) => n > 0);

    const currentLabel = ADMIN_NAV
        .flatMap(section => section.items)
        .find(item => location.pathname.startsWith(item.path))?.label || 'Admin';

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Mobile nav toggle */}
            <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white relative"
            >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                {!mobileNavOpen && anyAttention && <span className="absolute -top-1 -right-1 text-amber-400 text-lg leading-none font-bold">*</span>}
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
                                {section.items.filter((item) => item.badgeKey !== 'inbox' || inbox.allowed).map((item) => {
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
                                            {attention[item.path] > 0 && (
                                                <span className="ml-auto flex items-center gap-1 text-amber-400 font-bold" title={`${attention[item.path]} waiting for you`}>
                                                    <span className="text-base leading-none">*</span>
                                                    <span className="text-[10px] font-semibold">{attention[item.path] > 99 ? '99+' : attention[item.path]}</span>
                                                </span>
                                            )}
                                            {item.badgeKey === 'inbox' && inbox.count > 0 && (
                                                <span className="ml-auto flex items-center gap-1 bg-primary-600 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{inbox.count > 99 ? '99+' : inbox.count}</span>
                                            )}
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
                <FreshnessReminder />
            </main>
        </div>
    );
}
