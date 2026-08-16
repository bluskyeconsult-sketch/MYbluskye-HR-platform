// src/pages/legal/AcceptableUsePage.jsx
//
// FIXED (2026-08-16): bg-background replaced with bg-slate-950. Expanded
// with a more complete, specific list of prohibited activities matching
// this platform's real features (workforce marketplace, VA tasks,
// external job listings) rather than a short generic list.

export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">Acceptable Use Policy</h1>
        <p className="text-slate-400">Last updated: August 2026</p>

        <h2 className="text-xl font-semibold text-white mt-6">Prohibited Activities</h2>
        <p>When using ODUSBABA, you agree not to:</p>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Post fraudulent, misleading, or fake job listings</li>
          <li>Submit false skill claims, credentials, or work history</li>
          <li>Impersonate another person, business, or entity</li>
          <li>Request or offer payment outside the platform in connection with job offers (a common scam pattern — see our Fraud Prevention page)</li>
          <li>Scrape, data-mine, or use automated tools to extract platform content without authorization</li>
          <li>Attempt to bypass rate limits, security measures, or access controls</li>
          <li>Upload malicious code, viruses, or attempt to compromise platform security</li>
          <li>Harass, threaten, or abuse other users</li>
          <li>Use the platform's AI features (chat, virtual assistants, HR tools) to generate content that violates these terms or applicable law</li>
          <li>Create multiple accounts to circumvent usage limits or bans</li>
          <li>Misrepresent your business when submitting employer verification</li>
        </ul>

        <h2 className="text-xl font-semibold text-white mt-6">Reporting Violations</h2>
        <p>If you encounter behavior that violates this policy, please report it through our Fraud Prevention page or by contacting <a href="mailto:security@bluskyeconsult.com" className="text-primary-400 hover:underline">security@bluskyeconsult.com</a>.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Enforcement</h2>
        <p>Violations of this policy may result in content removal, account suspension, or permanent termination, at our discretion. Serious violations, including fraud, may be reported to relevant law enforcement authorities.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Contact Us</h2>
        <p>Questions about this policy can be sent to <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400 hover:underline">legal@bluskyeconsult.com</a>.</p>
      </div>
    </div>
  );
}
