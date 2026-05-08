// src/components/BrainstormPartner.jsx
import { useState } from 'react';
import { Lightbulb, Sparkles, TrendingUp, Users, Briefcase, Zap, X, Send, Loader2 } from 'lucide-react';

export default function BrainstormPartner() {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const brainstormTopics = [
    { icon: Briefcase, text: "New HR features", prompt: "Suggest new HR features for our platform" },
    { icon: Users, text: "User engagement", prompt: "Ideas to increase user engagement" },
    { icon: TrendingUp, text: "Growth strategies", prompt: "Platform growth strategies" },
    { icon: Zap, text: "AI integrations", prompt: "AI features we should add" }
  ];

  const generateIdeas = async () => {
    if (!topic.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai-brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      
      if (response.ok) {
        const data = await response.json();
        setIdeas(data.ideas);
      } else {
        // Fallback ideas
        const fallbackIdeas = getFallbackIdeas(topic);
        setIdeas(fallbackIdeas);
      }
    } catch (error) {
      const fallbackIdeas = getFallbackIdeas(topic);
      setIdeas(fallbackIdeas);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackIdeas = (topic) => {
    const t = topic.toLowerCase();
    if (t.includes('hr') || t.includes('feature')) {
      return [
        "AI-powered resume screening with bias detection",
        "Automated interview scheduling system",
        "Employee sentiment analysis dashboard",
        "Skills gap analysis and training recommendations",
        "DEI metrics and reporting tools"
      ];
    } else if (t.includes('engagement')) {
      return [
        "Gamified skill assessments with badges",
        "Weekly industry insights newsletter",
        "Peer recognition and reward system",
        "Interactive career path visualization",
        "Community discussion forums"
      ];
    } else if (t.includes('growth')) {
      return [
        "Enterprise partnership program",
        "Referral bonuses for successful hires",
        "Content marketing with success stories",
        "API integration with popular HRIS systems",
        "Freemium model with premium assessments"
      ];
    } else if (t.includes('ai')) {
      return [
        "AI job description generator",
        "Intelligent candidate matching algorithm",
        "Automated salary benchmarking",
        "Predictive analytics for hiring trends",
        "Chatbot for candidate screening"
      ];
    } else {
      return [
        "Mobile app for on-the-go job searching",
        "Video introduction profiles for candidates",
        "Skill verification via practical tests",
        "Company culture fit assessment",
        "Automated follow-up reminders"
      ];
    }
  };

  const handleBrainstormTopic = (prompt) => {
    setTopic(prompt);
    setTimeout(() => generateIdeas(), 100);
  };

  return (
    <>
      {/* Brainstorm Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <Lightbulb className="w-5 h-5 text-white group-hover:animate-pulse" />
      </button>

      {/* Brainstorm Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-amber-600/20 to-orange-600/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Brainstorm Partner</h3>
                  <p className="text-xs text-slate-400">AI-powered product development assistant</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Topics */}
            <div className="p-4 border-b border-slate-800">
              <p className="text-xs text-slate-400 mb-2">Quick brainstorm topics:</p>
              <div className="flex flex-wrap gap-2">
                {brainstormTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleBrainstormTopic(topic.prompt)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition"
                  >
                    <topic.icon className="w-3.5 h-3.5" />
                    {topic.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-b border-slate-800">
              <label className="block text-sm font-medium text-slate-300 mb-2">What would you like to brainstorm?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., New features for job seekers..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={generateIdeas}
                  disabled={isLoading || !topic.trim()}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Generate
                </button>
              </div>
            </div>

            {/* Ideas Results */}
            {ideas.length > 0 && (
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="font-medium text-white">Generated Ideas</h4>
                </div>
                <ul className="space-y-2">
                  {ideas.map((idea, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg">
                      <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty State */}
            {ideas.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">Enter a topic to start brainstorming</p>
                <p className="text-xs text-slate-500 mt-1">Get AI-powered product development ideas</p>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-3" />
                <p className="text-slate-400">Generating ideas...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
