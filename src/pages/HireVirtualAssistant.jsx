// src/pages/HireVirtualAssistant.jsx
// COMPLETE - Integrated with AI Virtual Assistant Service

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Bot, Sparkles, DollarSign, Clock, CheckCircle, 
    Loader2, Star, TrendingUp, Shield, Zap, MessageCircle,
    CreditCard, Play, FileText, Briefcase, Users, Award
} from 'lucide-react';
import { 
    getActiveVirtualAssistants, 
    executeVATask, 
    getVACredits,
    purchaseVACredits 
} from '../services/aiVirtualAssistantService';

export default function HireVirtualAssistant() {
    const [assistants, setAssistants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVA, setSelectedVA] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [input, setInput] = useState('');
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState(null);
    const [credits, setCredits] = useState(0);
    const [user, setUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = [
        { id: 'all', name: 'All', icon: Bot },
        { id: 'resume', name: 'Resume & CV', icon: FileText },
        { id: 'career', name: 'Career Advice', icon: Briefcase },
        { id: 'interview', name: 'Interview Prep', icon: Users },
        { id: 'skill', name: 'Skill Development', icon: TrendingUp },
        { id: 'legal', name: 'Legal & Rights', icon: Shield }
    ];

    useEffect(() => {
        loadUserAndAssistants();
    }, []);

    async function loadUserAndAssistants() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            const creditsData = await getVACredits(user.id);
            setCredits(creditsData.balance);
        }
        
        const vas = await getActiveVirtualAssistants();
        setAssistants(vas);
        setLoading(false);
    }

    async function handleExecute(e) {
        e.preventDefault();
        if (!input.trim()) return;
        
        setExecuting(true);
        setResult(null);
        
        const response = await executeVATask(selectedVA.id, user.id, input);
        
        if (response.success) {
            setResult(response);
            setCredits(response.creditsRemaining);
        } else {
            alert(response.error);
        }
        
        setExecuting(false);
    }

    async function handlePurchaseCredits() {
        const amount = prompt('How many credits would you like to purchase? (10 credits = $9.99)', '10');
        if (amount && parseInt(amount) > 0) {
            await purchaseVACredits(user.id, parseInt(amount));
            const newCredits = await getVACredits(user.id);
            setCredits(newCredits.balance);
            alert(`${amount} credits added successfully!`);
        }
    }

    const filteredAssistants = assistants.filter(va => {
        const matchesSearch = va.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             va.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || va.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Bot className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">24/7 AI-Powered Assistance</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Hire a Virtual Assistant
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        AI-powered experts ready to help with CV optimization, career advice, interview prep, and more.
                    </p>
                </div>

                {/* Credits Display */}
                {user && (
                    <div className="bg-gradient-to-r from-primary-900/20 to-slate-900 rounded-xl p-4 mb-8 flex justify-between items-center border border-primary-500/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm">Your Credits</p>
                                <p className="text-2xl font-bold text-white">{credits}</p>
                            </div>
                        </div>
                        <button
                            onClick={handlePurchaseCredits}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Purchase Credits
                        </button>
                    </div>
                )}

                {!user && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 text-center">
                        <p className="text-amber-400">Sign in to hire Virtual Assistants and track your credits.</p>
                        <a href="/sign-in" className="text-primary-400 hover:underline">Sign In →</a>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search assistants..."
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map(cat => {
                            const Icon = cat.icon;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                                        selectedCategory === cat.id
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 inline mr-1" />
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Virtual Assistants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssistants.map(va => {
                        const CategoryIcon = categories.find(c => c.id === va.category)?.icon || Bot;
                        return (
                            <div key={va.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-primary-500/30 transition-all hover:-translate-y-1 group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition">
                                            <CategoryIcon className="w-6 h-6 text-primary-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{va.name}</h3>
                                            <p className="text-slate-400 text-sm">{va.title}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-primary-400">${va.price}</p>
                                        <p className="text-xs text-slate-500">per task</p>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">{va.description}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {va.features?.slice(0, 3).map((feature, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-800 rounded-full text-xs text-slate-300">
                                            ✓ {feature}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Clock className="w-3 h-3" /> {va.processing_time_minutes} min
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!user) {
                                                window.location.href = '/sign-in';
                                                return;
                                            }
                                            setSelectedVA(va);
                                            setInput('');
                                            setResult(null);
                                            setShowModal(true);
                                        }}
                                        className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition"
                                    >
                                        Hire Now →
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Execution Modal */}
                {showModal && selectedVA && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Bot className="w-5 h-5 text-primary-400" />
                                    {selectedVA.name}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                    ✕
                                </button>
                            </div>
                            
                            <p className="text-slate-400 mb-4">{selectedVA.long_description || selectedVA.description}</p>
                            
                            {!result ? (
                                <form onSubmit={handleExecute} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Your Request</label>
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            rows={5}
                                            placeholder={selectedVA.sample_prompt || "Describe what you need help with..."}
                                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500"
                                            required
                                        />
                                    </div>
                                    <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                                        <p className="text-primary-400 text-sm flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            This task will cost {selectedVA.price} credit(s)
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={executing || credits < selectedVA.price}
                                        className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        {executing ? 'Processing...' : `Execute Task (${selectedVA.price} credits)`}
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            <h3 className="text-white font-semibold">Task Completed!</h3>
                                        </div>
                                        <p className="text-slate-400 text-sm">Quality Score: {result.qualityScore}%</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-lg p-4">
                                        <p className="text-white whitespace-pre-wrap">{result.output}</p>
                                    </div>
                                    <button
                                        onClick={() => { setResult(null); setShowModal(false); }}
                                        className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
