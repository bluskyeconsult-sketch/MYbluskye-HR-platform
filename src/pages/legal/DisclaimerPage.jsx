// src/pages/legal/DisclaimerPage.jsx
//
// FIXED (2026-08-16): bg-background replaced with bg-slate-950 (same
// nonstandard class fixed across every other legal page). Expanded with
// specific scope of what "AI-generated content" actually covers on this
// platform, matching real, confirmed features (chat, CV analysis,
// assessment insights, VA tasks) rather than a vague general statement.

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">AI Disclaimer</h1>
        <p className="text-slate-400">Last updated: August 2026</p>

        <h2 className="text-xl font-semibold text-white mt-6">AI-Generated Content</h2>
        <p>ODUSBABA uses AI to power several features on this platform, including the ODUSBABA chat assistant, CV and career document analysis, HR tools (interview simulation, contract review, workplace rights guidance, salary estimates), assessment scoring and insights, and virtual assistant task outputs. All AI-generated content is provided for informational purposes only.</p>

        <h2 className="text-xl font-semibold text-white mt-6">No Professional Advice</h2>
        <p>AI-generated content does not constitute professional legal, financial, medical, or career advice, and should not be relied upon as a substitute for consultation with a qualified professional. Employment law guidance in particular varies significantly by jurisdiction — always verify anything AI-generated against official sources or a qualified employment lawyer before acting on it, especially for decisions with legal or financial consequences.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Accuracy</h2>
        <p>While we aim for AI outputs to be helpful and accurate, AI systems can make mistakes, including generating plausible-sounding but incorrect information. You are responsible for independently verifying any information before relying on it or acting upon it.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Limitation of Liability</h2>
        <p>BluSkye Integrated Consult is not responsible for decisions made or actions taken based on AI-generated recommendations, analysis, or content produced through this platform.</p>

        <h2 className="text-xl font-semibold text-white mt-6">Contact Us</h2>
        <p>Questions about this disclaimer can be sent to <a href="mailto:legal@bluskyeconsult.com" className="text-primary-400 hover:underline">legal@bluskyeconsult.com</a>.</p>
      </div>
    </div>
  );
}
