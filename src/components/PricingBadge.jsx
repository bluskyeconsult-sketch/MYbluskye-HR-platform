// src/components/PricingBadge.jsx
//
// NEW (2026-09-25): the standard, shared pricing/access badge -
// implements the three-badge convention from the platform's pricing
// architecture review, so an item's real status (included in plan,
// needs an upgrade, or a one-time purchase) is shown the same way
// everywhere - HR Tools, VAs, courses, books alike - instead of each
// content type describing its pricing differently.
//
// Usage:
//   <PricingBadge kind="included" creditsUsed={7} creditsTotal={25} />
//   <PricingBadge kind="upgrade" requiredTier="professional" />
//   <PricingBadge kind="purchase" price={9.99} />

import { Unlock, Lock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIER_LABELS = {
    professional: 'Professional',
    employer: 'Employer',
    business: 'Business'
};

export default function PricingBadge({ kind, creditsUsed, creditsTotal, requiredTier, price }) {
    if (kind === 'included') {
        const hasCredits = typeof creditsTotal === 'number';
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium">
                <Unlock className="w-3 h-3" />
                Included in your plan
                {hasCredits && (
                    <span className="text-emerald-500/70">
                        — {Math.max(0, creditsTotal - (creditsUsed || 0))}/{creditsTotal} credits left this month
                    </span>
                )}
            </span>
        );
    }

    if (kind === 'upgrade') {
        return (
            <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-medium hover:bg-amber-500/20 transition"
            >
                <Lock className="w-3 h-3" />
                Requires {TIER_LABELS[requiredTier] || requiredTier} plan
            </Link>
        );
    }

    if (kind === 'purchase') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-full text-xs font-medium">
                <DollarSign className="w-3 h-3" />
                One-time purchase — ${Number(price).toFixed(2)}
            </span>
        );
    }

    return null;
}
