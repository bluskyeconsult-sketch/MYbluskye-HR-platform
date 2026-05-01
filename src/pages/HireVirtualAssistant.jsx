import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Clock, DollarSign, TrendingUp, Briefcase, FileText, PenTool, Sparkles } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HireVirtualAssistant() {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadAssistants();
  }, []);

  async function loadAssistants() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('virtual_assistants')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setAssistants(data || []);
    } catch (err) {
      console.error('Error loading VAs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    { value: 'all', label: 'All', icon: Sparkles },
    { value: 'career', label: 'Career', icon: Briefcase },
    { value: 'resume', label: 'Resume', icon: FileText },
    { value: 'writing', label: 'Writing', icon: PenTool },
  ];

  const filteredAssistants = selectedCategory === 'all'
    ? assistants
    : assistants.filter(a => a.category === selectedCategory);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Error Loading Virtual Assistants</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Virtual Assistants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Hire Virtual Assistant</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            AI-powered task execution with human-like quality and delivery
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          {categories.map(cat => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-5 py-2 rounded-full flex items-center gap-2 transition-all ${
                selectedCategory === cat.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-6 text-right">
          <p className="text-sm text-slate-400">Showing {filteredAssistants.length} Virtual Assistants</p>
        </div>

        {/* VA Grid */}
        {filteredAssistants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400">No Virtual Assistants found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssistants.map(va => (
              <div key={va.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-1">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white text-lg">{va.name}</h3>
                      <p className="text-xs text-slate-400">{va.specialty}</p>
                    </div>
                    {va.is_trending && (
                      <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Trending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{va.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{va.delivery_minutes} min</span>
                      <span className="flex items-center gap-1">⭐ {va.qa_score}% QA</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-400">${va.price}</div>
                  </div>
                  <button 
                    onClick={() => alert(`Hiring ${va.name} - This feature will be fully implemented with payment system.`)}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Hire Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State Notice */}
        {filteredAssistants.length === 0 && assistants.length === 0 && (
          <div className="mt-12 p-6 bg-slate-900/50 border border-slate-800 rounded-xl text-center">
            <p className="text-slate-400">No Virtual Assistants available. Please check back later.</p>
            <p className="text-xs text-slate-500 mt-2">Make sure the database has virtual_assistants records.</p>
          </div>
        )}
      </div>
    </div>
  );
}
