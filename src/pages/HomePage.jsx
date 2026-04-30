export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-white mb-4">ODUSBABA</h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto">
          The Governed Workforce Platform. Verified skills. Trusted hiring.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a href="/jobs" className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-500 transition-colors">
            Browse Jobs
          </a>
          <a href="/workforce" className="bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors">
            Workforce Market
          </a>
        </div>
      </div>
    </div>
  );
}
