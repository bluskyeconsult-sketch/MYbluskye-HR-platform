// src/App.jsx - INTERMEDIATE TEST VERSION
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';

// Simple ScrollToTop (working version)
function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
}

// Simple Navbar (temporary)
function Navbar() {
    return (
        <nav className="bg-slate-900 border-b border-slate-800 p-4">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <span className="text-white font-bold">ODUSBABA</span>
                <div className="flex gap-4">
                    <a href="/" className="text-slate-300 hover:text-white">Home</a>
                    <a href="/jobs" className="text-slate-300 hover:text-white">Jobs</a>
                </div>
            </div>
        </nav>
    );
}

// Simple Footer
function Footer() {
    return (
        <footer className="bg-slate-900 border-t border-slate-800 p-4 text-center">
            <p className="text-slate-400 text-sm">© 2024 ODUSBABA. All rights reserved.</p>
        </footer>
    );
}

// Loading component
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
    </div>
);

// Lazy loaded pages
const HomePage = lazy(() => import('./pages/HomePage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));

function AppContent() {
    const location = useLocation();
    
    return (
        <>
            <ScrollToTop />
            <Navbar />
            <main className="min-h-screen bg-slate-950">
                <Suspense fallback={<PageLoader />}>
                    <Routes location={location} key={location.pathname}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/jobs" element={<JobsPage />} />
                    </Routes>
                </Suspense>
            </main>
            <Footer />
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
