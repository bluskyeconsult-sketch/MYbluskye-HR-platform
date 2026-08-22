// src/pages/tester/TesterRegisterPage.jsx
//
// REPLACED ENTIRELY (2026-08-22) — this page previously contained a
// hardcoded, client-side "master invite code" ('ODUSBABA2024' in one
// version, 'TESTER2026' in another — two genuinely different, both-live
// implementations were found, confirming this had drifted into an active,
// unmaintained mess). A hardcoded string check on the frontend is
// completely visible in the shipped JS bundle to anyone who opens dev
// tools — this was a real, severe, exploitable hole letting ANYONE
// register unlimited free tester accounts, entirely bypassing the real
// invite-code system (tester_invite_codes + consume_invite_code(),
// rate-limited, admin-managed) built this session.
//
// It also unconditionally forced every registrant to user_type: 'tester',
// tier: 'free' — directly contradicting the explicit decision that
// testers should keep their real selected tier's capabilities, with a
// separate hard usage cap layered on top. And it wrote AI credits to
// profiles.ai_credits_remaining/va_credits_balance — confirmed-dead
// columns the real credit system (the va_credits table) never reads —
// meaning anyone who registered through this page has a broken credit
// balance right now.
//
// Rather than maintain two separate, competing tester-registration
// systems (this one and the real one in SignUpPage.jsx), this page is
// now a simple redirect. SignUpPage.jsx already has the complete,
// correct implementation: real invite-code validation, tier
// preservation, is_tester flagging, real va_credits, and
// tester_allocations reconciliation.
//
// The two "Become a Tester" nav links in App.jsx should be updated to
// point directly at /sign-up instead of /tester-register — this
// redirect exists as a safety net for anyone who has this old URL
// bookmarked or linked externally, not as the primary path.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TesterRegisterPage() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/sign-up', { replace: true });
    }, [navigate]);

    return null;
}
