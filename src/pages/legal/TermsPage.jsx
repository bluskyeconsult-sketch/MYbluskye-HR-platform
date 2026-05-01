export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>
        <p className="text-slate-400">Last updated: May 1, 2026</p>

        <h2 className="text-xl font-semibold text-white mt-6">1. Acceptance of Terms</h2>
        <p>By accessing or using ODUSBABA (the "Platform"), you agree to be bound by these Terms of Service.</p>

        <h2 className="text-xl font-semibold text-white mt-6">2. Account Registration</h2>
        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials.</p>
        <p className="mt-2"><strong>Single Account Policy:</strong> Each user may maintain only one active account. Creating multiple accounts is prohibited and will result in suspension of all associated accounts.</p>

        <h2 className="text-xl font-semibold text-white mt-6">3. User Accounts & Tiers</h2>
        <p>ODUSBABA offers five account tiers: Free, Registered, Professional, Employer, and Business.</p>
        <ul>
          <li><strong>Free Tier:</strong> Limited browsing access only. Cannot apply to jobs or submit skills.</li>
          <li><strong>Registered Tier:</strong> Free tier with extended benefits including job applications, skill submission, and basic AI features.</li>
          <li><strong>Professional Tier:</strong> Paid monthly subscription with unlimited access to core features.</li>
          <li><strong>Employer Tier:</strong> Paid monthly subscription for hiring organizations.</li>
          <li><strong>Business Tier:</strong> Paid monthly subscription for enterprises with team accounts.</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">4. Job Applications (Free for All Registered Users)</h2>
        <p>Job applications are free for all Registered users. This is a marketing feature designed to help job seekers find opportunities. ODUSBABA does not guarantee job placement or interview success.</p>

        <h2 className="text-xl font-semibold text-white mt-6">5. Job Alerts & Newsletter</h2>
        <p>Job alerts and newsletter subscriptions are free for all Registered users. You may unsubscribe at any time.</p>

        <h2 className="text-xl font-semibold text-white mt-6">6. Virtual Assistant Services</h2>
        <p>Virtual Assistant (VA) services are AI-powered automated task execution tools. Each tier includes a monthly quota of VA tasks. Additional tasks may be purchased using Credits.</p>
        <p><strong>Quality Guarantee:</strong> If a VA task does not meet quality standards, you may reject the output. After 3 rejections, the task will be reviewed by a human administrator.</p>

        <h2 className="text-xl font-semibold text-white mt-6">7. Assessments</h2>
        <p>Psychometric and skill assessments are AI-scored tools for self-evaluation. Results are for informational purposes only and do not constitute professional certification.</p>

        <h2 className="text-xl font-semibold text-white mt-6">8. Credit System</h2>
        <p>Credits are virtual currency used to purchase additional VA tasks and assessments beyond your plan's included limits.</p>
        <ul>
          <li>Credits are non-refundable</li>
          <li>Credits expire 12 months from purchase date</li>
          <li>Credits may be transferred between accounts only with admin approval</li>
          <li>Unused credits are not refunded upon account cancellation</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">9. No Double Charging</h2>
        <p>Your monthly subscription includes specified quotas for VA tasks, assessments, and AI features. Credits are only required for services exceeding these included quotas. You will never be charged twice for the same service.</p>

        <h2 className="text-xl font-semibold text-white mt-6">10. Affiliate Program</h2>
        <p>Registered users may participate in the affiliate program. Commissions are earned on qualifying referrals and paid upon request after reaching minimum payout thresholds ($50).</p>

        <h2 className="text-xl font-semibold text-white mt-6">11. Prohibited Conduct</h2>
        <p>The following activities are prohibited:</p>
        <ul>
          <li>Creating multiple accounts to exploit free tier benefits</li>
          <li>Scraping or data mining the platform</li>
          <li>Posting fraudulent job listings</li>
          <li>Submitting false skill claims</li>
          <li>Harassing other users</li>
          <li>Attempting to bypass security measures</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">12. Account Suspension & Termination</h2>
        <p>ODUSBABA reserves the right to suspend or terminate accounts that violate these Terms, including creating multiple accounts or abusing free tier benefits.</p>

        <h2 className="text-xl font-semibold text-white mt-6">13. Limitation of Liability</h2>
        <p>ODUSBABA shall not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from use of the platform.</p>

        <h2 className="text-xl font-semibold text-white mt-6">14. AI Disclaimer</h2>
        <p>AI-powered features are for informational purposes only. They do not constitute professional legal, financial, or career advice.</p>

        <h2 className="text-xl font-semibold text-white mt-6">15. Governing Law</h2>
        <p>These terms shall be governed by the laws of the United Kingdom.</p>

        <h2 className="text-xl font-semibold text-white mt-6">16. Changes to Terms</h2>
        <p>ODUSBABA may update these Terms at any time. Continued use of the platform constitutes acceptance of updated Terms.</p>

        <h2 className="text-xl font-semibold text-white mt-6">17. Contact</h2>
        <p>Questions? Contact us at <a href="mailto:support@bluskyeconsult.com" className="text-emerald-400 hover:underline">support@bluskyeconsult.com</a></p>
      </div>
    </div>
  );
}
