// src/pages/BooksPage.jsx
// PROFESSIONAL BOOK STORE PAGE - With API integration, search, filters, and Supabase fallback (No external dependencies)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function BooksPage() {
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('title');

    const categories = [
        { id: 'all', name: 'All Books', icon: '📚' },
        { id: 'hr-strategy', name: 'HR Strategy', icon: '📈' },
        { id: 'ai-ethics', name: 'AI & Ethics', icon: '🧠' },
        { id: 'recruitment', name: 'Recruitment', icon: '👥' },
        { id: 'leadership', name: 'Leadership', icon: '🏆' },
        { id: 'future-work', name: 'Future of Work', icon: '🌍' },
        { id: 'productivity', name: 'Productivity', icon: '⚡' },
        { id: 'compliance', name: 'Compliance', icon: '🛡️' }
    ];

    useEffect(() => {
        loadBooks();
    }, []);

    useEffect(() => {
        filterAndSortBooks();
    }, [books, searchQuery, selectedCategory, sortBy]);

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
                try {
                    const { data, error: supabaseError } = await supabase
                        .from('books')
                        .select('*')
                        .eq('is_published', true)
                        .order('created_at', { ascending: false });
                    
                    if (!supabaseError && data) {
                        booksData = data;
                    }
                } catch (supabaseError) {
                    console.warn('Supabase fetch failed:', supabaseError);
                }
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
                (book.title || '').toLowerCase().includes(query) ||
                (book.author || '').toLowerCase().includes(query) ||
                (book.description || '').toLowerCase().includes(query)
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
            stars.push(
                <svg key={i} className="w-4 h-4 fill-amber-400 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            );
        }
        if (hasHalfStar) {
            stars.push(
                <svg key="half" className="w-4 h-4 fill-amber-400/50 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            );
        }
        const remaining = 5 - stars.length;
        for (let i = 0; i < remaining; i++) {
            stars.push(
                <svg key={`empty-${i}`} className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            );
        }
        return stars;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
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
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title, author, or description..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2">
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
                                <span>{cat.icon}</span>
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
                        <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
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
                                    <svg className="w-16 h-16 text-primary-400/50 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    {book.rating && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-slate-900/80 rounded-lg backdrop-blur-sm">
                                            <svg className="w-3 h-3 fill-amber-400 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
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
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 1.5M17 13l1.5 1.5M9 21h6M12 18v3" />
                                                </svg>
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
                        <svg className="w-8 h-8 text-primary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h4 className="text-white font-semibold">Curated by Experts</h4>
                        <p className="text-slate-400 text-sm">Selected by HR professionals</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center hover:border-primary-500/30 transition">
                        <svg className="w-8 h-8 text-primary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <h4 className="text-white font-semibold">Fast Shipping</h4>
                        <p className="text-slate-400 text-sm">Free delivery worldwide</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center hover:border-primary-500/30 transition">
                        <svg className="w-8 h-8 text-primary-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
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
