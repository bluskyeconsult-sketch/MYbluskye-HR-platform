import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, DollarSign, TrendingUp, Briefcase, FileText, PenTool, 
  Sparkles, Star, Shield, Zap, Filter, Search, ChevronRight,
  AlertCircle, CheckCircle, MessageCircle, Calendar, Award,
  Code, Music, Video, ShoppingCart, Heart, Eye, ExternalLink
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HireVirtualAssistant() {
  const [assistants, setAssistants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('price_asc'); // price_asc, price_desc, rating, trending
  const [showHireModal, setShowHireModal] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [hireLoading, setHireLoading] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadAssistants();
  }, []);

  async function loadAssistants() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('virtual_assistants')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setAssistants(data || []);
    } catch (err) {
      console.error('Error loading VAs:', err);
      setError(err.message || 'Failed to load virtual assistants');
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => [
    { value: 'all', label: 'All VAs', icon: Sparkles, color: 'purple' },
    { value: 'career', label: 'Career', icon: Briefcase, color: 'blue' },
    { value: 'resume', label: 'Resume', icon: FileText, color: 'green' },
    { value: 'writing', label: 'Writing', icon: PenTool, color: 'amber' },
    { value: 'coding', label: 'Coding', icon: Code, color: 'indigo' },
    { value: 'design', label: 'Design', icon: Video, color: 'pink' },
    { value: 'business', label: 'Business', icon: Briefcase, color: 'emerald' },
  ], []);

  const sortOptions = [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'trending', label: 'Trending First' },
    { value: 'delivery', label: 'Fastest Delivery' },
  ];

  // Filter and sort assistants
  const filteredAndSortedAssistants = useMemo(() => {
    let filtered = selectedCategory === 'all'
      ? assistants
      : assistants.filter(a => a.category === selectedCategory);
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(va => 
        va.name.toLowerCase().includes(term) ||
        va.description.toLowerCase().includes(term) ||
        va.specialty?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.qa_score || 0) - (a.qa_score || 0));
        break;
      case 'trending':
        filtered.sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0));
        break;
      case 'delivery':
        filtered.sort((a, b) => (a.delivery_minutes || 999) - (b.delivery_minutes || 999));
        break;
      default:
        break;
    }
    
    return filtered;
  }, [assistants, selectedCategory, searchTerm, sortBy]);

  const handleHireClick = (assistant) => {
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Show login modal or redirect
        if (confirm('Please log in to hire a Virtual Assistant. Go to login page?')) {
          navigate('/sign-in', { state: { from: '/hire-va', assistantId: assistant.id } });
        }
      } else {
        setSelectedAssistant(assistant);
        setShowHireModal(true);
      }
    });
  };

  const handleConfirmHire = async () => {
    setHireLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please log in to continue');
      }
      
      // Create hire request in database
      const { error: hireError } = await supabase
        .from('va_hiring_requests')
        .insert({
          assistant_id: selectedAssistant.id,
          user_id: session.user.id,
          status: 'pending',
          price: selectedAssistant.price,
          hired_at: new Date().toISOString()
        });
      
      if (hireError) throw hireError;
      
      setHireSuccess(true);
      setTimeout(() => {
        setShowHireModal(false);
        setHireSuccess(false);
        setSelectedAssistant(null);
        // Navigate to dashboard or show success message
        navigate('/dashboard', { state: { message: 'Virtual Assistant hired successfully!' } });
      }, 2000);
      
    } catch (err) {
      console.error('Hire error:', err);
      alert(err.message || 'Failed to hire. Please try again.');
    } finally {
      setHireLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.color || 'slate';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading Virtual Assistants...</p>
          <p className="text-xs text-slate-600 mt-2">Finding the best AI talent for you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Assistants</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={loadAssistants} 
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-purple-600/10" />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-sm mb-4">
              <Zap className="w-4 h-4" />
              AI-Powered Workforce
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Hire Virtual Assistant
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              AI-powered task execution with human-like quality and delivery. Get things done faster.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialty, or skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    selectedCategory === cat.value
                      ? `bg-${cat.color}-600 text-white shadow-lg shadow-${cat.color}-600/20`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </button>
              ))}
            </div>
            
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-400">
            Showing {filteredAndSortedAssistants.length} of {assistants.length} Virtual Assistants
          </p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* VA Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {filteredAndSortedAssistants.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Virtual Assistants Found</h3>
            <p className="text-slate-400 mb-4">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search term.`
                : 'No assistants available in this category yet.'}
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
              }}
              className="text-emerald-400 hover:text-emerald-300"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedAssistants.map(va => (
              <div 
                key={va.id} 
                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-2 duration-300"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg mb-1">{va.name}</h3>
                      <p className="text-xs text-emerald-400">{va.specialty || 'AI Specialist'}</p>
                    </div>
                    <div className="flex gap-1">
                      {va.is_trending && (
                        <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Trending
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{va.description}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap gap-3 text-slate-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {va.delivery_minutes || 30} min
                      </span>
                      {va.qa_score && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {va.qa_score}% QA
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                    <div className="text-xl font-bold text-emerald-400">
                      {formatPrice(va.price || 29)}
                    </div>
                  </div>
                  
                  {/* Skills/Tags */}
                  {va.skills && va.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {va.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleHireClick(va)}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Hire Now
                    </button>
                    <button 
                      onClick={() => navigate(`/va/${va.id}`)}
                      className="py-2.5 px-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hire Modal */}
      {showHireModal && selectedAssistant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
            {hireSuccess ? (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Hired Successfully!</h3>
                <p className="text-slate-400 mb-4">
                  You've hired {selectedAssistant.name}. You'll be redirected to your dashboard.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-2">Confirm Hire</h3>
                <p className="text-slate-400 mb-4">
                  You're about to hire <span className="text-emerald-400 font-semibold">{selectedAssistant.name}</span>
                </p>
                
                <div className="bg-slate-800 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Service Fee:</span>
                    <span className="text-white">{formatPrice(selectedAssistant.price || 29)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-400">Platform Fee:</span>
                    <span className="text-white">$0.00</span>
                  </div>
                  <div className="border-t border-slate-700 my-2 pt-2 flex justify-between font-bold">
                    <span className="text-white">Total:</span>
                    <span className="text-emerald-400">{formatPrice(selectedAssistant.price || 29)}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowHireModal(false)}
                    className="flex-1 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmHire}
                    disabled={hireLoading}
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {hireLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Confirm Hire
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feature Notice */}
      <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-600/10 to-purple-600/10 border border-emerald-500/20 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-400">
            🔒 All payments are secured and processed through our platform. 
            Your satisfaction is guaranteed with our 7-day trial period.
          </p>
        </div>
      </div>
    </div>
  );
}
