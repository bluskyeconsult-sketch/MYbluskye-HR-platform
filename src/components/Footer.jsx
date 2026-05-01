export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="font-bold text-white">BluSkye Integrated Consult</span>
            </div>
            <p className="text-sm text-slate-400">powered by <span className="text-emerald-400">ODUSBABA</span> intelligence</p>
            <p className="text-xs text-slate-500 mt-2">Creating Value for Partnership</p>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/jobs" className="text-slate-400 hover:text-white">Jobs</a></li>
              <li><a href="/workforce" className="text-slate-400 hover:text-white">Workforce</a></li>
              <li><a href="/courses" className="text-slate-400 hover:text-white">Courses</a></li>
              <li><a href="/books" className="text-slate-400 hover:text-white">Books</a></li>
              <li><a href="/assessments" className="text-slate-400 hover:text-white">Assessments</a></li>
              <li><a href="/hire-va" className="text-slate-400 hover:text-white">Hire VA</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-slate-400 hover:text-white">About</a></li>
              <li><a href="/contact" className="text-slate-400 hover:text-white">Contact</a></li>
              <li><a href="/pricing" className="text-slate-400 hover:text-white">Pricing</a></li>
              <li><a href="/affiliate" className="text-slate-400 hover:text-white">Affiliate</a></li>
              <li><a href="/newsletter" className="text-slate-400 hover:text-white">Newsletter</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/legal/terms" className="text-slate-400 hover:text-white">Terms of Service</a></li>
              <li><a href="/legal/privacy" className="text-slate-400 hover:text-white">Privacy Policy</a></li>
              <li><a href="/legal/cookies" className="text-slate-400 hover:text-white">Cookie Policy</a></li>
              <li><a href="/legal/disclaimer" className="text-slate-400 hover:text-white">AI Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          <p>© 2026 BluSkye Integrated Consult. All rights reserved. Powered by ODUSBABA Intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
