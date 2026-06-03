// src/App.jsx - MINIMAL TEST VERSION
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function HomePage() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-white mb-4">ODUSBABA</h1>
                <p className="text-slate-400">If you can see this, React is working!</p>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
