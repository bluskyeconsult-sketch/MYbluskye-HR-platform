// src/pages/admin/ManageBooks.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import FileUpload from '../../components/FileUpload';
import { BookOpen, Plus, Edit2, Trash2, Eye, Loader2 } from 'lucide-react';

export default function ManageBooks() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        description: '',
        price: 0,
        cover_url: '',
        category: '',
        is_featured: false,
        pdf_url: '',
        publish_date: ''
    });

    useEffect(() => { fetchBooks(); }, []);

    async function fetchBooks() {
        setLoading(true);
        const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
        if (!error) setBooks(data || []);
        setLoading(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        
        if (editingBook) {
            await supabase.from('books').update(formData).eq('id', editingBook.id);
        } else {
            await supabase.from('books').insert(formData);
        }
        
        setShowModal(false);
        setEditingBook(null);
        setFormData({ title: '', author: '', description: '', price: 0, cover_url: '', category: '', is_featured: false, pdf_url: '', publish_date: '' });
        fetchBooks();
        setSubmitting(false);
    }

    async function handleDelete(id) {
        if (confirm('Delete this book?')) {
            await supabase.from('books').delete().eq('id', id);
            fetchBooks();
        }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manage Books</h1>
                    <p className="text-slate-400">Add, edit, or remove books from the library</p>
                </div>
                <button onClick={() => { setEditingBook(null); setFormData({ title: '', author: '', description: '', price: 0, cover_url: '', category: '', is_featured: false, pdf_url: '', publish_date: '' }); setShowModal(true); }} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Book
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {books.map(book => (
                    <div key={book.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/30 transition">
                        {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                        ) : (
                            <div className="h-32 bg-gradient-to-br from-primary-900/30 to-slate-900 rounded-lg mb-3 flex items-center justify-center">
                                <BookOpen className="w-8 h-8 text-primary-400" />
                            </div>
                        )}
                        <h3 className="text-white font-semibold">{book.title}</h3>
                        <p className="text-slate-400 text-sm">{book.author}</p>
                        <p className="text-primary-400 text-sm mt-1">${book.price}</p>
                        {book.pdf_url && <span className="inline-block mt-1 text-xs text-emerald-400">📄 PDF Available</span>}
                        {book.is_featured && <span className="inline-block ml-2 text-xs text-amber-400">⭐ Featured</span>}
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => { setEditingBook(book); setFormData(book); setShowModal(true); }} className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(book.id)} className="p-1.5 bg-slate-800 rounded-lg text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                            {book.pdf_url && <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-slate-800 rounded-lg text-slate-300 hover:text-white"><Eye className="w-4 h-4" /></a>}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-4">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm text-slate-400 mb-1">Title *</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required /></div>
                                <div><label className="block text-sm text-slate-400 mb-1">Author *</label><input type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" required /></div>
                            </div>
                            <div><label className="block text-sm text-slate-400 mb-1">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm text-slate-400 mb-1">Price ($)</label><input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                                <div><label className="block text-sm text-slate-400 mb-1">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"><option value="">Select</option><option value="hr">Human Resources</option><option value="leadership">Leadership</option><option value="technology">Technology</option><option value="career">Career</option></select></div>
                            </div>
                            <div><label className="block text-sm text-slate-400 mb-1">Cover Image</label><FileUpload bucket="book_covers" folder="covers" acceptedType="image" onUploadComplete={(url) => setFormData({...formData, cover_url: url})} existingUrl={formData.cover_url} label="Upload Cover Image" /></div>
                            <div><label className="block text-sm text-slate-400 mb-1">PDF File (Optional)</label><FileUpload bucket="admin_uploads" folder="books" acceptedType="document" onUploadComplete={(url) => setFormData({...formData, pdf_url: url})} existingUrl={formData.pdf_url} label="Upload PDF" /></div>
                            <div><label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} /><span className="text-white">Feature this book</span></label></div>
                            <div><label className="block text-sm text-slate-400 mb-1">Publish Date</label><input type="date" value={formData.publish_date} onChange={e => setFormData({...formData, publish_date: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">{submitting ? 'Saving...' : 'Save Book'}</button>
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
