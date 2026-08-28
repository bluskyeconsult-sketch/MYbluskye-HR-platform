// src/pages/UserSkills.jsx
// COMPLETE PROFESSIONAL USER SKILLS - With unified API, categories, verification status, and trust scoring
//
// FIXED (2026-08-23): disconnected Supabase client (createClient() directly)
// — same anti-pattern found and fixed repeatedly this session. Now uses
// the shared singleton.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Code, Award, CheckCircle, XCircle, Clock, Plus, X,
    TrendingUp, Shield, Star, Filter, Search, Loader2,
    AlertCircle, Briefcase, Brain, Database, Brush, BarChart,
    MessageCircle, Users, Zap, Sparkles, Trash2, Edit
} from 'lucide-react';

// Skill categories with icons
const SKILL_CATEGORIES = [
    { id: 'technical', name: 'Technical', icon: Code, color: 'blue' },
    { id: 'soft', name: 'Soft Skills', icon: Users, color: 'emerald' },
    { id: 'leadership', name: 'Leadership', icon: Briefcase, color: 'purple' },
    { id: 'creative', name: 'Creative', icon: Brush, color: 'pink' },
    { id: 'analytical', name: 'Analytical', icon: BarChart, color: 'amber' },
    { id: 'communication', name: 'Communication', icon: MessageCircle, color: 'cyan' },
    { id: 'management', name: 'Management', icon: Users, color: 'indigo' },
    { id: 'ai', name: 'AI & ML', icon: Brain, color: 'fuchsia' },
    { id: 'data', name: 'Data Science', icon: Database, color: 'teal' }
];

export default function UserSkills() {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingSkill, setEditingSkill] = useState(null);
    const [newSkill, setNewSkill] = useState({ 
        skill_name: '', 
        category: '', 
        years_experience: 0,
        proficiency_level: 'intermediate'
    });
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const proficiencyLevels = [
        { id: 'beginner', label: 'Beginner', value: 1, color: 'bg-slate-500/20 text-slate-400' },
        { id: 'intermediate', label: 'Intermediate', value: 2, color: 'bg-blue-500/20 text-blue-400' },
        { id: 'advanced', label: 'Advanced', value: 3, color: 'bg-emerald-500/20 text-emerald-400' },
        { id: 'expert', label: 'Expert', value: 4, color: 'bg-purple-500/20 text-purple-400' }
    ];

    useEffect(() => {
        loadSkills();
    }, []);

    useEffect(() => {
        // Auto-clear success messages
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    async function loadSkills() {
        try {
            setLoading(true);
            setError(null);
            
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                navigate('/sign-in?redirect=/skills');
                return;
            }
            
            // ✅ Using unified API endpoint
            // FIXED (2026-08-28): confirmed same regression -
            // real Authorization header now required.
            const { data: { session: sessionForAuth } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=user-skills', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionForAuth?.access_token ? { 'Authorization': `Bearer ${sessionForAuth.access_token}` } : {})
                },
                body: JSON.stringify({ userId: user.id })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setSkills(result.data || []);
            
        } catch (err) {
            console.error('Error loading skills:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function submitSkill() {
        if (!newSkill.skill_name.trim()) {
            setError('Please enter a skill name');
            return;
        }
        
        if (!newSkill.category) {
            setError('Please select a category');
            return;
        }
        
        setSubmitting(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // FIXED (2026-08-28): confirmed same regression -
            // real Authorization header now required.
            const { data: { session: sessionForAuth } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=user-skill-add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionForAuth?.access_token ? { 'Authorization': `Bearer ${sessionForAuth.access_token}` } : {})
                },
                body: JSON.stringify({
                    userId: user.id,
                    skill: {
                        skill_name: newSkill.skill_name,
                        category: newSkill.category,
                        years_experience: newSkill.years_experience,
                        proficiency_level: newSkill.proficiency_level,
                        verification_status: 'pending'
                    }
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadSkills();
            resetForm();
            setShowForm(false);
            
        } catch (err) {
            console.error('Error adding skill:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function updateSkill() {
        if (!editingSkill) return;
        
        setSubmitting(true);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // FIXED (2026-08-28): confirmed same regression -
            // real Authorization header now required.
            const { data: { session: sessionForAuth } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=user-skill-update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionForAuth?.access_token ? { 'Authorization': `Bearer ${sessionForAuth.access_token}` } : {})
                },
                body: JSON.stringify({
                    userId: user.id,
                    skillId: editingSkill.id,
                    updates: {
                        skill_name: editingSkill.skill_name,
                        category: editingSkill.category,
                        years_experience: editingSkill.years_experience,
                        proficiency_level: editingSkill.proficiency_level
                    }
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadSkills();
            setEditingSkill(null);
            
        } catch (err) {
            console.error('Error updating skill:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteSkill(skillId) {
        if (!confirm('Are you sure you want to remove this skill?')) return;
        
        setDeleting(skillId);
        setError(null);
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // FIXED (2026-08-28): confirmed same regression -
            // real Authorization header now required.
            const { data: { session: sessionForAuth } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=user-skill-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionForAuth?.access_token ? { 'Authorization': `Bearer ${sessionForAuth.access_token}` } : {})
                },
                body: JSON.stringify({
                    userId: user.id,
                    skillId: skillId
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            await loadSkills();
            
        } catch (err) {
            console.error('Error deleting skill:', err);
            setError(err.message);
        } finally {
            setDeleting(null);
        }
    }

    function resetForm() {
        setNewSkill({ 
            skill_name: '', 
            category: '', 
            years_experience: 0,
            proficiency_level: 'intermediate'
        });
    }

    function getProficiencyBadge(level) {
        const prof = proficiencyLevels.find(p => p.id === level) || proficiencyLevels[1];
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${prof.color}`}>
                <Star className="w-3 h-3" />
                {prof.label}
            </span>
        );
    }

    function getVerificationBadge(status) {
        const config = {
            verified: { label: 'Verified', color: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle },
            pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-400', icon: Clock },
            rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400', icon: XCircle }
        };
        
        const { label, color, icon: Icon } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${color}`}>
                <Icon className="w-3 h-3" />
                {label}
            </span>
        );
    }

    function getCategoryIcon(categoryId) {
        const cat = SKILL_CATEGORIES.find(c => c.id === categoryId);
        if (!cat) return Code;
        return cat.icon;
    }

    // Filter skills
    const filteredSkills = skills.filter(skill => {
        const matchesCategory = filterCategory === 'all' || skill.category === filterCategory;
        const matchesSearch = searchQuery === '' || 
            skill.skill_name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Calculate stats
    const stats = {
        total: skills.length,
        verified: skills.filter(s => s.verification_status === 'verified').length,
        pending: skills.filter(s => s.verification_status === 'pending').length,
        totalExperience: skills.reduce((sum, s) => sum + (s.years_experience || 0), 0)
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">My Skills</h1>
                        <p className="text-slate-400">Manage and showcase your professional skills</p>
                    </div>
                    <button 
                        onClick={() => setShowForm(true)} 
                        className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Skill
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs text-slate-400">Total Skills</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-emerald-400">{stats.verified}</div>
                        <div className="text-xs text-slate-400">Verified</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
                        <div className="text-xs text-slate-400">Pending</div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
                        <div className="text-2xl font-bold text-primary-400">{stats.totalExperience}</div>
                        <div className="text-xs text-slate-400">Years Exp.</div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search skills..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setFilterCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                                filterCategory === 'all'
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            All
                        </button>
                        {SKILL_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setFilterCategory(cat.id)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
                                    filterCategory === cat.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <cat.icon className="w-3 h-3" />
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Skills List */}
                {filteredSkills.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                        {skills.length === 0 ? (
                            <>
                                <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Skills Added Yet</h3>
                                <p className="text-slate-400 mb-6">Add your professional skills to get verified and increase your trust score.</p>
                                <button 
                                    onClick={() => setShowForm(true)} 
                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Your First Skill
                                </button>
                            </>
                        ) : (
                            <>
                                <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">No Matching Skills</h3>
                                <p className="text-slate-400 mb-6">
                                    No skills match "{searchQuery}" or the selected category.
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterCategory('all');
                                    }}
                                    className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredSkills.map((skill) => {
                            const CategoryIcon = getCategoryIcon(skill.category);
                            return (
                                <div 
                                    key={skill.id} 
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all duration-200 group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                                                <CategoryIcon className="w-5 h-5 text-primary-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition">
                                                    {skill.skill_name}
                                                </h3>
                                                <p className="text-xs text-slate-400 capitalize">{skill.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingSkill(skill)}
                                                className="p-1.5 text-slate-500 hover:text-white transition"
                                                title="Edit skill"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteSkill(skill.id)}
                                                disabled={deleting === skill.id}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition disabled:opacity-50"
                                                title="Delete skill"
                                            >
                                                {deleting === skill.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Experience</span>
                                            <span className="text-sm text-white font-medium">{skill.years_experience} years</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                                            <div 
                                                className="bg-primary-500 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, (skill.years_experience / 20) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
                                        {getProficiencyBadge(skill.proficiency_level)}
                                        {getVerificationBadge(skill.verification_status)}
                                        {skill.trust_score > 0 && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                <Shield className="w-3 h-3" />
                                                Trust Score: {skill.trust_score}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Skills count summary */}
                {filteredSkills.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">
                            Showing {filteredSkills.length} of {skills.length} skills
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Skill Modal */}
            {(showForm || editingSkill) && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {editingSkill ? 'Edit Skill' : 'Add New Skill'}
                            </h2>
                            <button 
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingSkill(null);
                                    resetForm();
                                }}
                                className="text-slate-400 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Skill Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., React.js, Project Management, Python"
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={editingSkill ? editingSkill.skill_name : newSkill.skill_name}
                                    onChange={(e) => {
                                        if (editingSkill) {
                                            setEditingSkill({...editingSkill, skill_name: e.target.value});
                                        } else {
                                            setNewSkill({...newSkill, skill_name: e.target.value});
                                        }
                                    }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={editingSkill ? editingSkill.category : newSkill.category}
                                    onChange={(e) => {
                                        if (editingSkill) {
                                            setEditingSkill({...editingSkill, category: e.target.value});
                                        } else {
                                            setNewSkill({...newSkill, category: e.target.value});
                                        }
                                    }}
                                >
                                    <option value="">Select category</option>
                                    {SKILL_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    step="0.5"
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={editingSkill ? editingSkill.years_experience : newSkill.years_experience}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (editingSkill) {
                                            setEditingSkill({...editingSkill, years_experience: value});
                                        } else {
                                            setNewSkill({...newSkill, years_experience: value});
                                        }
                                    }}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Proficiency Level</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {proficiencyLevels.map(level => (
                                        <button
                                            key={level.id}
                                            type="button"
                                            onClick={() => {
                                                if (editingSkill) {
                                                    setEditingSkill({...editingSkill, proficiency_level: level.id});
                                                } else {
                                                    setNewSkill({...newSkill, proficiency_level: level.id});
                                                }
                                            }}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                                (editingSkill ? editingSkill.proficiency_level : newSkill.proficiency_level) === level.id
                                                    ? `${level.color} border border-current`
                                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {level.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={editingSkill ? updateSkill : submitSkill}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    {submitting ? 'Saving...' : (editingSkill ? 'Update Skill' : 'Add Skill')}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingSkill(null);
                                        resetForm();
                                    }}
                                    className="flex-1 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
