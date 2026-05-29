// src/pages/admin/ManageBooks.jsx
// COMPLETE PROFESSIONAL BOOKS MANAGEMENT - Add, edit, delete books with file uploads
// Features: Book cover upload, PDF upload, featured books, categories, publish date

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import FileUpload from '../../components/FileUpload';
import { 
    BookOpen, Plus, Edit2, Trash2, Eye, Loader2, 
    Download, Star, Calendar, DollarSign, User, 
    Tag, AlertCircle, CheckCircle, X, Image as ImageIcon,
    FileText, Award, TrendingUp, Users, Briefcase, Code
} from 'lucide-react';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CATEGORIES = [
    { id: 'hr', name: 'Human Resources', icon: Users, color: 'primary' },
    { id: 'leadership', name: 'Leadership', icon: Award, color: 'emerald' },
    { id: 'technology', name: 'Technology', icon: Code, color: 'purple' },
    { id: 'career', name: 'Career Development', icon: TrendingUp, color: 'amber' },
    { id: 'management', name: 'Management', icon: Briefcase, color: 'blue' },
    { id: 'soft-skills', name: 'Soft Skills', icon: Users, color: 'pink' }
];

const getCategoryIcon = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.icon || BookOpen;
};

const getCategoryColor = (categoryId) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.color || 'slate';
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ManageBooks() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        price: 0,
        cover_url: '',
        category: '',
        is_featured: false,
        pdf_url: '',
        publish_date: new Date().toISOString().split('T')[0],
        isbn: '',
        pages: 0,
        language: 'English',
        edition: 1
    });

    useEffect(() => {
        fetchBooks();
    }, []);

    async function fetchBooks() {
        setLoading(true);
        const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error) setBooks(data || []);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setSuccessMessage('');

        // Validation
        if (!formData.title.trim()) {
            setError('Book title is required');
            setSubmitting(false);
            return;
        }
        
        if (!formData.author.trim()) {
            setError('Author name is required');
            setSubmitting(false);
            return;
        }

        try {
            if (editingBook) {
                const { error } = await supabase
                    .from('books')
                    .update({
                        ...formData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingBook.id);
                
                if (error) throw error;
                setSuccessMessage('Book updated successfully!');
            } else {
                const { error } = await supabase
                    .from('books')
                    .insert({
                        ...formData,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                
                if (error) throw error;
                setSuccessMessage('Book added successfully!');
            }
            
            // Reset form and close modal after delay
            setTimeout(() => {
                setShowModal(false);
                resetForm();
                fetchBooks();
                setSuccessMessage('');
            }, 1500);
            
        } catch (err) {
            console.error('Error saving book:', err);
            setError(err.message || 'Failed to save book');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id) {
        if (confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
            const { error } = await supabase
                .from('books')
                .delete()
                .eq('id', id);
            
            if (!error) {
                fetchBooks();
                setSuccessMessage('Book deleted successfully');
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        }
    }

    function resetForm() {
        setEditingBook(null);
        setFormData({
            title: '',
            author: '',
            description: '',
            price: 0,
            cover_url: '',
            category: '',
            is_featured: false,
            pdf_url: '',
            publish_date: new Date().toISOString().split('T')[0],
            isbn: '',
            pages: 0,
            language: 'English',
            edition: 1
        });
        setError('');
    }

    function openEditModal(book) {
        setEditingBook(book);
        setFormData(book);
        setShowModal(true);
        setError('');
    }

    const filteredBooks = books.filter(book => {
        const matchesCategory = selectedCategory === 'all' || book.category === selectedCategory;
        const matchesSearch = searchTerm === '' || 
            book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Books</h1>
                    <p className="text-slate-400">Add, edit, or remove books from the ODUSBABA library</p>
                </div>
                <button 
                    onClick={() => { resetForm(); setShowModal(true); }} 
                    className="px-4 py-2 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                    <Plus className="w-4 h-4" /> 
                    Add New Book
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <p className="text-emerald-400 text-sm">{successMessage}</p>
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search books by title or author..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                            selectedCategory === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                    >
                        All Books
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition flex items-center gap-1 ${
                                selectedCategory === cat.id
                                    ? `bg-${cat.color}-600 text-white`
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            <cat.icon className="w-3 h-3" />
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Books Grid */}
            {filteredBooks.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                    <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No books found</h3>
                    <p className="text-slate-400">
                        {books.length === 0 
                            ? 'No books in the library yet. Click "Add New Book" to get started.'
                            : 'No books match your search criteria.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredBooks.map(book => {
                        const Icon = getCategoryIcon(book.category);
                        const categoryColor = getCategoryColor(book.category);
                        
                        return (
                            <div 
                                key={book.id} 
                                className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/30 transition-all hover:-translate-y-1"
                            >
                                {/* Book Cover */}
                                {book.cover_url ? (
                                    <div className="relative h-48 overflow-hidden">
                                        <img 
                                            src={book.cover_url} 
                                            alt={book.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                        />
                                        {book.is_featured && (
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/90 rounded-lg text-xs text-white font-semibold flex items-center gap-1">
                                                <Star className="w-3 h-3" /> Featured
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="h-48 bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center">
                                        <BookOpen className="w-12 h-12 text-primary-400 mb-2" />
                                        <span className="text-xs text-slate-500">No cover image</span>
                                    </div>
                                )}
                                
                                {/* Book Info */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg bg-${categoryColor}-500/10`}>
                                                <Icon className={`w-3 h-3 text-${categoryColor}-400`} />
                                            </div>
                                            <span className="text-xs text-slate-500 capitalize">{book.category || 'Uncategorized'}</span>
                                        </div>
                                        <span className="text-lg font-bold text-primary-400">${book.price}</span>
                                    </div>
                                    
                                    <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">{book.title}</h3>
                                    <p className="text-slate-400 text-sm mb-2">by {book.author}</p>
                                    
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                                        {book.publish_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(book.publish_date).getFullYear()}
                                            </span>
                                        )}
                                        {book.pages > 0 && (
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                {book.pages} pages
                                            </span>
                                        )}
                                        {book.pdf_url && (
                                            <span className="flex items-center gap-1 text-emerald-400">
                                                <Download className="w-3 h-3" />
                                                PDF
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                                        <button 
                                            onClick={() => openEditModal(book)} 
                                            className="flex-1 py-1.5 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition flex items-center justify-center gap-1 text-sm"
                                        >
                                            <Edit2 className="w-3 h-3" /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(book.id)} 
                                            className="flex-1 py-1.5 bg-slate-800 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition flex items-center justify-center gap-1 text-sm"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                        {book.pdf_url && (
                                            <a 
                                                href={book.pdf_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="py-1.5 px-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                                title="Preview PDF"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {editingBook ? 'Edit Book' : 'Add New Book'}
                            </h2>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Author *</label>
                                    <input
                                        type="text"
                                        value={formData.author}
                                        onChange={e => setFormData({...formData, author: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    rows="3"
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="Book description..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.price}
                                        onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select Category</option>
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">ISBN</label>
                                    <input
                                        type="text"
                                        value={formData.isbn}
                                        onChange={e => setFormData({...formData, isbn: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="978-0-00-000000-0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Pages</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.pages}
                                        onChange={e => setFormData({...formData, pages: parseInt(e.target.value) || 0})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Language</label>
                                    <select
                                        value={formData.language}
                                        onChange={e => setFormData({...formData, language: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="English">English</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Chinese">Chinese</option>
                                        <option value="Japanese">Japanese</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Edition</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.edition}
                                        onChange={e => setFormData({...formData, edition: parseInt(e.target.value) || 1})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Cover Image</label>
                                <FileUpload 
                                    bucket="book_covers" 
                                    folder="covers" 
                                    acceptedType="image" 
                                    onUploadComplete={(url) => setFormData({...formData, cover_url: url})} 
                                    existingUrl={formData.cover_url} 
                                    label="Upload Cover Image"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">PDF File (Optional)</label>
                                <FileUpload 
                                    bucket="admin_uploads" 
                                    folder="books" 
                                    acceptedType="document" 
                                    onUploadComplete={(url) => setFormData({...formData, pdf_url: url})} 
                                    existingUrl={formData.pdf_url} 
                                    label="Upload PDF"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Publish Date</label>
                                    <input
                                        type="date"
                                        value={formData.publish_date}
                                        onChange={e => setFormData({...formData, publish_date: e.target.value})}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="flex items-center justify-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_featured}
                                            onChange={e => setFormData({...formData, is_featured: e.target.checked})}
                                            className="w-4 h-4 rounded border-slate-600 text-amber-500 focus:ring-amber-500"
                                        />
                                        <span className="text-white text-sm flex items-center gap-1">
                                            <Star className="w-4 h-4 text-amber-400" />
                                            Feature this book
                                        </span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-gradient-to-r from-primary-600 to-sky-600 text-white rounded-lg hover:from-primary-700 hover:to-sky-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4" /> {editingBook ? 'Update Book' : 'Add Book'}</>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-all duration-200"
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
