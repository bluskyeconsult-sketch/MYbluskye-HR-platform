// src/pages/PricingExplained.jsx
//
// NEW (2026-09-25): the single, real page explaining the platform's
// three separate systems (tier, credits, one-time purchases) in
// plain language - genuinely built so users can understand it
// themselves, not a marketing page.

import { Link } from 'react-router-dom';
import { Unlock, Lock, DollarSign, HelpCircle } from 'lucide-react';

export default function PricingExplained() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                <HelpCircle className="w-7 h-7 text-primary-400" /> Pricing & Credits, Explained
            </h1>
            <p className="text-slate-400 mb-10">
                There are three separate things going on when you see a price or a badge on this site. Here's exactly what each one means.
            </p>

            <div className="space-y-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Unlock className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-bold text-white">Included in your plan</h2>
                    </div>
                    <p className="text-slate-300 text-sm mb-3">
                        Your subscription tier (Free, Registered, Professional, Employer, or Business) gives you access to a set of AI-powered tools — HR Tools, Virtual Assistant tasks, and more. Each real use of one costs <strong>1 credit</strong> from a monthly allowance that resets every month.
                    </p>
                    <p className="text-slate-400 text-xs">
                        You'll see this as: <em>"Included in your plan — 18/25 credits left this month."</em> Once your credits run out for the month, you'll need to wait for the reset or upgrade for a higher allowance — nothing extra is ever charged automatically.
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-amber-400" />
                        <h2 className="text-lg font-bold text-white">Requires an upgrade</h2>
                    </div>
                    <p className="text-slate-300 text-sm mb-3">
                        Some tools are only available at certain tiers, regardless of credits. If you see this badge, it means your current plan doesn't include this specific tool at all — upgrading unlocks it.
                    </p>
                    <p className="text-slate-400 text-xs">
                        This is different from running out of credits — it means the tool isn't part of your plan yet, not that you've used up your allowance.
                    </p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-sky-400" />
                        <h2 className="text-lg font-bold text-white">One-time purchase</h2>
                    </div>
                    <p className="text-slate-300 text-sm mb-3">
                        Books, some premium courses, and Virtual Assistant tasks work differently — you pay once for that specific thing, and it's yours. This has nothing to do with your subscription tier or your monthly credits at all.
                    </p>
                    <p className="text-slate-400 text-xs">
                        A Free-tier user and a Business-tier user pay the exact same price for the exact same book or course.
                    </p>
                </div>
            </div>

            <div className="mt-10 p-5 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <p className="text-white font-medium text-sm mb-1">Quick way to remember it:</p>
                <p className="text-slate-300 text-sm">
                    🔓 <strong>Included</strong> = your subscription already covers this, just tracks how many times a month.<br />
                    🔒 <strong>Upgrade</strong> = your plan doesn't include this tool at all yet.<br />
                    💰 <strong>Purchase</strong> = a specific item you buy once, unrelated to your plan.
                </p>
            </div>

            <div className="mt-8 text-center">
                <Link to="/pricing" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                    View all subscription plans →
                </Link>
            </div>
        </div>
    );
}
