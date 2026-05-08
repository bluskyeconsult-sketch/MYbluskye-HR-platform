// src/components/AIAssistButton.jsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Loader2, X, Lightbulb, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function AIAssistButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { user, tier, permissions } = useAuth();

  const getContextualHelp = () => {
    const path = location.pathname;
    if (path === '/jobs') return "I can help you search for jobs, filter by country, or find remote positions. What kind of job are you looking for?";
    if (path === '/courses') return "I can help you find courses based on your career goals. What skills would you like to develop?";
    if (path === '/assessments') return "I can recommend assessments based on your career path. Would you like to take a skills assessment?";
    if (path === '/hire-va') return "I can help you find the right Virtual Assistant for your needs. What tasks do you need help with?";
    if (path.includes('/admin')) return "I'm your admin assistant. I can help you moderate jobs, manage users, or review reports.";
    if (path === '/dashboard') return `Welcome back! You're on the ${tier} plan. I can help you track your applications or find new opportunities.`;
    return "I'm your ODUSBABA AI assistant. How can I help you today?";
  };

  const generateResponse = async () => {
    if (!query.trim()) return;
    if (!user) {
      toast.error('Please sign in to use AI Assist');
      return;
    }
    if (!permissions.canUseAIAssist) {
      toast.error(`AI Assist is available on ${tier === 'free' ? 'Registered' : 'Professional'} plans and above. Upgrade to access.`);
      return;
    }

    setLoading(true);
    
    // Simulated AI response - In production, call OpenAI API
    setTimeout(() => {
      let aiResponse = '';
      const q = query.toLowerCase();
      
      if (q.includes('job') || q.includes('work')) {
        aiResponse = "Based on your profile, I recommend focusing on roles that match your skills. Here are some tips:\n\n📌 Update your resume with keywords from job descriptions\n📌 Set up job alerts for your target roles\n📌 Complete relevant assessments to showcase your skills\n\nWould you like me to search for jobs matching your profile?";
      } else if (q.includes('course') || q.includes('learn')) {
        aiResponse = "To advance your career, I recommend these learning paths:\n\n🎓 Complete foundational assessments first\n📚 Take courses in your target skill area\n🏆 Earn certificates to validate your knowledge\n\nBased on market trends, skills in AI, Cloud, and Data Science are in high demand.";
      } else if (q.includes('resume') || q.includes('cv')) {
        aiResponse = "Here's how to optimize your resume:\n\n✅ Use action verbs (Led, Developed, Implemented)\n✅ Quantify achievements (Increased efficiency by 30%)\n✅ Include relevant keywords from job descriptions\n✅ Keep format clean and ATS-friendly\n\nWould you like me to analyze your resume?";
      } else if (q.includes('interview')) {
        aiResponse = "Interview preparation tips:\n\n📝 Research the company thoroughly\n🎯 Prepare STAR method answers for behavioral questions\n❓ Have 3-5 thoughtful questions ready\n💪 Practice with our interview simulator\n\nWould you like me to generate sample interview questions for your target role?";
      } else {
        aiResponse = `I can help you with:\n\n🔍 Finding jobs matching your skills\n📚 Discovering relevant courses\n📊 Taking skills assessments\n🤖 Hiring Virtual Assistants\n📄 Optimizing your resume\n🎯 Preparing for interviews\n\nWhat would you like help with today?`;
      }
      
      setResponse(aiResponse);
      setLoading(false);
    }, 1500);
  };

  if (!permissions.canUseAIAssist && !user) {
    return null;
  }

  return (
    <>
      {/* Floating AI Assist Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-40 p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group hover:scale-110"
      >
        <Sparkles className="w-5 h-5 text-white group-hover:animate-pulse" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
      </button>

      {/* AI Assist Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg mx-4 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">ODUSBABA AI Assistant</h3>
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">{tier}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contextual Help */}
            <div className="p-4 bg-slate-800/30 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>{getContextualHelp()}</span>
              </div>
            </div>

            {/* Response Area */}
            {response && (
              <div className="p-4 bg-slate-800/20 border-b border-slate-800">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 mt-0.5" />
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{response}</p>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && generateResponse()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={generateResponse}
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Ask
                </button>
              </div>
              {!permissions.canUseAIAssist && (
                <p className="text-xs text-slate-500 mt-2">
                  Upgrade to Professional for unlimited AI assistance
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
