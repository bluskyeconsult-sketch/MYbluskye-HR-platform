export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm">
        <p>© 2026 BluSkye Consult. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="/legal/terms" className="hover:text-white">Terms</a>
          <a href="/legal/privacy" className="hover:text-white">Privacy</a>
          <a href="/legal/cookies" className="hover:text-white">Cookies</a>
        </div>
      </div>
    </footer>
  );
}
