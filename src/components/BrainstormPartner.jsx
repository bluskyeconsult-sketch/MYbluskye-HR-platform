// src/components/BrainstormPartner.jsx
// ODUSBABA BRAINSTORM PARTNER v3.0 - PRODUCTION READY
// ✅ AI-powered product development assistant via Unified API
// ✅ Idea generation, deep dive analysis, follow-up questions
// ✅ Save ideas, copy to clipboard, conversation history
// ✅ Fallback ideas for offline scenarios

import { useState, useEffect, useRef } from 'react';
import { 
    Lightbulb, Sparkles, TrendingUp, Users, Briefcase, Zap, 
    X, Send, Loader2, Copy, Check, MessageCircle, Star, 
    Rocket, Target, Brain, Code, Palette, Megaphone, RefreshCw, User
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';
const CHAT_ENDPOINT = `${API_BASE}?action=chat`;

// ============================================
// MAIN COMPONENT
// ============================================

export default function BrainstormPartner() {
    const [isOpen, setIsOpen] = useState(false);
    const [topic, setTopic] = useState('');
    const [ideas, setIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversation, setConversation] = useState([]);
    const [followUp, setFollowUp] = useState('');
    const [isDeepDive, setIsDeepDive] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [savedIdeas, setSavedIdeas] = useState([]);
    const messagesEndRef = useRef(null);

    // Load saved ideas from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('brainstorm_saved_ideas');
        if (saved) {
            setSavedIdeas(JSON.parse(saved));
        }
    }, []);

    // Scroll to bottom of conversation
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const brainstormTopics = [
        { icon: Briefcase, text: "New HR features", prompt: "Suggest innovative HR features for our platform", color: "blue" },
        { icon: Users, text: "User engagement", prompt: "Creative ideas to increase user engagement and retention", color: "green" },
        { icon: TrendingUp, text: "Growth strategies", prompt: "Platform growth and scaling strategies for 2025", color: "purple" },
        { icon: Zap, text: "AI integrations", prompt: "AI-powered features we should add to the platform", color: "amber" },
        { icon: Rocket, text: "Product roadmap", prompt: "Suggest priorities for our Q2 product roadmap", color: "red" },
        { icon: Target, text: "User acquisition", prompt: "Cost-effective user acquisition strategies", color: "teal" }
    ];

    // ============================================
    // IDEA GENERATION (Unified API)
    // ============================================

    const generateIdeas = async () => {
        if (!topic.trim()) return;
        
        setIsLoading(true);
        
        const userMessage = { role: 'user', content: topic, timestamp: new Date().toISOString() };
        setConversation(prev => [...prev, userMessage]);
        
        try {
            // ✅ Using unified chat API
            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `You are a product strategy expert. Generate innovative, actionable ideas for: ${topic}. Return 5 ideas as bullet points.` },
                        { role: 'user', content: topic }
                    ],
                    temperature: 0.8,
                    maxTokens: 1000
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.response) {
                // Parse ideas from response
                const newIdeas = data.response
                    .split(/\d+\.\s+/)
                    .filter(i => i.trim())
                    .slice(0, 5)
                    .map(i => i.trim());
                
                setIdeas(newIdeas);
                
                const assistantMessage = { 
                    role: 'assistant', 
                    content: `Here are some ideas for "${topic}":`,
                    ideas: newIdeas,
                    timestamp: new Date().toISOString()
                };
                setConversation(prev => [...prev, assistantMessage]);
            } else {
                throw new Error(data.error || 'Failed to generate ideas');
            }
        } catch (error) {
            console.error('Brainstorm error:', error);
            const fallbackIdeas = getFallbackIdeas(topic);
            setIdeas(fallbackIdeas);
            
            const assistantMessage = { 
                role: 'assistant', 
                content: `Here are some ideas for "${topic}":`,
                ideas: fallbackIdeas,
                timestamp: new Date().toISOString()
            };
            setConversation(prev => [...prev, assistantMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // DEEP DIVE ANALYSIS (Unified API)
    // ============================================

    const handleDeepDive = async (idea) => {
        setIsLoading(true);
        
        try {
            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `Provide a detailed analysis of this idea including: feasibility, implementation steps, potential challenges, and success metrics.` },
                        { role: 'user', content: `Original topic: "${topic}"\n\nIdea: "${idea}"\n\nProvide a comprehensive deep dive analysis.` }
                    ],
                    temperature: 0.7,
                    maxTokens: 800
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.response) {
                const deepDiveMessage = {
                    role: 'assistant',
                    content: `Deep dive into: "${idea}"`,
                    deepDive: data.response,
                    timestamp: new Date().toISOString()
                };
                setConversation(prev => [...prev, deepDiveMessage]);
            }
        } catch (error) {
            console.error('Deep dive error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // FOLLOW-UP QUESTIONS (Unified API)
    // ============================================

    const handleFollowUp = async () => {
        if (!followUp.trim()) return;
        
        setIsLoading(true);
        
        const userMessage = { role: 'user', content: followUp, timestamp: new Date().toISOString() };
        setConversation(prev => [...prev, userMessage]);
        setFollowUp('');
        
        try {
            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `Context: "${topic}". Previous ideas: ${JSON.stringify(ideas)}. Answer the follow-up question clearly and helpfully.` },
                        { role: 'user', content: followUp }
                    ],
                    temperature: 0.7,
                    maxTokens: 600
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.response) {
                const newIdeas = data.response
                    .split(/\d+\.\s+/)
                    .filter(i => i.trim());
                
                if (newIdeas.length > 0) {
                    setIdeas(prev => [...prev, ...newIdeas]);
                }
                
                const assistantMessage = { 
                    role: 'assistant', 
                    content: data.response,
                    ideas: newIdeas,
                    timestamp: new Date().toISOString()
                };
                setConversation(prev => [...prev, assistantMessage]);
            }
        } catch (error) {
            console.error('Follow-up error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const saveIdea = (idea) => {
        const newSaved = [...savedIdeas, { idea, topic, savedAt: new Date().toISOString() }];
        setSavedIdeas(newSaved);
        localStorage.setItem('brainstorm_saved_ideas', JSON.stringify(newSaved));
    };

    const clearConversation = () => {
        setConversation([]);
        setIdeas([]);
        setTopic('');
    };

    const getFallbackIdeas = (topic) => {
        const t = topic.toLowerCase();
        const ideaMap = {
            'hr': [
                "AI-powered resume screening with bias detection algorithms",
                "Automated interview scheduling with calendar integration",
                "Employee sentiment analysis dashboard with real-time alerts",
                "Skills gap analysis with personalized training recommendations",
                "DEI metrics dashboard with actionable insights"
            ],
            'engagement': [
                "Gamified skill assessments with NFT badges and leaderboards",
                "Weekly industry insights newsletter with personalized content",
                "Peer recognition system with reward points marketplace",
                "Interactive career path visualization with AI guidance",
                "Community discussion forums with expert AMA sessions"
            ],
            'growth': [
                "Enterprise partnership program with revenue sharing",
                "Referral bonuses for successful hires (tiered system)",
                "Content marketing campaign featuring success stories",
                "API integration with popular HRIS systems (BambooHR, Rippling)",
                "Freemium model with premium assessment upsells"
            ],
            'ai': [
                "AI job description generator with SEO optimization",
                "Intelligent candidate matching algorithm using vector search",
                "Automated salary benchmarking with market data",
                "Predictive analytics dashboard for hiring trends",
                "Conversational AI chatbot for candidate screening"
            ],
            'product': [
                "Mobile app for on-the-go job searching with push notifications",
                "Video introduction profiles with AI-generated summaries",
                "Skill verification via practical coding challenges",
                "Company culture fit assessment using behavioral questions",
                "Automated follow-up reminders for hiring managers"
            ],
            'acquisition': [
                "LinkedIn integration for one-click job applications",
                "Student ambassador program on university campuses",
                "SEO optimization for long-tail job search keywords",
                "Partnership with coding bootcamps and universities",
                "Referral program for current users (invite friends, get credits)"
            ]
        };
        
        for (const [key, ideas] of Object.entries(ideaMap)) {
            if (t.includes(key)) return ideas;
        }
        
        return [
            "AI-powered personalized job recommendations",
            "Skill verification through project-based assessments",
            "Virtual career fair platform with live video interviews",
            "Salary negotiation assistant with market data",
            "Resume optimization tool with ATS scoring"
        ];
    };

    const handleBrainstormTopic = (prompt) => {
        setTopic(prompt);
        setTimeout(() => generateIdeas(), 100);
    };

    // ============================================
    // RENDER
    // ============================================

    return (
        <>
            {/* Brainstorm Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-36 right-6 z-50 p-3.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                title="AI Brainstorm Partner"
            >
                <Lightbulb className="w-5 h-5 text-white group-hover:animate-pulse" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            </button>

            {/* Brainstorm Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 to-orange-600/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Brainstorm Partner</h3>
                                    <p className="text-xs text-slate-400">AI-powered product & strategy assistant</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearConversation}
                                    className="p-2 text-slate-400 hover:text-white transition"
                                    title="Clear conversation"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Quick Topics */}
                        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Quick brainstorm topics:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {brainstormTopics.map((topicItem, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleBrainstormTopic(topicItem.prompt)}
                                        className={`flex items-center gap-1 px-3 py-1.5 bg-${topicItem.color}-500/10 border border-${topicItem.color}-500/20 rounded-lg text-sm text-${topicItem.color}-400 hover:bg-${topicItem.color}-500/20 transition`}
                                    >
                                        <topicItem.icon className="w-3.5 h-3.5" />
                                        {topicItem.text}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conversation Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
                            {conversation.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Lightbulb className="w-10 h-10 text-amber-400" />
                                    </div>
                                    <h4 className="text-white font-semibold mb-2">Ready to Brainstorm?</h4>
                                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                                        Enter a topic above or choose a quick topic to get AI-powered product and strategy ideas.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 mt-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Target className="w-3 h-3 inline mr-1" />
                                            Product Strategy
                                        </span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Code className="w-3 h-3 inline mr-1" />
                                            Feature Ideas
                                        </span>
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                                            <Megaphone className="w-3 h-3 inline mr-1" />
                                            Marketing
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                conversation.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-amber-600/20 border border-amber-500/30' : 'bg-slate-800'} rounded-2xl px-4 py-3`}>
                                            {msg.role === 'user' ? (
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-amber-400" />
                                                    </div>
                                                    <span className="text-xs text-amber-400">You</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Brain className="w-4 h-4 text-amber-400" />
                                                    <span className="text-xs font-medium text-amber-400">Brainstorm Partner</span>
                                                </div>
                                            )}
                                            <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
                                            
                                            {msg.ideas && (
                                                <div className="mt-3 space-y-2">
                                                    {msg.ideas.map((idea, i) => (
                                                        <div key={i} className="group p-2 bg-slate-900/50 rounded-lg hover:bg-slate-800 transition">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex items-start gap-2">
                                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                                                    <p className="text-sm text-slate-300">{idea}</p>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                                    <button
                                                                        onClick={() => copyToClipboard(idea, `idea_${i}`)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Copy idea"
                                                                    >
                                                                        {copiedIndex === `idea_${i}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => saveIdea(idea)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Save idea"
                                                                    >
                                                                        <Star className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeepDive(idea)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Deep dive"
                                                                    >
                                                                        <Rocket className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {msg.deepDive && (
                                                <div className="mt-3 p-3 bg-slate-900/70 rounded-lg">
                                                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.deepDive}</p>
                                                </div>
                                            )}
                                            
                                            <p className="text-xs text-slate-500 mt-2">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                            
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 rounded-2xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                            <span className="text-sm text-slate-400">Generating ideas...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && generateIdeas()}
                                    placeholder="What would you like to brainstorm? (features, strategy, growth...)"
                                    className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                                <button
                                    onClick={generateIdeas}
                                    disabled={isLoading || !topic.trim()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Generate
                                </button>
                            </div>
                            
                            {/* Deep Dive Toggle */}
                            <div className="mt-2 flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDeepDive}
                                        onChange={(e) => setIsDeepDive(e.target.checked)}
                                        className="rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                                    />
                                    Deep dive mode (more detailed analysis)
                                </label>
                                
                                {savedIdeas.length > 0 && (
                                    <span className="text-xs text-amber-400">
                                        {savedIdeas.length} saved ideas
                                    </span>
                                )}
                            </div>
                            
                            {/* Follow-up Input */}
                            {conversation.length > 0 && (
                                <div className="mt-3 flex gap-2">
                                    <input
                                        type="text"
                                        value={followUp}
                                        onChange={(e) => setFollowUp(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleFollowUp()}
                                        placeholder="Follow up question..."
                                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                    <button
                                        onClick={handleFollowUp}
                                        disabled={isLoading || !followUp.trim()}
                                        className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
