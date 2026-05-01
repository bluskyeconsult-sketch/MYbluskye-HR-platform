{/* News & Articles Section - FIXED LINKS */}
<section className="py-16 px-6">
  <div className="max-w-7xl mx-auto">
    <div className="text-center mb-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">News & Articles</h2>
      <p className="text-slate-400 max-w-2xl mx-auto">Stay informed with the latest insights from ODUSBABA</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Article 1 - FIXED LINK */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
        <div className="text-xs text-slate-500 mb-2">Apr 28, 2026</div>
        <h3 className="text-lg font-semibold text-white mb-2">The Future of AI in HR</h3>
        <p className="text-slate-400 text-sm mb-3">How artificial intelligence is transforming human resources...</p>
        <Link to="/articles/future-of-ai-in-hr" className="text-primary-400 text-sm hover:underline">Read more →</Link>
      </div>
      {/* Article 2 - FIXED LINK */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
        <div className="text-xs text-slate-500 mb-2">Apr 25, 2026</div>
        <h3 className="text-lg font-semibold text-white mb-2">New Employment Laws 2026</h3>
        <p className="text-slate-400 text-sm mb-3">Stay compliant with the latest employment regulations...</p>
        <Link to="/articles/employment-law-changes-2026" className="text-primary-400 text-sm hover:underline">Read more →</Link>
      </div>
      {/* Article 3 - FIXED LINK */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all">
        <div className="text-xs text-slate-500 mb-2">Apr 22, 2026</div>
        <h3 className="text-lg font-semibold text-white mb-2">Skill Trust Score Explained</h3>
        <p className="text-slate-400 text-sm mb-3">Understanding how our verification system builds trust...</p>
        <Link to="/articles/skill-trust-score-explained" className="text-primary-400 text-sm hover:underline">Read more →</Link>
      </div>
    </div>
    <div className="text-center mt-8">
      <Link to="/articles" className="text-primary-400 hover:underline">View all articles →</Link>
    </div>
  </div>
</section>
