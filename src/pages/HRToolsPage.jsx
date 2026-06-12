// src/pages/HRToolsPage.jsx - COMPLETE
import { useState } from 'react';
import { useCapability } from '../hooks/useCapability';
import { GateGuard } from '../components/GateGuard';
import { 
    FileText, Brain, Scale, Shield, AlertTriangle, 
    CheckCircle, Loader2, Sparkles, TrendingUp
} from 'lucide-react';

export default function HRToolsPage() {
    const [activeTool, setActiveTool] = useState(null);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const { canSync } = useCapability();

    const tools = [
        { id: 'cv-analyzer', name: 'CV Analyzer', icon: FileText, description: 'Get AI-powered CV feedback', color: 'blue' },
        { id: 'interview-simulator', name: 'Interview Simulator', icon: Brain, description: 'Practice with AI interviewer', color: 'purple' },
        { id: 'grievance-generator', name: 'Grievance Letter', icon: AlertTriangle, description: 'Generate professional grievance letters', color: 'amber' },
        { id: 'contract-analyzer', name: 'Contract Analyzer', icon: Scale, description: 'Review employment contracts', color: 'emerald' },
        { id: 'rights-checker', name: 'Workplace Rights', icon: Shield, description: 'Check your employment rights', color: 'sky' },
        { id: 'salary-calculator', name: 'Salary Calculator', icon: TrendingUp, description: 'Market rate analysis', color: 'pink' }
    ];

    async function executeTool() {
        if (!input.trim()) return;
        
        setLoading(true);
        setOutput('');
        
        // Simulate AI processing
        setTimeout(() => {
            const responses = {
                'cv-analyzer': `## CV Analysis Results

**Strengths:**
- Clear professional summary
- Good use of action verbs
- Relevant experience highlighted

**Areas for Improvement:**
- Add quantifiable achievements (e.g., "Increased sales by 30%")
- Include more keywords from job descriptions
- Remove personal pronouns

**ATS Score:** 72/100
**Recommended Actions:** Optimize keywords and add metrics.`,
                
                'interview-simulator': `## Mock Interview Session

**Question 1:** "Tell me about yourself"
> Focus on professional background and key achievements. Keep it under 2 minutes.

**Question 2:** "What's your greatest strength?"
> Align with job requirements. Provide specific examples.

**Question 3:** "Why do you want to work here?"
> Research the company. Connect your skills to their needs.

**Feedback:** Practice more concise answers. Use STAR method for behavioral questions.`,
                
                'grievance-generator': `## Draft Grievance Letter

[Date]

Dear [Manager Name],

**Subject: Formal Grievance - [Issue Description]**

I am writing to formally raise a grievance regarding [describe the issue].

**Background**
[Provide factual timeline of events]

**Impact**
[Explain how this has affected you]

**Desired Outcome**
[State what resolution you seek]

I look forward to your response within [timeframe].

Sincerely,
[Your Name]`
            };
            
            setOutput(responses[activeTool] || 'Tool output will appear here');
            setLoading(false);
        }, 2000);
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">HR Tools</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Professional tools powered by ODUSBABA intelligence
                    </p>
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {tools.map((tool) => {
                        const Icon = tool.icon;
                        const isAccessible = canSync('execute_va');
                        
                        return (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={`p-4 rounded-xl border transition-all text-left ${
                                    activeTool === tool.id
                                        ? `bg-${tool.color}-500/10 border-${tool.color}-500/30`
                                        : 'bg-slate-900/50 border-slate-800 hover:border-primary-500/30'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <Icon className={`w-6 h-6 text-${tool.color}-400`} />
                                    <h3 className="text-white font-semibold">{tool.name}</h3>
                                </div>
                                <p className="text-slate-400 text-sm">{tool.description}</p>
                                {!isAccessible && (
                                    <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" /> Pro feature
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tool Interface */}
                {activeTool && (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {tools.find(t => t.id === activeTool)?.name}
                        </h2>
                        
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                            placeholder="Describe your situation or paste your CV/contract here..."
                        />
                        
                        <GateGuard action="execute_va" requireAuth={true}>
                            <button
                                onClick={executeTool}
                                disabled={loading || !input.trim()}
                                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {loading ? 'Analyzing...' : 'Run Analysis'}
                            </button>
                        </GateGuard>
                        
                        {output && (
                            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    Results
                                </h3>
                                <div className="text-slate-300 whitespace-pre-wrap">{output}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
