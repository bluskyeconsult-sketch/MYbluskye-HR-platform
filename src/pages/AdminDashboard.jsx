// src/pages/AdminDashboard.jsx
// ADD THESE QUICK ACTION BUTTONS

// Add to your existing quick actions section
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    <Link to="/admin/assessments" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <ClipboardList className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">Assessments</span>
    </Link>
    <Link to="/admin/virtual-assistants" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <Bot className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">Virtual Asst</span>
    </Link>
    <Link to="/admin/newsletter" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <Mail className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">Newsletter</span>
    </Link>
    <Link to="/admin/knowledge-sources" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <Database className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">AI Sources</span>
    </Link>
    <Link to="/admin/books" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <BookOpen className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">Books</span>
    </Link>
    <Link to="/admin/ai-course-builder" className="bg-slate-800 hover:bg-slate-700 rounded-xl p-4 text-center transition">
        <Sparkles className="w-6 h-6 text-primary-400 mx-auto mb-2" />
        <span className="text-white text-sm">AI Course</span>
    </Link>
</div>

// Also add stats for new features
<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-sm">Virtual Assistants</p>
        <p className="text-2xl font-bold text-white">{vaCount || 24}</p>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-sm">Active Assessments</p>
        <p className="text-2xl font-bold text-white">{assessmentCount || 7}</p>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-sm">Newsletter Subscribers</p>
        <p className="text-2xl font-bold text-white">{subscriberCount || 0}</p>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <p className="text-slate-400 text-sm">AI Knowledge Sources</p>
        <p className="text-2xl font-bold text-white">{knowledgeSources || 11}</p>
    </div>
</div>
