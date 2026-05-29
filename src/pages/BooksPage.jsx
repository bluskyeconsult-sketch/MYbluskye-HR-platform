// src/pages/BooksPage.jsx
// PROFESSIONAL BOOK STORE PAGE - With API integration, search, filters, and Supabase fallback

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    BookOpen, Search, Filter, Star, ShoppingCart, 
    Loader2, AlertCircle, TrendingUp, Award,
    Globe, Users, Brain, Zap, Shield, Sparkles,
    ChevronRight, Heart, Eye, Truck, CreditCard
} from 'lucide-react';

export default function BooksPage() {
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('title');
    const [user, setUser] = useState(null);

    const categories = [
        { id: 'all', name: 'All Books', icon: BookOpen },
        { id: 'hr-strategy', name: 'HR Strategy', icon: TrendingUp },
        { id: 'ai-ethics', name: 'AI & Ethics', icon: Brain },
        { id: 'recruitment', name: 'Recruitment', icon: Users },
        { id: 'leadership', name: 'Leadership', icon: Award },
        { id: 'future-work', name: 'Future of Work', icon: Globe },
        { id: 'productivity', name: 'Productivity', icon: Zap },
        { id: 'compliance', name: 'Compliance', icon: Shield }
    ];

    useEffect(() => {
        checkUser();
        loadBooks();
    }, []);

    useEffect(() => {
        filterAndSortBooks();
    }, [books, searchQuery, selectedCategory, sortBy]);

    async function checkUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadBooks() {
        try {
            setLoading(true);
            setError(null);
            
            let booksData = [];
            
            // Try API first
            try {
                const response = await fetch('/api/index?action=books-list', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        booksData = result.data;
                    } else if (result.books) {
                        booksData = result.books;
                    }
                }
            } catch (apiError) {
                console.warn('API fetch failed, falling back to Supabase:', apiError);
            }
            
            // Fallback to Supabase if API fails or returns no data
            if (booksData.length === 0) {
                const { data, error: supabaseError } = await supabase
                    .from('books')
                    .select('*')
                    .eq('is_published', true)
                    .order('created_at', { ascending: false });
                
                if (supabaseError) throw supabaseError;
                booksData = data || [];
            }
            
            // Use mock data if both API and Supabase return nothing
            if (booksData.length === 0) {
                booksData = MOCK_BOOKS;
            }
            
            setBooks(booksData);
            setFilteredBooks(booksData);
            
        } catch (err) {
            console.error('Error loading books:', err);
            setError(err.message);
            setBooks(MOCK_BOOKS);
            setFilteredBooks(MOCK_BOOKS);
        } finally {
            setLoading(false);
        }
    }

    function filterAndSortBooks() {
        let filtered = [...books];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(book => 
                book.title?.toLowerCase().includes(query) ||
                book.author?.toLowerCase().includes(query) ||
                book.description?.toLowerCase().includes(query)
            );
        }
        
        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(book => book.category === selectedCategory);
        }
        
        // Sorting
        filtered.sort((a, b) => {
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            } else if (sortBy === 'price_asc') {
                return (a.price || 0) - (b.price || 0);
            } else if (sortBy === 'price_desc') {
                return (b.price || 0) - (a.price || 0);
            } else if (sortBy === 'rating') {
                return (b.rating || 0) - (a.rating || 0);
            } else if (sortBy === 'newest') {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
            return 0;
        });
        
        setFilteredBooks(filtered);
    }

    function getStarRating(rating) {
        const stars = [];
        const fullStars = Math.floor(rating || 0);
        const hasHalfStar = (rating || 0) % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push(<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />);
        }
        if (hasHalfStar) {
            stars.push(<Star key="half" className="w-4 h-4 fill-amber-400/50 text-amber-400" />);
        }
        const remaining = 5 - stars.length;
        for (let i = 0; i < remaining; i++) {
            stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-slate-600" />);
        }
        return stars;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Professional Books Library
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Essential reads for HR professionals, leaders, and career-driven individuals
                    </p>
                </div>

                {/* Search and Filter Bar */}
                <div className="flex flex-col lg:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, author, or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <cat.icon className="w-4 h-4" />
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="title">Sort by Title</option>
                        <option value="newest">Newest First</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="rating">Sort by Rating</option>
                    </select>
                </div>

                {/* Results Count */}
                <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
                    <p className="text-slate-400 text-sm">
                        Showing <span className="text-white font-medium">{filteredBooks.length}</span> books
                    </p>
                    {(searchQuery || selectedCategory !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            className="text-sm text-primary-400 hover:text-primary-300 transition"
                        >
                            Clear all filters
                        </button>
                    )}
                </div>

                {/* Books Grid */}
                {filteredBooks.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No books found</h3>
                        <p className="text-slate-400">
                            {books.length === 0 
                                ? 'No books are currently available. Please check back soon.'
                                : `No books match "${searchQuery}" or the selected category.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredBooks.map(book => (
                            <div 
                                key={book.id} 
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1"
                            >
                                {/* Book Cover Placeholder */}
                                <div className="relative h-48 bg-gradient-to-br from-primary-500/20 to-sky-500/20 flex items-center justify-center">
                                    <BookOpen className="w-16 h-16 text-primary-400/50 group-hover:scale-110 transition-transform duration-300" />
                                    {book.rating && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-slate-900/80 rounded-lg backdrop-blur-sm">
                                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                            <span className="text-xs text-white font-medium">{book.rating}</span>
                                        </div>
                                    )}
                                    {book.is_bestseller && (
                                        <div className="absolute top-3 left-3 px-2 py-1 bg-amber-500/90 rounded-lg">
                                            <span className="text-xs text-white font-semibold">Bestseller</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 group-hover:text-primary-400 transition">
                                        {book.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-2">by {book.author}</p>
                                    
                                    <div className="flex items-center gap-1 mb-3">
                                        {getStarRating(book.rating)}
                                        <span className="text-xs text-slate-500 ml-1">({book.reviews || 0})</span>
                                    </div>
                                    
                                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                                        {book.description || 'Essential reading for HR professionals and career-driven individuals.'}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-2xl font-bold text-primary-400">
                                                ${(book.price || 29.99).toFixed(2)}
                                            </span>
                                            {book.original_price && book.original_price > book.price && (
                                                <span className="text-xs text-slate-500 line-through ml-2">
                                                    ${book.original_price}
                                                </span>
                                            )}
                                        </div>
                                        <Link to={book.purchase_url || `/books/${book.id}`}>
                                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition flex items-center gap-2 group-hover:shadow-lg group-hover:shadow-primary-500/20">
                                                <ShoppingCart className="w-4 h-4" />
                                                Purchase
                                            </button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trust Section */}
                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center hover:border-primary-500/30 transition">
                        <Award className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h4 className="text-white font-semibold">Curated by Experts</h4>
                        <p className="text-slate-400 text-sm">Selected by HR professionals</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center hover:border-primary-500/30 transition">
                        <Truck className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h4 className="text-white font-semibold">Fast Shipping</h4>
                        <p className="text-slate-400 text-sm">Free delivery worldwide</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center hover:border-primary-500/30 transition">
                        <CreditCard className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                        <h4 className="text-white font-semibold">Secure Checkout</h4>
                        <p className="text-slate-400 text-sm">Encrypted payment processing</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mock data for fallback
const MOCK_BOOKS = [
    { 
        id: 1, 
        title: 'The HR Playbook', 
        author: 'Sarah Johnson', 
        price: 29.99, 
        rating: 4.8,
        reviews: 124,
        category: 'hr-strategy',
        description: 'A comprehensive guide to modern HR practices and strategic workforce planning.',
        is_bestseller: true,
        purchase_url: '/books/hr-playbook'
    },
    { 
        id: 2, 
        title: 'AI Ethics in Employment', 
        author: 'David Chen', 
        price: 34.99, 
        rating: 4.9,
        reviews: 89,
        category: 'ai-ethics',
        description: 'Navigate the complex intersection of artificial intelligence and workplace ethics.',
        purchase_url: '/books/ai-ethics-employment'
    },
    { 
        id: 3, 
        title: 'Global Recruitment Strategies', 
        author: 'Maria Garcia', 
        price: 39.99, 
        rating: 4.7,
        reviews: 156,
        category: 'recruitment',
        description: 'Master the art of international talent acquisition and retention.',
        purchase_url: '/books/global-recruitment'
    },
    { 
        id: 4, 
        title: 'The Future of Work', 
        author: 'Dr. James Wilson', 
        price: 32.99, 
        rating: 4.8,
        reviews: 203,
        category: 'future-work',
        description: 'Insights into remote work, hybrid models, and the evolving workplace.',
        is_bestseller: true,
        purchase_url: '/books/future-of-work'
    },
    { 
        id: 5, 
        title: 'Leadership in Crisis', 
        author: 'Emma Thompson', 
        price: 27.99, 
        rating: 4.9,
        reviews: 178,
        category: 'leadership',
        description: 'Proven strategies for leading teams through uncertainty and change.',
        purchase_url: '/books/leadership-crisis'
    },
    { 
        id: 6, 
        title: 'HR Analytics Revolution', 
        author: 'Michael Lee', 
        price: 44.99, 
        rating: 4.8,
        reviews: 92,
        category: 'hr-strategy',
        description: 'Data-driven decision making for human resources professionals.',
        purchase_url: '/books/hr-analytics'
    }
];
