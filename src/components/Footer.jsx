export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column with Logo */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {/* Logo Image */}
              <img 
                src="/images/BluSkye.png" 
                alt="BluSkye Integrated Consult" 
                className="w-10 h-10 md:w-12 md:h-12 object-contain"
              />
              <div>
                <span className="font-bold text-white">BluSkye Integrated Consult</span>
                <p className="text-xs text-slate-400">powered by <span className="text-emerald-400">ODUSBABA</span> intelligence</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">Creating Value for Partnership</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/jobs" className="text-slate-400 hover:text-white transition-colors">Jobs</a></li>
              <li><a href="/workforce" className="text-slate-400 hover:text-white transition-colors">Workforce</a></li>
              <li><a href="/courses" className="text-slate-400 hover:text-white transition-colors">Courses</a></li>
              <li><a href="/books" className="text-slate-400 hover:text-white transition-colors">Books</a></li>
              <li><a href="/assessments" className="text-slate-400 hover:text-white transition-colors">Assessments</a></li>
              <li><a href="/hire-va" className="text-slate-400 hover:text-white transition-colors">Hire VA</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-bold text-white mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-slate-400 hover:text-white transition-colors">About</a></li>
              <li><a href="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</a></li>
              <li><a href="/pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="/affiliate" className="text-slate-400 hover:text-white transition-colors">Affiliate Program</a></li>
              <li><a href="/newsletter" className="text-slate-400 hover:text-white transition-colors">Newsletter</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-bold text-white mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/legal/terms" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/legal/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="/legal/cookies" className="text-slate-400 hover:text-white transition-colors">Cookie Policy</a></li>
              <li><a href="/legal/disclaimer" className="text-slate-400 hover:text-white transition-colors">AI Disclaimer</a></li>
              <li><a href="/legal/acceptable-use" className="text-slate-400 hover:text-white transition-colors">Acceptable Use</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          <p>© 2026 BluSkye Integrated Consult. All rights reserved. Powered by ODUSBABA Intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
