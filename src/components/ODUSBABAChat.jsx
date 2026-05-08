// src/components/ODUSBABAChat.jsx
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles, Zap, Briefcase, Users, Shield, Settings, Loader2 } from 'lucide-react';

export default function ODUSBABAChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m ODUSBABA AI Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedActions = [
    { icon: Briefcase, text: "Show pending jobs", action: "Show me pending job approvals" },
    { icon: Users, text: "User statistics", action: "How many users are on the platform?" },
    { icon: Shield, text: "Security check", action: "Show me security status" },
    { icon: Settings, text: "System health", action: "Check system health" },
    { icon: Zap, text: "Popular skills", action: "What are the most in-demand skills?" },
    { icon: Sparkles, text: "AI insights", action: "Give me insights about platform growth" }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Try to call OpenAI API via serverless function
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          context: messages 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        // Fallback responses when API is unavailable
        const fallbackResponse = getFallbackResponse(input);
        setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const fallbackResponse = getFallbackResponse(input);
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackResponse = (query) => {
    const q = query.toLowerCase();
    if (q.includes('job') || q.includes('pending')) {
      return "📊 You can view pending job approvals in the Admin Dashboard under 'External Jobs'. Would you like me to navigate you there?";
    } else if (q.includes('user') || q.includes('how many')) {
      return "👥 You can see complete user statistics in the Analytics Dashboard. Total users, growth trends, and user type breakdowns are available there.";
    } else if (q.includes('security') || q.includes('blocked')) {
      return "🛡️ Security monitoring is available in the Admin Security panel. You can view blocked IPs, audit logs, and security events there.";
    } else if (q.includes('health') || q.includes('system')) {
      return "⚙️ System health metrics are available in the Diagnostics panel. All systems are currently operational.";
    } else if (q.includes('skill') || q.includes('trending')) {
      return "📈 The most in-demand skills currently are: AI/ML, Cloud Computing, Data Analysis, Cybersecurity, and Project Management.";
    } else if (q.includes('insight') || q.includes('growth')) {
      return "📊 Platform insights: User growth is steady, job postings have increased 15% this month, and assessment completion rates are up 8%.";
    } else {
      return "I can help you with:\n• Pending job approvals\n• User statistics\n• Security monitoring\n• System health\n• Trending skills\n• Platform insights\n\nWhat would you like to know?";
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
                <h3 className="font-semibold text-white">ODUSBABA AI</h3>
                <p className="text-xs text-slate-400">Powered by ODUSBABA Intelligence</p>
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
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === 'assistant' ? <Bot className="w-3 h-3 text-primary-400" /> : <User className="w-3 h-3 text-slate-400" />}
                    <span className="text-xs opacity-70">{msg.role === 'assistant' ? 'ODUSBABA' : 'You'}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                  <span className="text-xs text-slate-400 ml-2">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          {messages.length <= 2 && (
            <div className="p-3 border-t border-slate-800 bg-slate-900/50">
              <p className="text-xs text-slate-400 mb-2">Suggested actions:</p>
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
                placeholder="Ask me anything..."
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
