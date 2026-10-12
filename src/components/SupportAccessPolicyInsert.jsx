// src/components/SupportAccessPolicyInsert.jsx
// NEW (2026-10-12): privacy-policy section describing the admin "Support view". Rendered under the
// Privacy page by CareerCoachPolicyPanel in App.jsx (see START-HERE.md). The wording matches what the
// Support view does: read only, reason required, every access recorded, content only when needed,
// private messages and Career Coach content never shown. If the Support view changes, change this.

import { LEGAL_ENTITY, fillNotice } from '../services/careerCoachLegal';

export default function SupportAccessPolicyInsert() {
    return (
        <section id="support-access-privacy" className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-2">When our team looks at your account</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>If you ask us for help, or something on your account is not working, authorised members of our team can open a read-only view of your account to find and fix the problem. They can see your profile and plan, credit balance, job applications and applications you have tracked, assessment results, a list of the assistant tasks you have run, your support requests and recent account activity. They cannot sign in as you or change your information from this view.</p>
                <p>They can see what you typed into an assessment or an AI assistant, and what came back, only when it is needed to solve the problem. They cannot see your private messages or your Career Coach goals and drafts.</p>
                <p>Every time someone opens your account this way, we record who it was, when, the reason they gave, and whether they looked at the content of your submissions. We do this to give you the service and support you asked for, and to keep your information safe. You can ask for the record of who has accessed your account by emailing {fillNotice('{privacyEmail}')} ({LEGAL_ENTITY.name}).</p>
            </div>
        </section>
    );
}
