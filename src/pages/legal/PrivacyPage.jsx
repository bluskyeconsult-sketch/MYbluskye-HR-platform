export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-slate-400">Last updated: May 1, 2026</p>

        <h2 className="text-xl font-semibold text-white mt-6">1. Information We Collect</h2>
        <p>We collect information you provide directly to us, including:</p>
        <ul>
          <li>Name, email address, and password (account information)</li>
          <li>Professional information (CV, job history, skills, certifications)</li>
          <li>Payment information (processed securely by Stripe)</li>
          <li>Assessment results and VA task inputs/outputs</li>
          <li>Usage data (pages visited, features used, time spent)</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process your VA tasks and assessments</li>
          <li>Send job alerts and newsletters (you may opt out)</li>
          <li>Calculate trust scores and skill verification</li>
          <li>Prevent abuse (including multiple account detection)</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">3. Data Retention</h2>
        <p>We retain your data as follows:</p>
        <ul>
          <li>CV files: deleted 30 days after upload</li>
          <li>VA task outputs: available for download for 7 days</li>
          <li>Assessment results: retained permanently in your profile</li>
          <li>Chat logs: retained for 90 days</li>
          <li>Account data: retained until account deletion</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">4. Your Rights (GDPR)</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Rectify inaccurate data</li>
          <li>Request deletion of your data (account deletion)</li>
          <li>Restrict or object to processing</li>
          <li>Data portability</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">5. Data Security</h2>
        <p>We implement technical and organizational measures to protect your data, including encryption at rest and in transit, access controls, and regular security audits.</p>

        <h2 className="text-xl font-semibold text-white mt-6">6. Cookies</h2>
        <p>We use essential cookies for authentication and functional cookies for preferences. See our <a href="/legal/cookies" className="text-emerald-400 hover:underline">Cookie Policy</a> for details.</p>

        <h2 className="text-xl font-semibold text-white mt-6">7. Contact Us</h2>
        <p>For privacy questions, email <a href="mailto:privacy@bluskyeconsult.com" className="text-emerald-400 hover:underline">privacy@bluskyeconsult.com</a></p>
      </div>
    </div>
  );
}
