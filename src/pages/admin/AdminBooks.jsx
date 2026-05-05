import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: 0,
    cover_image: '',
    status: 'draft'
  });

  useEffect(() => { loadBooks(); }, []);

  async function loadBooks() {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    setBooks(data || []);
    setLoading(false);
  }

  async function saveBook() {
    if (editing) {
      await supabase.from('books').update(formData).eq('id', editing);
    } else {
      await supabase.from('books').insert(formData);
    }
    setShowForm(false);
    setEditing(null);
    setFormData({ title: '', author: '', description: '', price: 0, cover_image: '', status: 'draft' });
    loadBooks();
  }

  async function deleteBook(id) {
    if (confirm('Delete this book?')) {
      await supabase.from('books').delete().eq('id', id);
      loadBooks();
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Book Management</h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Book
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">{editing ? 'Edit Book' : 'New Book'}</h2>
          <div className="space-y-4">
            <input type="text" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <input type="text" placeholder="Author" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <textarea placeholder="Description" rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <input type="text" placeholder="Cover Image URL" value={formData.cover_image} onChange={e => setFormData({...formData, cover_image: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <div className="flex gap-3">
              <button onClick={saveBook} className="px-4 py-2 bg-success text-white rounded-lg">Save</button>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {books.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No books found. Click "Add Book" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map(book => (
            <div key={book.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-primary-400" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">{book.title}</h3>
                    <p className="text-sm text-slate-400">by {book.author}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditing(book.id); setFormData(book); setShowForm(true); }} className="text-primary-400 hover:text-primary-300">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteBook(book.id)} className="text-danger hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-3 line-clamp-2">{book.description}</p>
              <div className="mt-3 flex justify-between items-center">
                <span className="text-primary-400 font-bold">${book.price}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${book.status === 'published' ? 'bg-success/20 text-success' : 'bg-amber-500/20 text-amber-400'}`}>{book.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
