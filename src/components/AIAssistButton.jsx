// src/components/AIAssistButton.jsx
import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAssistButton({ onGenerated, fields }) {
  const [isOpen, setIsOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);

  const generateContent = async () => {
    if (!idea.trim()) {
      toast.error('Please describe your idea first');
      return;
    }

    setLoading(true);
    
    // Simulate AI generation - In production, call your AI API
    setTimeout(() => {
      const generatedData = {};
      
      if (fields.includes('title')) {
        generatedData.title = idea.split(' ').slice(0, 5).join(' ') + ' Course';
      }
      if (fields.includes('description')) {
        generatedData.description = `This comprehensive ${idea} course covers everything you need to know. Learn from industry experts and gain practical skills.`;
      }
      if (fields.includes('level')) {
        generatedData.level = 'beginner';
      }
      if (fields.includes('duration')) {
        generatedData.duration_minutes = 60;
      }
      if (fields.includes('price')) {
        generatedData.price = 0;
      }
      if (fields.includes('company')) {
        generatedData.company = idea.split(' ').slice(0, 2).join(' ') + ' Inc';
      }
      if (fields.includes('location')) {
        generatedData.location = 'Remote';
      }
      
      onGenerated(generatedData);
      toast.success('AI generated content successfully!');
      setIsOpen(false);
      setIdea('');
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        AI Assist
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI Content Generator
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Describe what you want to create, and AI will fill the form for you.
            </p>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g., Create a beginner-friendly course about Python programming for data science..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={generateContent}
                disabled={loading}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
