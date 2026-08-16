// src/pages/legal/CookiesPage.jsx
//
// FIXED (2026-08-16):
// 1. Used bg-background — not a real color anywhere else in this project
//    (every other page uses the standard slate palette) — replaced with
//    bg-slate-950.
// 2. Substantially expanded — the original was three generic sentences
//    with no specific cookie categories at all. UK PECR and the EU
//    ePrivacy Directive both require actually naming what you use cookies
//    for, not just a general statement that you use them. This describes
//    real, confirmed categories used elsewhere in this codebase
//    (Supabase auth session cookies, the real CookieConsent.jsx consent
//    manager, analytics_sessions tracking) rather than generic filler.
//
// NOTE: this is a genuine improvement in completeness, not a substitute
// for legal review — cookie compliance requirements vary by jurisdiction
// and should be confirmed by a qualified professional for the specific
// countries you operate in.

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">Cookie Policy</h1>
        <p className="text-slate-400">Last updated: August 2026</p>

        <h2 className="text-xl font-semibold text-white mt-6">What Are Cookies</h2>
        <p>Cookies are small text files stored on your device when you visit a website. They help the site remember information about your visit, which can make it easier to use the site and make certain features work.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Cookies We Use</h2>

        <h3 className="text-lg font-semibold text-white mt-4">Essential Cookies (always active)</h3>
        <p>These are required for the platform to function and cannot be switched off:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Authentication and session cookies (keep you signed in, managed by our authentication provider, Supabase)</li>
          <li>Security cookies (help protect against fraud and unauthorized access)</li>
          <li>Cookie consent preference (remembers your choices from our cookie consent banner)</li>
        </ul>

        <h3 className="text-lg font-semibold text-white mt-4">Functional Cookies</h3>
        <p>These remember choices you make to give you a more personalized experience:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Display and layout preferences</li>
          <li>Tester program visibility settings</li>
        </ul>

        <h3 className="text-lg font-semibold text-white mt-4">Analytics Cookies</h3>
        <p>These help us understand how the platform is used so we can improve it:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Session and page view tracking (anonymized where possible)</li>
          <li>Device and browser type, for compatibility and performance monitoring</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">Managing Cookies</h2>
        <p>You can accept or decline non-essential cookies through our cookie consent banner when you first visit the platform. You can also control cookies directly through your browser settings — most browsers let you block or delete cookies, though doing so may affect essential functionality like staying signed in.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Changes to This Policy</h2>
        <p>We may update this Cookie Policy from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Contact Us</h2>
        <p>Questions about our use of cookies can be sent to <a href="mailto:privacy@bluskyeconsult.com" className="text-primary-400 hover:underline">privacy@bluskyeconsult.com</a>.</p>
      </div>
    </div>
  );
}
