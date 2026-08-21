// src/pages/admin/ManageBooks.jsx
// ADMIN BOOKS MANAGEMENT - Complete CRUD operations for books

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    BookOpen, Plus, Edit2, Trash2, Eye, Loader2, 
    CheckCircle, XCircle, Search, Upload, FileText,
    DollarSign, Calendar, Image, AlertCircle, RefreshCw
} from 'lucide-react';

export default function ManageBooks() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [bookForm, setBookForm] = useState({
        title: '',
        author: '',
        description: '',
        price: 29.99,
        category: 'HR',
        cover_url: '',
        file_url: '',
        is_published: true
    });

    // Load books on mount
    useEffect(() => {
        loadBooks();
    }, []);

    async function loadBooks() {
        setLoading(true);
        setError(null);
        
        try {
            const { data, error } = await supabase
                .from('books')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setBooks(data || []);
        } catch (err) {
            console.error('Error loading books:', err);
            setError('Failed to load books. Please refresh.');
        } finally {
            setLoading(false);
        }
    }

    function openCreateModal() {
        setEditingBook(null);
        setBookForm({
            title: '',
            author: '',
            description: '',
            price: 29.99,
            category: 'HR',
            cover_url: '',
            file_url: '',
            is_published: true
        });
        setError(null);
        setShowModal(true);
    }

    function openEditModal(book) {
        setEditingBook(book);
        setBookForm({
            title: book.title || '',
            author: book.author || '',
            description: book.description || '',
            price: book.price || 29.99,
            category: book.category || 'HR',
            cover_url: book.cover_url || '',
            file_url: book.file_url || '',
            is_published: book.is_published !== undefined ? book.is_published : true
        });
        setError(null);
        setShowModal(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Validate
            if (!bookForm.title.trim()) {
                throw new Error('Title is required');
            }
            if (!bookForm.author.trim()) {
                throw new Error('Author is required');
            }
            if (bookForm.price < 0) {
                throw new Error('Price must be 0 or greater');
            }

            const bookData = {
                title: bookForm.title.trim(),
                author: bookForm.author.trim(),
                description: bookForm.description.trim(),
                price: bookForm.price,
                category: bookForm.category,
                cover_url: bookForm.cover_url.trim(),
                file_url: bookForm.file_url.trim(),
                is_published: bookForm.is_published,
                updated_at: new Date().toISOString()
            };

            let result;
            if (editingBook) {
                // Update existing book
                result = await supabase
                    .from('books')
                    .update(bookData)
                    .eq('id', editingBook.id);
            } else {
                // Create new book
                result = await supabase
                    .from('books')
                    .insert({
                        ...bookData,
                        created_at: new Date().toISOString()
                    });
            }

            if (result.error) throw result.error;

            setSuccess(editingBook ? 'Book updated successfully!' : 'Book created successfully!');
            setShowModal(false);
            loadBooks();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function deleteBook(id) {
        if (!confirm('Delete this book? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setSuccess('Book deleted successfully!');
            loadBooks();
        } catch (err) {
            setError(err.message);
        }
    }

    async function togglePublish(id, currentStatus) {
        try {
            const { error } = await supabase
                .from('books')
                .update({ 
                    is_published: !currentStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
            
            if (error) throw error;
            loadBooks();
        } catch (err) {
            setError(err.message);
        }
    }

    const filteredBooks = books.filter(book => 
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Category options
    const categories = [
        'HR', 'Leadership', 'Career Development', 'Recruitment', 
        'AI & Technology', 'Business', 'Psychology', 'Other'
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <span className="ml-2 text-slate-400">Loading books...</span>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-primary-400" />
                        Manage Books
                    </h1>
                    <p className="text-slate-400">Manage your book catalog and sales</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadBooks}
                        className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-1"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Book
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">{books.length}</div>
                    <div className="text-slate-400 text-sm">Total Books</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-emerald-400">
                        {books.filter(b => b.is_published).length}
                    </div>
                    <div className="text-slate-400 text-sm">Published</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-amber-400">
                        {books.filter(b => !b.is_published).length}
                    </div>
                    <div className="text-slate-400 text-sm">Drafts</div>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search books by title, author, or category..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                />
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <p className="text-emerald-400">{success}</p>
                    <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400">✕</button>
                </div>
            )}

            {/* Books Grid */}
            {filteredBooks.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Books Found</h3>
                    <p className="text-slate-400">
                        {searchTerm ? 'No books match your search' : 'Add your first book to get started'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={openCreateModal}
                            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Add Your First Book
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBooks.map((book) => (
                        <div key={book.id} className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition">
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                        <h3 className="text-white font-semibold truncate">{book.title}</h3>
                                        <p className="text-slate-400 text-sm">by {book.author}</p>
                                    </div>
                                    {book.is_published ? (
                                        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">Published</span>
                                    ) : (
                                        <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">Draft</span>
                                    )}
                                </div>

                                <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                                    {book.description || 'No description available'}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        ${book.price?.toFixed(2) || '0.00'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {book.category || 'Uncategorized'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(book.created_at).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(book)}
                                        className="flex-1 px-3 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center justify-center gap-1 text-sm"
                                    >
                                        <Edit2 className="w-3 h-3" /> Edit
                                    </button>
                                    <button
                                        onClick={() => togglePublish(book.id, book.is_published)}
                                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm ${
                                            book.is_published 
                                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                        }`}
                                    >
                                        {book.is_published ? 'Unpublish' : 'Publish'}
                                    </button>
                                    <button
                                        onClick={() => deleteBook(book.id)}
                                        className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 flex items-center gap-1 text-sm"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {editingBook ? 'Edit Book' : 'Add New Book'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={bookForm.title}
                                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                    placeholder="Book title"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Author */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Author *</label>
                                <input
                                    type="text"
                                    value={bookForm.author}
                                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                                    placeholder="Author name"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={bookForm.description}
                                    onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                    placeholder="Book description"
                                    rows="4"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>

                            {/* Price and Category */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Price (USD)</label>
                                    <input
                                        type="number"
                                        value={bookForm.price}
                                        onChange={(e) => setBookForm({ ...bookForm, price: parseFloat(e.target.value) || 0 })}
                                        min="0"
                                        step="0.01"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Category</label>
                                    <select
                                        value={bookForm.category}
                                        onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* URLs */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Cover Image URL</label>
                                <input
                                    type="url"
                                    value={bookForm.cover_url}
                                    onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })}
                                    placeholder="https://example.com/cover.jpg"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">PDF File URL</label>
                                <input
                                    type="url"
                                    value={bookForm.file_url}
                                    onChange={(e) => setBookForm({ ...bookForm, file_url: e.target.value })}
                                    placeholder="https://example.com/book.pdf"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">Upload PDF to a storage service and paste the URL here</p>
                            </div>

                            {/* Publish Status */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={bookForm.is_published}
                                    onChange={(e) => setBookForm({ ...bookForm, is_published: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-600"
                                />
                                <span className="text-white text-sm">Publish immediately</span>
                            </label>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                                >
                                    {saving ? 'Saving...' : (editingBook ? 'Update Book' : 'Create Book')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
