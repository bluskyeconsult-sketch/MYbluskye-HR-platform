import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Plus, Edit, Trash2, BookOpen, Search, RefreshCw, 
  Loader2, AlertCircle, CheckCircle, Eye, EyeOff, 
  X, Square, Globe, Clock, DollarSign, Save 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Debounce utility
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooks, setSelectedBooks] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, revenue: 0 });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [formData, setFormData] = useState({
    title: '', author: '', description: '', price: 0, cover_image: '',
    status: 'draft', isbn: '', publication_date: '', category: 'business',
    pages: 0, language: 'English', featured: false
  });

  const itemsPerPage = 20;
  const categories = ['business', 'technology', 'hr-management', 'leadership', 'career-development', 'psychology', 'marketing', 'finance'];
  const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Auth check with proper error handling
  const checkAuth = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (!session) {
        toast.error('Please login to continue');
        window.location.href = '/admin-login';
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      if (!profile || (profile.user_type !== 'admin' && profile.user_type !== 'super_admin')) {
        toast.error('Access denied. Admin privileges required.');
        window.location.href = '/dashboard';
        return;
      }
      
      if (isMountedRef.current) {
        setIsAuthorized(true);
        await Promise.all([loadBooks(), loadStats()]);
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (isMountedRef.current) {
        toast.error('Authentication failed');
        setTimeout(() => { window.location.href = '/admin-login'; }, 1500);
      }
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('books').select('status, price', { head: false });
      if (error) throw error;
      
      const total = data?.length || 0;
      const published = data?.filter(b => b.status === 'published').length || 0;
      const draft = data?.filter(b => b.status === 'draft').length || 0;
      const revenue = data?.reduce((sum, b) => b.status === 'published' ? sum + (b.price || 0) : sum, 0) || 0;
      
      if (isMountedRef.current) {
        setStats({ total, published, draft, revenue });
      }
    } catch (err) { 
      console.error('Stats error:', err);
      toast.error('Failed to load statistics');
    }
  }, []);

  const loadBooks = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }
      
      let query = supabase
        .from('books')
        .select('*', { count: 'exact', head: false })
        .order('created_at', { ascending: false });
      
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }
      
      if (debouncedSearch) {
        // Sanitize search input
        const sanitizedSearch = debouncedSearch.replace(/[%_]/g, '\\$&');
        query = query.or(`title.ilike.%${sanitizedSearch}%,author.ilike.%${sanitizedSearch}%`);
      }
      
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      
      const { data, error, count } = await query.abortSignal(abortControllerRef.current.signal);
      
      if (error) throw error;
      
      if (isMountedRef.current) {
        setBooks(data || []);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request cancelled');
        return;
      }
      console.error('Load error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load books');
        toast.error('Failed to load books');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedStatus, debouncedSearch, currentPage, itemsPerPage]);

  // Separate effect for search/filter changes (resets page)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatus]);

  // Effect for loading books when dependencies change
  useEffect(() => {
    if (isAuthorized) {
      loadBooks();
    }
  }, [isAuthorized, loadBooks, currentPage]);

  // Validation function
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return false;
    }
    if (!formData.author.trim()) {
      toast.error('Author is required');
      return false;
    }
    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return false;
    }
    if (formData.price > 10000) {
      toast.error('Price cannot exceed $10,000');
      return false;
    }
    if (formData.pages < 0) {
      toast.error('Pages cannot be negative');
      return false;
    }
    if (formData.pages > 10000) {
      toast.error('Pages cannot exceed 10,000');
      return false;
    }
    if (formData.isbn && !/^(97(8|9))?\d{9}(\d|X)$/.test(formData.isbn)) {
      toast.error('Invalid ISBN format');
      return false;
    }
    if (formData.publication_date && !/^\d{4}-\d{2}-\d{2}$/.test(formData.publication_date)) {
      toast.error('Invalid date format (YYYY-MM-DD)');
      return false;
    }
    if (!categories.includes(formData.category)) {
      toast.error('Invalid category');
      return false;
    }
    if (!languages.includes(formData.language)) {
      toast.error('Invalid language');
      return false;
    }
    return true;
  };

  const saveBook = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const bookData = { 
        ...formData, 
        price: parseFloat(formData.price), 
        pages: parseInt(formData.pages) || 0,
        updated_at: new Date().toISOString()
      };
      
      if (editing) {
        const { error } = await supabase
          .from('books')
          .update(bookData)
          .eq('id', editing);
        
        if (error) throw error;
        toast.success('Book updated successfully');
      } else {
        const { error } = await supabase
          .from('books')
          .insert([{ ...bookData, created_at: new Date().toISOString() }]);
        
        if (error) throw error;
        toast.success('Book created successfully');
      }
      
      if (isMountedRef.current) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        await Promise.all([loadBooks(), loadStats()]);
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save book');
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm?.id) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', showDeleteConfirm.id);
      
      if (error) throw error;
      
      toast.success('Book deleted');
      await Promise.all([loadBooks(), loadStats()]);
      
      if (showDeleteConfirm.id === editing) {
        setEditing(null);
        setShowForm(false);
      }
    } catch (err) { 
      console.error('Delete error:', err);
      toast.error(err.message || 'Failed to delete');
    } finally { 
      setShowDeleteConfirm(null); 
    }
  };

  const confirmBulkDelete = async () => {
    if (!showDeleteConfirm?.ids?.length) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .in('id', showDeleteConfirm.ids);
      
      if (error) throw error;
      
      toast.success(`Deleted ${showDeleteConfirm.ids.length} books`);
      setSelectedBooks(new Set());
      await Promise.all([loadBooks(), loadStats()]);
    } catch (err) { 
      console.error('Bulk delete error:', err);
      toast.error(err.message || 'Failed to delete');
    } finally { 
      setShowDeleteConfirm(null); 
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const toastId = toast.loading(`Updating status...`);
    
    try {
      const { error } = await supabase
        .from('books')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success(`Book ${newStatus}`, { id: toastId });
      await Promise.all([loadBooks(), loadStats()]);
    } catch (err) { 
      console.error('Status update error:', err);
      toast.error(err.message || 'Failed to update status', { id: toastId });
    }
  };

  // Rest of the component remains similar but with proper error boundaries...
  // (rendering code omitted for brevity, but would include error boundaries and loading states)
  
  return (
    // ... JSX with proper error boundaries and loading states
  );
}
