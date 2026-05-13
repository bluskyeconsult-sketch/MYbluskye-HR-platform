// src/pages/HireVirtualAssistant.jsx
// Complete Virtual Assistant Page

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VIRTUAL_ASSISTANTS, checkVAEligibility, executeVATask, getUserVATasks } from '../services/vaService';
import { Bot, Sparkles, DollarSign, Clock, CheckCircle, Loader2, History, Play, FileText, Briefcase, Users, Award, TrendingUp } from 'lucide-react';

export default function HireVirtualAssistant() {
    const [selectedVA, setSelectedVA] = useState(null);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState(null);
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState(null);
    const [user, setUser] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('assistants');

    useEffect(() => {
        loadUserAndEligibility();
    }, []);

    async function loadUserAndEligibility() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            const eligibilityData = await checkVAEligibility(user.id);
            setEligibility(eligibilityData);
            
            const history = await getUserVATasks(user.id, 10);
            setTaskHistory(history);
        }
    }

    async function handleExecute(e) {
        e.preventDefault();
        if (!input.trim() || !selectedVA) return;
        
        setLoading(true);
        setOutput(null);
        
        try {
            const result = await executeVATask(user.id, selectedVA.id, input);
            setOutput(result.output);
            await loadUserAndEligibility();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    }

    const categories = [
        { id: 'resume', name: 'Resume & CV', icon: FileText, color: 'from-blue-500/20 to-blue-600/20' },
        { id: 'social', name: 'Social Media', icon: Users, color: 'from-purple-500/20 to-purple-600/20' },
        { id: 'interview', name: 'Interview Prep', icon: Briefcase, color: 'from-emerald-500/20 to-emerald-600/20' },
        { id: 'career', name: 'Career Advice', icon: TrendingUp, color: 'from-amber-500/20 to-amber-600/20' },
        { id: 'skills', name: 'Skill Development', icon: Award, color: 'from-cyan-500/20 to-cyan-600/20' }
    ];

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Bot className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Sign in to use Virtual Assistants</h1>
                    <a href="/sign-in" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Sign In</a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
                        <Bot className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 text-sm">AI-Powered Career Assistants</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Hire a Virtual Assistant</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Professional AI helpers for CV optimization, interview prep, salary negotiation, and more.
                    </p>
                </div>

                {/* Eligibility Banner */}
                {eligibility && (
                    <div className={`mb-6 p-3 rounded-lg text-center ${
                        eligibility.remaining > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                        {eligibility.remaining > 0 ? (
                            <p>You have {eligibility.remaining} VA {eligibility.remaining === 1 ? 'task' : 'tasks'} remaining this month.</p>
                        ) : (
                            <p>You've used all {eligibility.limit} VA tasks this month. <a href="/pricing" className="underline">Upgrade to continue</a></p>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-6">
                    <button
                        onClick={() => setActiveTab('assistants')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'assistants' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <Bot className="w-4 h-4 inline mr-1" /> Virtual Assistants
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-sm font-medium transition ${
                            activeTab === 'history' ? 'text-primary-400 border-b-2 border-primary-400' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <History className="w-4 h-4 inline mr-1" /> History
                    </button>
                </div>

                {activeTab === 'assistants' && (
                    <>
                        {/* VA Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {VIRTUAL_ASSISTANTS.map(va => {
                                const category = categories.find(c => c.id === va.category);
                                return (
                                    <div key={va.id} className={`bg-gradient-to-br ${category?.color} border border-slate-700 rounded-xl p-5 hover:-translate-y-1 transition-all cursor-pointer ${selectedVA?.id === va.id ? 'ring-2 ring-primary-500' : ''}`} onClick={() => setSelectedVA(va)}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-3xl">{va.icon}</div>
                                            <div className="text-right">
                                                <p className="text-xl font-bold text-primary-400">${va.price}</p>
                                                <p className="text-xs text-slate-500">per task</p>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{va.name}</h3>
                                        <p className="text-slate-400 text-sm">{va.description}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Task Execution Form */}
                        {selectedVA && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary-400" />
                                    {selectedVA.name}
                                </h3>
                                <form onSubmit={handleExecute} className="space-y-4">
                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        rows={5}
                                        placeholder={`Describe what you need help with...\n\nExample: "I'm applying for a Senior Software Engineer role at Google. Please help optimize my CV."`}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !eligibility?.remaining}
                                        className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        {loading ? 'Processing...' : `Execute Task (${selectedVA.price} credits)`}
                                    </button>
                                </form>
                                
                                {output && (
                                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                                        <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            Result
                                        </h4>
                                        <div className="text-slate-300 whitespace-pre-wrap">{output}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {taskHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                <p>No task history yet.</p>
                                <p className="text-sm">Select a Virtual Assistant to get started.</p>
                            </div>
                        ) : (
                            taskHistory.map(task => {
                                const va = VIRTUAL_ASSISTANTS.find(v => v.id === task.va_id);
                                return (
                                    <div key={task.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{va?.icon || '🤖'}</span>
                                                <h3 className="text-white font-semibold">{va?.name || task.va_id}</h3>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-2 line-clamp-2">{task.input}</p>
                                        {task.output && (
                                            <details className="mt-2">
                                                <summary className="text-primary-400 text-sm cursor-pointer">View Result</summary>
                                                <p className="text-slate-300 text-sm mt-2 whitespace-pre-wrap">{task.output}</p>
                                            </details>
                                        )}
                                        <p className="text-xs text-slate-500 mt-2">{new Date(task.created_at).toLocaleString()}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
