export default function AcceptableUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 prose prose-invert">
        <h1 className="text-3xl font-bold text-white mb-6">Acceptable Use Policy</h1>
        <p className="text-slate-400">Last updated: April 2026</p>
        <h2 className="text-xl font-semibold text-white mt-6">Prohibited Activities</h2>
        <ul className="list-disc list-inside space-y-1 text-slate-300">
          <li>Posting fraudulent or misleading job listings</li>
          <li>Submitting false skill claims or credentials</li>
          <li>Scraping or data mining the platform</li>
          <li>Impersonating another person or entity</li>
          <li>Attempting to bypass security measures</li>
        </ul>
        <h2 className="text-xl font-semibold text-white mt-6">Enforcement</h2>
        <p>Violations may result in account suspension, termination, and reporting to authorities.</p>
      </div>
    </div>
  );
}
