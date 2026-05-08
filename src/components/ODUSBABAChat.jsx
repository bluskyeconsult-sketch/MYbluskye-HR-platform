// src/components/ODUSBABAChat.jsx
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Briefcase, FileText, Award, TrendingUp, Users, Zap, Loader2 } from 'lucide-react';
import { aiChat } from '../services/aiService';

export default function ODUSBABAChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hello! I\'m your ODUSBABA Career Advisor. I provide personalised guidance based on your unique profile and goals.\n\nWhat would you like to focus on today? I can help with career planning, resume optimisation, skill development, job search strategy, interview preparation, and more.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole');
    if (storedRole) setUserRole(storedRole);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const suggestedActions = [
    { icon: Briefcase, text: "Career Path Planning", action: "Help me plan my career path based on my skills" },
    { icon: FileText, text: "Resume Review", action: "Can you review my resume and provide suggestions?" },
    { icon: Award, text: "Skill Gap Analysis", action: "Identify my skill gaps and recommend learning paths" },
    { icon: TrendingUp, text: "Job Search Strategy", action: "Help me find jobs that match my profile" },
    { icon: Users, text: "Interview Prep", action: "Generate interview questions for my target role" },
    { icon: Zap, text: "Salary Guidance", action: "What salary should I expect for my role and location?" }
  ];

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const reply = await aiChat(input, { userRole, page: window.location.pathname });
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologise, but I\'m having trouble connecting right now. Please try again in a moment, or email support@bluskyeconsult.com for immediate assistance.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    setInput(action);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-gradient-to-r from-primary-600/20 to-purple-600/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">ODUSBABA Career Advisor</h3>
                <p className="text-xs text-slate-400">Personalised AI guidance • Available 24/7</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? <Bot className="w-3 h-3 text-primary-400" /> : <User className="w-3 h-3 text-slate-400" />}
                    <span className="text-xs opacity-70">{msg.role === 'assistant' ? 'Career Advisor' : 'You'}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                  <span className="text-xs text-slate-400 ml-2">Analysing your request...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          {messages.length <= 2 && (
            <div className="p-3 border-t border-slate-800 bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-2">Based on your profile, here are personalised actions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedAction(action.action)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-700 transition"
                  >
                    <action.icon className="w-3 h-3" />
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask your career advisor..."
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
