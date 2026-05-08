// src/pages/admin/AdminJobs.jsx
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Briefcase, Search, RefreshCw, Loader2, AlertCircle, 
  CheckCircle, XCircle, Eye, Trash2, Download,
  ThumbsUp, ThumbsDown, Star, StarOff, MapPin, Building,
  X, Square, Globe, Clock, Users, Plus, Edit, Save
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SUPPORTED_COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' }
];

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, featured: 0, byCountry: {} });
  const [user, setUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const itemsPerPage = 20;

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      loadJobs();
      loadStats();
    }
  }, [searchTerm, selectedStatus, selectedCountry, currentPage, isSuperAdmin]);

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/admin-login'; return; }
      setUser(session.user);
      const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', session.user.id).single();
      if (profile?.user_type !== 'super_admin') {
        toast.error('Access denied. Super Admin privileges required.');
        window.location.href = '/admin/dashboard';
        return;
      }
      setIsSuperAdmin(true);
    } catch (err) { window.location.href = '/admin-login'; }
  }

  async function loadStats() {
    try {
      const { data } = await supabase.from('jobs').select('status, is_featured, country_code');
      const total = data?.length || 0;
      const pending = data?.filter(j => j.status === 'pending').length || 0;
      const approved = data?.filter(j => j.status === 'approved').length || 0;
      const rejected = data?.filter(j => j.status === 'rejected').length || 0;
      const featured = data?.filter(j => j.is_featured === true).length || 0;
      const byCountry = {};
      SUPPORTED_COUNTRIES.forEach(c => { byCountry[c.code] = data?.filter(j => j.country_code === c.code).length || 0; });
      setStats({ total, pending, approved, rejected, featured, byCountry });
    } catch (err) { console.error(err); }
  }

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);
      if (selectedCountry !== 'all') query = query.eq('country_code', selectedCountry);
      if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,location.ilike.%${searchTerm}%`);
      const from = (currentPage - 1) * itemsPerPage;
      query = query.range(from, from + itemsPerPage - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      setJobs(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setTotalCount(count || 0);
    } catch (err) {
      setError('Failed to load jobs');
      toast.error('Failed to load jobs');
    } finally { setLoading(false); }
  }

  async function updateJobStatus(jobId, newStatus) {
    setProcessingId(jobId);
    toast.loading(`Updating job status...`, { id: `job-${jobId}` });
    try {
      await supabase.from('jobs').update({ status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', jobId);
      toast.success(`Job ${newStatus}`, { id: `job-${jobId}` });
      await Promise.all([loadJobs(), loadStats()]);
    } catch (err) { toast.error('Failed to update job status', { id: `job-${jobId}` }); }
    finally { setProcessingId(null); }
  }

  async function toggleFeature(jobId, currentStatus) {
    setProcessingId(jobId);
    toast.loading(`${currentStatus ? 'Unfeaturing' : 'Featuring'} job...`, { id: `job-${jobId}` });
    try { await supabase.from('jobs').update({ is_featured: !currentStatus }).eq('id', jobId); toast.success(`Job ${!currentStatus ? 'featured' : 'unfeatured'}`, { id: `job-${jobId}` }); await loadJobs(); }
    catch (err) { toast.error('Failed to update job', { id: `job-${jobId}` }); }
    finally { setProcessingId(null); }
  }

  async function deleteJob(jobId) { setShowDeleteConfirm({ id: jobId }); }
  async function confirmDelete() {
    toast.loading('Deleting job...', { id: 'delete-job' });
    try { await supabase.from('jobs').delete().eq('id', showDeleteConfirm.id); toast.success('Job deleted', { id: 'delete-job' }); await Promise.all([loadJobs(), loadStats()]); setSelectedJobs(new Set()); }
    catch (err) { toast.error('Failed to delete', { id: 'delete-job' }); }
    finally { setShowDeleteConfirm(null); }
  }

  async function bulkAction(action) {
    if (action === 'approve') { for (const id of selectedJobs) { await updateJobStatus(id, 'approved'); } toast.success(`Approved ${selectedJobs.size} jobs`); setSelectedJobs(new Set()); }
    else if (action === 'reject') { for (const id of selectedJobs) { await updateJobStatus(id, 'rejected'); } toast.success(`Rejected ${selectedJobs.size} jobs`); setSelectedJobs(new Set()); }
    else if (action === 'delete') { setShowDeleteConfirm({ ids: Array.from(selectedJobs), type: 'bulk', count: selectedJobs.size }); }
  }
  async function confirmBulkDelete() {
    toast.loading(`Deleting ${showDeleteConfirm.count} jobs...`, { id: 'bulk-delete' });
    try { for (const id of showDeleteConfirm.ids
