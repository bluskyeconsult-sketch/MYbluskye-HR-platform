// src/components/CareerCoachPolicyInsert.jsx
// NEW (2026-10-10): paste-in sections for the main Privacy Policy and Terms pages, so
// Career Coach is covered without rewriting those pages. Usage:
//   import CareerCoachPolicyInsert from '../../components/CareerCoachPolicyInsert';
//   ... inside PrivacyPage:  <CareerCoachPolicyInsert kind="privacy" />
//   ... inside TermsPage:    <CareerCoachPolicyInsert kind="terms" />
// Wording comes from careerCoachLegal.js so it stays consistent with the full notice.

import { Link } from 'react-router-dom';
import { LEGAL_ENTITY, fillNotice } from '../services/careerCoachLegal';

export default function CareerCoachPolicyInsert({ kind = 'privacy' }) {
    if (kind === 'terms') {
        return (
            <section id="career-coach-terms" className="mt-8">
                <h2 className="text-xl font-semibold text-white mb-2">Career Coach</h2>
                <div className="space-y-3 text-slate-300 leading-relaxed">
                    <p>Career Coach is an optional feature for users aged 18 or over. It gives general information and drafting help. It is not an employment or recruitment agency and does not provide immigration, legal or financial advice. You are responsible for checking that anything you send to an employer is true.</p>
                    <p>Job matching is free. Skills reviews and application drafts use credits shown before use, and credits are returned if a review or draft fails. The specific terms for Career Coach, including how your information is used, are in the <Link to="/career-coach-notice" className="text-primary-400 hover:underline">Career Coach privacy notice and terms</Link>, which form part of these Terms for that feature.</p>
                </div>
            </section>
        );
    }
    return (
        <section id="career-coach-privacy" className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-2">Career Coach (optional feature)</h2>
            <div className="space-y-3 text-slate-300 leading-relaxed">
                <p>If you choose to turn on Career Coach, we use your job goal, the CV text you provide, your skills and assessment results, and your name and location to match you with jobs and draft application documents. We do this only with your consent, which you can withdraw at any time. If you say no, nothing is used for Career Coach.</p>
                <p>To produce reviews and drafts we send the text needed for each request to OpenAI, our AI processor, in the United States. We remove obvious contact details and ID-style numbers first. Our hosting and database providers (Vercel and Supabase) act as processors. We keep Career Coach data until you withdraw or for 12 months after you last use it, and we keep a record of your consent choice for 6 years.</p>
                <p>You can download or delete your Career Coach data on the Career Coach page. Full details, including international transfers, your rights and how to complain, are in the <Link to="/career-coach-notice" className="text-primary-400 hover:underline">Career Coach privacy notice and terms</Link>. Contact: {fillNotice('{privacyEmail}')} ({LEGAL_ENTITY.name}).</p>
            </div>
        </section>
    );
}
