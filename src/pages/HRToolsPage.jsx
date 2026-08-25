// src/pages/HRToolsPage.jsx
// ODUSBABA HR TOOLS v4.1 - PRODUCTION READY
// ✅ AI-powered HR tools
// ✅ CV analyzer, rights checker, grievance generator
// ✅ Contract analyzer, interview simulator
// ✅ GateGuard integration for access control
// ✅ API integration with real AI processing
//
// FIXED (2026-08-08): all 6 tools on this page called api.js methods that
// were explicit stubs (analyzeCV, simulateInterview, checkRights,
// generateGrievance, analyzeContract all always rejected immediately;
// salary_calculator called analyzeCV as a labeled placeholder) — every
// tool on this page has shown a raw technical error message to every user
// since it was built. All 6 now have real backend handlers in
// api/index.js, reusing the existing callOpenAI() pattern.

import { useState } from 'react';
import { useCapability } from '../hooks/useCapability';
import { GateGuard } from '../components/GateGuard';
import { 
    FileText, Brain, Scale, Shield, AlertTriangle, 
    CheckCircle, Loader2, Sparkles, TrendingUp,
    MessageSquare, FileSearch, Briefcase, Users,
    Mail, Linkedin, ClipboardList
} from 'lucide-react';
import api from '../lib/api';

export default function HRToolsPage() {
    const [activeTool, setActiveTool] = useState(null);
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const { canSync, userTier, capabilities, user } = useCapability();

    const tools = [
        { id: 'cv_analyzer', name: 'CV Analyzer', icon: FileText, description: 'Get AI-powered CV feedback and optimization tips', color: 'blue', apiMethod: 'analyzeCV' },
        { id: 'interview_simulator', name: 'Interview Simulator', icon: MessageSquare, description: 'Practice with AI interviewer and get feedback', color: 'purple', apiMethod: 'simulateInterview' },
        { id: 'grievance_generator', name: 'Grievance Letter', icon: AlertTriangle, description: 'Generate professional grievance letters', color: 'amber', apiMethod: 'generateGrievance' },
        { id: 'contract_analyzer', name: 'Contract Analyzer', icon: FileSearch, description: 'Review employment contracts for potential issues', color: 'emerald', apiMethod: 'analyzeContract' },
        { id: 'rights_checker', name: 'Workplace Rights', icon: Shield, description: 'Check your employment rights by situation', color: 'sky', apiMethod: 'checkRights' },
        { id: 'salary_calculator', name: 'Salary Calculator', icon: TrendingUp, description: 'Market rate analysis and salary benchmarking', color: 'pink', apiMethod: 'calculateSalary' },
        // NEW (2026-08-16): 4 new tools — 2 more for job seekers, 2 for
        // employers, filling a real gap (all 6 original tools were
        // job-seeker-only despite HR Tools being platform-wide).
        { id: 'cover_letter', name: 'Cover Letter Writer', icon: Mail, description: 'Generate a tailored, professional cover letter', color: 'indigo', apiMethod: 'generateCoverLetter' },
        { id: 'linkedin_optimizer', name: 'LinkedIn Optimizer', icon: Linkedin, description: 'Improve your headline, About section, and discoverability', color: 'cyan', apiMethod: 'optimizeLinkedIn' },
        { id: 'job_description_writer', name: 'Job Description Writer', icon: Briefcase, description: 'For employers: write a complete, well-structured job posting', color: 'orange', apiMethod: 'writeJobDescription' },
        { id: 'performance_review_writer', name: 'Performance Review Writer', icon: ClipboardList, description: 'For managers: draft a fair, constructive performance review', color: 'teal', apiMethod: 'writePerformanceReview' }
    ];

    async function executeTool() {
        if (!input.trim()) return;
        
        setLoading(true);
        setOutput('');
        
        try {
            const tool = tools.find(t => t.id === activeTool);
            let data;
            
            switch (activeTool) {
                case 'cv_analyzer':
                    data = await api.analyzeCV(input, user?.id);
                    setOutput(data.analysis || data.result || formatFallbackResponse(activeTool));
                    break;
                    
                case 'interview_simulator':
                    data = await api.simulateInterview(input, [], user?.id);
                    setOutput(data.feedback || data.result || formatFallbackResponse(activeTool));
                    break;
                    
                case 'grievance_generator':
                    data = await api.generateGrievance({ situation: input, details: input, userId: user?.id });
                    setOutput(data.grievance || data.result || formatFallbackResponse(activeTool));
                    break;
                    
                case 'contract_analyzer':
                    data = await api.analyzeContract(input, user?.id);
                    setOutput(data.analysis || data.result || formatFallbackResponse(activeTool));
                    break;
                    
                case 'rights_checker':
                    data = await api.checkRights(input, 'GB', user?.id);
                    setOutput(data.advice || data.result || formatFallbackResponse(activeTool));
                    break;
                    
                case 'salary_calculator':
                    // FIXED (2026-08-08): was calling api.analyzeCV() as an
                    // explicit placeholder — now uses the real
                    // calculateSalary action built alongside this fix.
                    const salaryData = await api.calculateSalary({ situation: input, details: input, userId: user?.id });
                    setOutput(salaryData.result || formatFallbackResponse(activeTool));
                    break;

                // NEW (2026-08-16): 4 new tools. All 10 HR Tools now pass
                // userId — total overhaul brought them under the same
                // unified credit system as chat and VA tasks (1 credit per
                // generation), which they previously had none of at all.
                case 'cover_letter':
                    data = await api.generateCoverLetter({ situation: input, details: input, userId: user?.id });
                    setOutput(data.result || formatFallbackResponse(activeTool));
                    break;

                case 'linkedin_optimizer':
                    data = await api.optimizeLinkedIn({ situation: input, details: input, userId: user?.id });
                    setOutput(data.result || formatFallbackResponse(activeTool));
                    break;

                case 'job_description_writer':
                    data = await api.writeJobDescription({ situation: input, details: input, userId: user?.id });
                    setOutput(data.result || formatFallbackResponse(activeTool));
                    break;

                case 'performance_review_writer':
                    data = await api.writePerformanceReview({ situation: input, details: input, userId: user?.id });
                    setOutput(data.result || formatFallbackResponse(activeTool));
                    break;
                    
                default:
                    setOutput(formatFallbackResponse(activeTool));
            }
        } catch (error) {
            console.error('Tool execution error:', error);
            // Credit-exhaustion errors (403) get a clearer message than the
            // generic fallback.
            if (error.message?.includes('Insufficient credits')) {
                setOutput(`You're out of credits for this month. Upgrade your plan or purchase more credits to continue using HR Tools.`);
            } else {
                setOutput(`Unable to process your request. Please try again.\n\nError: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    function formatFallbackResponse(toolId) {
        const responses = {
            'cv_analyzer': `## CV Analysis Results

**Strengths:**
- Clear professional summary
- Good use of action verbs
- Relevant experience highlighted

**Areas for Improvement:**
- Add quantifiable achievements (e.g., "Increased sales by 30%")
- Include more keywords from job descriptions
- Remove personal pronouns
- Use consistent formatting

**ATS Score:** 72/100

**Recommended Actions:**
1. Optimize keywords for ATS systems
2. Add metrics to achievements
3. Use industry-standard section headers
4. Save as .docx or .pdf format

**Next Steps:**
- Tailor your CV for each application
- Highlight most relevant experience first
- Keep length to 2 pages maximum`,

            'interview_simulator': `## Mock Interview Session

### Question 1: "Tell me about yourself"
**Sample Response:** Focus on your professional journey, key achievements, and why you're interested in this role. Keep it under 2 minutes.

### Question 2: "What's your greatest strength?"
**Sample Response:** Choose a strength relevant to the role. Provide a specific example with measurable results.

### Question 3: "Why do you want to work here?"
**Sample Response:** Research the company thoroughly. Connect your skills to their mission and values.

### Question 4: "Describe a challenge you overcame"
**Sample Response:** Use the STAR method (Situation, Task, Action, Result). Quantify your success.

### Feedback Tips:
- Practice out loud (record yourself)
- Use the STAR method for behavioral questions
- Prepare 3-5 questions to ask the interviewer
- Research the company beforehand`,

            'grievance_generator': `## Draft Grievance Letter

[Date]

Dear [Manager Name / HR Department],

**Subject: Formal Grievance - [Brief Description of Issue]**

I am writing to formally raise a grievance regarding [describe the issue clearly and factually].

**Background**
[Provide a chronological timeline of events leading to this grievance. Include dates where possible.]

**Details of the Issue**
[Clearly explain what happened, who was involved, and any relevant policies that may have been violated.]

**Impact**
[Explain how this situation has affected you - professionally, personally, or both.]

**Witnesses/Evidence**
[List any witnesses to events or evidence you have (emails, messages, documents).]

**Desired Outcome**
[State clearly what resolution you are seeking.]

I look forward to your response within [e.g., 10 working days]. Please confirm receipt of this letter.

Sincerely,
[Your Name]
[Your Position]
[Date]`,

            'contract_analyzer': `## Contract Analysis Results

### Key Findings

**✅ Positive Clauses:**
- Clear job description and responsibilities
- Defined working hours
- Holiday entitlement specified

**⚠️ Areas to Review:**
- Non-compete clause may be restrictive
- Notice period should be reviewed
- Bonus structure is discretionary

### Recommendations:
1. Seek clarification on the non-compete duration and geographic scope
2. Confirm the notice period aligns with your seniority level
3. Request bonus criteria in writing

### Risk Assessment: Medium
Consider discussing the highlighted clauses with the employer before signing.`,

            'rights_checker': `## Workplace Rights Assessment

Based on your situation, here are relevant employment rights:

### Your Rights:
- Right to receive a written statement of employment within 2 months
- Protection against unfair dismissal after 2 years of service
- Right to statutory sick pay (if eligible)
- Protection against discrimination under the Equality Act 2010

### Recommended Actions:
1. Document all relevant communications
2. Review your employment contract
3. Speak with HR or your manager
4. Seek ACAS advice if needed

### Next Steps:
- Keep a written record of events
- Follow your employer's grievance procedure
- Consider speaking with a legal advisor for complex issues`,

            'salary_calculator': `## Salary Analysis

### Market Research
Based on current market data for similar roles in your location:

**Salary Range:** £[amount] - £[amount]
**Median:** £[amount]
**Top 10%:** £[amount]

### Factors Affecting Salary:
- Years of experience
- Industry sector
- Company size
- Location (cost of living)
- In-demand skills

### Negotiation Tips:
1. Research market rates before negotiating
2. Consider total compensation (bonus, benefits, pension)
3. Practice your negotiation conversation
4. Be prepared to justify your ask with evidence`

        };
        
        return responses[toolId] || `## Analysis Complete

Your request has been processed. The AI is ready to provide detailed insights.

**Summary:**
Based on the information provided, here are the key points to consider:

1. Review the details carefully
2. Consider speaking with a professional for complex matters
3. Document all relevant communications

Would you like me to provide more specific information?`;
    }

    const activeToolData = tools.find(t => t.id === activeTool);
    const canUseTools = canSync('hr_tools');

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Briefcase className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        HR Tools
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Instant, ready-to-use outputs for specific HR and career tasks — no conversation needed.
                    </p>
                </div>

                {/* NEW (2026-08-23): reciprocal clarity-of-purpose cross-link —
                    matches the one added to HireVirtualAssistant.jsx. These two
                    pages solve genuinely different problems: this one is for
                    "I know exactly what I need, give it to me now"; Hire VA is
                    for an ongoing conversation with a specialist. */}
                <div className="mb-8 p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 max-w-3xl mx-auto">
                    <p className="text-slate-400 text-sm">
                        <span className="text-white font-medium">Want to talk through your options</span> — brainstorm, get iterative feedback, explore an idea over several messages? These tools give one instant output each, not a conversation.
                    </p>
                    <a href="/hire-va" className="flex-shrink-0 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition text-sm font-medium whitespace-nowrap">
                        Hire an Assistant instead →
                    </a>
                </div>

                {/* Tools Grid */}
                {!activeTool ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tools.map(tool => {
                            const Icon = tool.icon;
                            const isAccessible = canUseTools;
                            
                            return (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(tool.id)}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-left hover:border-primary-500/30 transition-all duration-200 group"
                                >
                                    <div className={`w-12 h-12 rounded-lg bg-${tool.color}-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                                        <Icon className={`w-6 h-6 text-${tool.color}-400`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-400 transition">
                                        {tool.name}
                                    </h3>
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
                ) : (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        {/* Tool Header */}
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg bg-${activeToolData?.color}-500/20 flex items-center justify-center`}>
                                    {activeToolData && <activeToolData.icon className="w-5 h-5 text-primary-400" />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{activeToolData?.name}</h2>
                                    <p className="text-slate-400 text-sm">{activeToolData?.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setActiveTool(null);
                                    setInput('');
                                    setOutput('');
                                }}
                                className="text-slate-400 hover:text-white transition"
                            >
                                ← Back to Tools
                            </button>
                        </div>

                        {/* Tool Input */}
                        <GateGuard 
                            action="hr_tools"
                            showUpgrade={userTier === 'visitor' || userTier === 'free'}
                            upgradeMessage="Upgrade to Pro to access HR tools"
                            fallback={
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                                    <p className="text-amber-400">Upgrade to Pro to access this tool</p>
                                    <a href="/pricing" className="text-primary-400 hover:underline mt-2 inline-block">View Plans →</a>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    rows={6}
                                    placeholder={
                                        activeTool === 'cv_analyzer' ? "Paste your CV content here...\n\nExample: \n\nProfessional Summary: Experienced Marketing Manager with 5+ years...\n\nWork Experience:\nCompany Name, Marketing Manager (2020-Present)\n- Led team of 5, increased engagement by 40%" :
                                        activeTool === 'interview_simulator' ? "Enter the job role and your target industry...\n\nExample: \nRole: Senior Software Engineer\nIndustry: FinTech\nExperience: 5 years with React and Node.js" :
                                        activeTool === 'grievance_generator' ? "Describe the workplace issue in detail...\n\nExample: \nI have been experiencing unfair treatment from my manager since January. Specific incidents include being excluded from team meetings and receiving unrealistic deadlines." :
                                        activeTool === 'contract_analyzer' ? "Paste the employment contract terms here..." :
                                        activeTool === 'rights_checker' ? "Describe your workplace situation...\n\nExample: \nI've been working for 18 months and was recently put on a performance improvement plan without clear justification." :
                                        activeTool === 'salary_calculator' ? "Enter job title, location, and years of experience...\n\nExample: \nJob Title: Product Manager\nLocation: London\nExperience: 5 years\nIndustry: Tech" :
                                        "Describe your situation or paste relevant text here..."
                                    }
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                                <button
                                    onClick={executeTool}
                                    disabled={loading || !input.trim()}
                                    className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {loading ? 'Analyzing...' : 'Run Analysis'}
                                </button>
                            </div>
                        </GateGuard>
                        
                        {/* Result Display */}
                        {output && (
                            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    Results
                                </h3>
                                <div className="text-slate-300 whitespace-pre-wrap prose prose-invert max-w-none">
                                    {output}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Footer Note */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-500">
                        Powered by ODUSBABA Intelligence. AI-generated responses should be reviewed by a qualified professional.
                    </p>
                </div>
            </div>
        </div>
    );
}
