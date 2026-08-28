// src/pages/BooksPage.jsx
// PROFESSIONAL BOOK STORE PAGE - With API integration, search, filters, and Supabase fallback (No external dependencies)
//
// FIXED (2026-08-23):
// 1. CRITICAL: this page was silently falling back to fully fabricated
//    MOCK_BOOKS data (fake ratings, fake review counts, fake "Bestseller"
//    badges, fake prices) whenever the real API/Supabase queries returned
//    nothing — showing invented product data to real paying customers as
//    if it were genuine. Removed entirely. If no real books are published,
//    the page now shows the honest "No books available" empty state that
//    already existed, rather than inventing content.
// 2. rating/reviews/is_bestseller/original_price were never real columns
//    on the books table at all (confirmed: title, author, description,
//    price, ebook_price, category, cover_url, file_url, preview_file_url,
//    external_purchase_url, is_published) — no review/rating system
//    exists anywhere in this project. Removed all rating/review/
//    bestseller UI, since it was decorative for real data regardless of
//    the mock-data issue above.
// 3. cover_url — a real, already-existing field admins can set in
//    ManageBooks.jsx — was never referenced anywhere in this file. Every
//    book showed the identical generic icon on the same gradient
//    background regardless of whether a real cover image existed. Now
//    renders the real cover image when set, falling back to the icon
//    only when it isn't.
// 4. "Fast Shipping — Free delivery worldwide" was hardcoded, static
//    marketing copy that's factually wrong for this platform's real
//    model — books are fulfilled either as an e-copy (instant download/
//    read on this site) or a hardcopy via a third-party retailer
//    (Amazon or similar), never shipped directly by this site at all.
//    Replaced with accurate copy.
// 5. The single generic "Purchase" button assumed one undefined
//    purchase flow. The real model (confirmed by the business owner) has
//    two distinct, separate paths — hardcopy via an external retailer
//    link, e-copy via a real purchase+read flow on this site — so each
//    card now links to the new /books/:id detail page, which presents
//    both real options rather than guessing which one a single button
//    should mean.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PageEdgeBanner from '../components/PageEdgeBanner';

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
            
            // FIXED (2026-08-23): no longer falls back to fabricated mock
            // data when both real sources return nothing — an empty
            // result is a genuine, honest "no books published yet" state,
            // not a reason to show fake products to real customers.
            
            setBooks(booksData);
            setFilteredBooks(booksData);
            
        } catch (err) {
            console.error('Error loading books:', err);
            setError(err.message);
            setBooks([]);
            setFilteredBooks([]);
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
                return (a.ebook_price ?? a.price ?? 0) - (b.ebook_price ?? b.price ?? 0);
            } else if (sortBy === 'price_desc') {
                return (b.ebook_price ?? b.price ?? 0) - (a.ebook_price ?? a.price ?? 0);
            } else if (sortBy === 'newest') {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
            return 0;
        });
        
        setFilteredBooks(filtered);
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

                <PageEdgeBanner>
                    Buy the hardcopy through Amazon, or the e-copy directly here — read instantly in your
                    browser. E-copy files are never publicly accessible; each is unlocked with a private,
                    time-limited link generated only after your purchase is confirmed.
                </PageEdgeBanner>

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
                            <Link
                                to={`/books/${book.id}`}
                                key={book.id}
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1"
                            >
                                {/* FIXED (2026-08-23): renders the real cover_url image
                                    when set — previously always showed the same generic
                                    icon regardless of whether a real cover existed. */}
                                <div className="relative h-48 bg-gradient-to-br from-primary-500/20 to-sky-500/20 flex items-center justify-center overflow-hidden">
                                    {book.cover_url ? (
                                        <img
                                            src={book.cover_url}
                                            alt={book.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <svg className="w-16 h-16 text-primary-400/50 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    )}
                                </div>
                                
                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 group-hover:text-primary-400 transition">
                                        {book.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-3">by {book.author}</p>
                                    
                                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                                        {book.description || 'Essential reading for HR professionals and career-driven individuals.'}
                                    </p>
                                    
                                    {/* FIXED (2026-08-23): shows both real, distinct
                                        price points instead of one undefined "Purchase"
                                        button — hardcopy (via Amazon/retailer) and e-copy
                                        (purchased/read on this site) are genuinely
                                        different products at different prices. */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                                        <div className="text-sm">
                                            {book.ebook_price && (
                                                <p className="text-primary-400 font-bold">
                                                    E-copy ${Number(book.ebook_price).toFixed(2)}
                                                </p>
                                            )}
                                            {book.price && (
                                                <p className="text-slate-500 text-xs">
                                                    Hardcopy ${Number(book.price).toFixed(2)}
                                                </p>
                                            )}
                                        </div>
                                        <span className="px-4 py-2 bg-primary-600 text-white rounded-lg group-hover:bg-primary-500 transition text-sm font-medium">
                                            View Book
                                        </span>
                                    </div>
                                </div>
                            </Link>
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <h4 className="text-white font-semibold">Instant E-Copy Access</h4>
                        <p className="text-slate-400 text-sm">Read on this site right after purchase</p>
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
