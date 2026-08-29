// src/pages/JobsPage.jsx - UNIFIED & OPTIMIZED
// ODUSBABA JOB BOARD v4.3 - Fixed: removed client-side job insert (was causing 400 errors + bypassing approval pipeline)
//
// FIXED (2026-08-23): selectedCountry always initialized to 'all' with no
// reading of the URL's ?country= parameter — but HomePage.jsx's "Global
// Presence" section links directly to /jobs?country=NG (etc.) for every
// country card, implying clicking one pre-filters this page. It never
// did; every click landed on the fully unfiltered jobs list, silently
// ignoring the country the visitor actually clicked. Now reads the real
// URL parameter on load.

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCapability } from '../hooks/useCapability';
import PageEdgeBanner from '../components/PageEdgeBanner';
import { 
    Briefcase, MapPin, DollarSign, Building2, Clock, 
    Search, Filter, Loader2, AlertCircle, ExternalLink,
    Calendar, ChevronLeft, ChevronRight, X, TrendingUp,
    Star, Award, Shield, Zap, RefreshCw, Bookmark, BookmarkCheck,
    Eye, Heart
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

// Country options
const COUNTRIES = [
    { code: 'all', name: 'All Countries', flag: '🌍' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'FR', name: 'France', flag: '🇫🇷' }
];

// Job type options
const JOB_TYPES = [
    { value: 'all', label: 'All Types', color: 'bg-slate-500/20 text-slate-400' },
    { value: 'full_time', label: 'Full Time', color: 'bg-emerald-500/20 text-emerald-400' },
    { value: 'part_time', label: 'Part Time', color: 'bg-blue-500/20 text-blue-400' },
    { value: 'remote', label: 'Remote', color: 'bg-purple-500/20 text-purple-400' },
    { value: 'contract', label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
    { value: 'freelance', label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' },
    { value: 'hybrid', label: 'Hybrid', color: 'bg-cyan-500/20 text-cyan-400' },
    { value: 'onsite', label: 'On-site', color: 'bg-slate-500/20 text-slate-400' }
];

// Sort options
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'salary_high', label: 'Highest Salary' },
    { value: 'salary_low', label: 'Lowest Salary' }
];

// Jobs per page options
const PER_PAGE_OPTIONS = [25, 50, 100, 250];

// ============================================
// MAIN COMPONENT
// ============================================

export default function JobsPage() {
    // FIXED (2026-08-30): same confirmed bug as HRToolsPage.jsx - the
    // hook only ever returns 'tier', never 'userTier'.
    const { capabilities, tier: userTier, canSync } = useCapability();
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [savedJobs, setSavedJobs] = useState(new Set());
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [jobsPerPage, setJobsPerPage] = useState(50);
    
    // Filter states
    const [searchParams] = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    // FIXED (2026-08-23): now reads the real ?country= URL param on
    // initial load instead of always defaulting to 'all', regardless of
    // what HomePage.jsx's country links actually sent.
    const [selectedCountry, setSelectedCountry] = useState(() => searchParams.get('country') || 'all');
    const [selectedJobType, setSelectedJobType] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [salaryRange, setSalaryRange] = useState({ min: '', max: '' });
    const [showVisaOnly, setShowVisaOnly] = useState(false);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // ============================================
    // USER FUNCTIONS
    // ============================================

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function loadSavedJobs() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: saved } = await supabase
            .from('saved_jobs')
            .select('job_id')
            .eq('user_id', user.id);
        
        if (saved) {
            setSavedJobs(new Set(saved.map(s => s.job_id)));
        }
    }

    async function toggleSaveJob(jobId, e) {
        e.stopPropagation();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = `/sign-in?redirect=/jobs`;
            return;
        }
        
        if (savedJobs.has(jobId)) {
            await supabase
                .from('saved_jobs')
                .delete()
                .eq('user_id', user.id)
                .eq('job_id', jobId);
            setSavedJobs(prev => {
                const newSet = new Set(prev);
                newSet.delete(jobId);
                return newSet;
            });
        } else {
            await supabase
                .from('saved_jobs')
                .insert({ user_id: user.id, job_id: jobId });
            setSavedJobs(prev => new Set([...prev, jobId]));
        }
    }

    // ============================================
    // LOAD JOBS — READ ONLY (no client-side writes to `jobs`)
    // New jobs enter the `jobs` table via the daily cron
    // (api/cron/sync-external-jobs.js) + admin approval pipeline
    // in rssJobService.js/ExternalJobsManager.jsx. This page never
    // inserts jobs itself.
    // ============================================

    const loadJobs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            let query = supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .eq('compliance_status', 'approved')
                .order('posted_at', { ascending: false });
            
            // Apply search filter if present
            if (searchQuery && searchQuery.trim()) {
                query = query.ilike('title', `%${searchQuery}%`);
            }
            
            // FIXED (2026-08-16): filtered on 'country_code', which
            // doesn't exist on the real jobs table — confirmed via
            // multiple other places this session that use the real column
            // (fraud detection trigger, chat job-search injection, the
            // original job-insert logic all use source_country). Filtering
            // on a nonexistent column returns a PostgREST error, not just
            // empty results — meaning selecting any specific country
            // likely broke the whole page with a visible error.
            if (selectedCountry && selectedCountry !== 'all') {
                query = query.eq('source_country', selectedCountry);
            }
            
            // Apply job type filter
            if (selectedJobType && selectedJobType !== 'all') {
                query = query.eq('job_type', selectedJobType);
            }
            
            const { data, error: queryError } = await query;
            
            if (queryError) {
                console.warn('Jobs query error:', queryError);
                if (queryError.code === '42P01') {
                    setJobs([]);
                    setError('Jobs table not found. Please contact support.');
                } else {
                    throw queryError;
                }
                return;
            }
            
            const jobsWithSource = (data || []).map(job => ({
                ...job,
                source: job.source_type === 'external' ? 'live' : 'database',
                visa_sponsorship: job.sponsorship_eligible || false
            }));
            
            setJobs(jobsWithSource);
            
            if (!lastFetchTime) {
                saveLastFetchTime();
            }
            
        } catch (err) {
            console.error('Error loading jobs:', err);
            setError(err.message);
            setJobs([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedCountry, selectedJobType]);

    // NEW (2026-08-16): logs meaningful searches as activity signals,
    // feeding the "Latest Trend Corner", opportunity-gap analysis, and
    // newsletter content. Debounced separately from the search trigger
    // above — logging on every keystroke would spam the table with
    // partial queries.
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 3) return;
        const timer = setTimeout(() => {
            fetch('/api/index?action=log-activity-signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signalType: 'search', queryText: searchQuery, sourcePage: 'jobs' })
            }).catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    const saveLastFetchTime = useCallback(() => {
        const now = new Date().toISOString();
        setLastFetchTime(now);
        localStorage.setItem('jobs_last_fetch_time', now);
    }, []);

    // ============================================
    // FILTER AND SORT JOBS
    // ============================================

    function filterAndSortJobs() {
        let filtered = [...jobs];
        
        // Search filter (additional client-side filtering)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(job => 
                job.title?.toLowerCase().includes(query) ||
                job.company?.toLowerCase().includes(query) ||
                job.description?.toLowerCase().includes(query) ||
                job.location?.toLowerCase().includes(query)
            );
        }
        
        // Country filter (additional client-side)
        if (selectedCountry !== 'all') {
            filtered = filtered.filter(job => 
                job.source_country === selectedCountry ||
                job.location?.includes(selectedCountry)
            );
        }
        
        // Job type filter
        if (selectedJobType !== 'all') {
            filtered = filtered.filter(job => job.job_type === selectedJobType);
        }
        
        // Salary range filter
        if (salaryRange.min) {
            filtered = filtered.filter(job => (job.salary_min || 0) >= parseInt(salaryRange.min));
        }
        if (salaryRange.max) {
            filtered = filtered.filter(job => (job.salary_max || 999999) <= parseInt(salaryRange.max));
        }
        
        // Visa sponsorship filter
        if (showVisaOnly) {
            filtered = filtered.filter(job => job.sponsorship_eligible === true);
        }
        
        // Sorting
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.posted_at) - new Date(b.posted_at));
                break;
            case 'salary_high':
                filtered.sort((a, b) => (b.salary_max || 0) - (a.salary_max || 0));
                break;
            case 'salary_low':
                filtered.sort((a, b) => (a.salary_min || 0) - (b.salary_min || 0));
                break;
            default:
                break;
        }
        
        setFilteredJobs(filtered);
    }

    function clearFilters() {
        setSearchQuery('');
        setSelectedCountry('all');
        setSelectedJobType('all');
        setSortBy('newest');
        setSalaryRange({ min: '', max: '' });
        setShowVisaOnly(false);
    }

    // ============================================
    // PAGINATION
    // ============================================

    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

    function goToPage(page) {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function formatTimeSinceLastFetch() {
        if (!lastFetchTime) return 'Never';
        const now = new Date();
        const lastFetch = new Date(lastFetchTime);
        const hoursSince = Math.floor((now - lastFetch) / (1000 * 60 * 60));
        if (hoursSince < 1) return 'Just now';
        if (hoursSince === 1) return '1 hour ago';
        return `${hoursSince} hours ago`;
    }

    function getCountryFlag(countryCode) {
        const flags = { GB: '🇬🇧', NG: '🇳🇬', IE: '🇮🇪', CA: '🇨🇦', US: '🇺🇸', DE: '🇩🇪', AU: '🇦🇺', FR: '🇫🇷' };
        return flags[countryCode] || '🌍';
    }

    function getCountryName(countryCode) {
        const names = { GB: 'United Kingdom', NG: 'Nigeria', IE: 'Ireland', CA: 'Canada', US: 'United States', DE: 'Germany', AU: 'Australia', FR: 'France' };
        return names[countryCode] || countryCode;
    }

    function getJobTypeBadge(jobType) {
        const type = JOB_TYPES.find(t => t.value === jobType);
        if (!type) return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400">Unknown</span>;
        return <span className={`text-xs px-2 py-0.5 rounded-full ${type.color}`}>{type.label}</span>;
    }

    function formatSalary(job) {
        if (job.salary_min && job.salary_max) {
            const formatter = new Intl.NumberFormat();
            return `${job.currency || '$'}${formatter.format(job.salary_min)} - ${job.currency || '$'}${formatter.format(job.salary_max)}`;
        }
        if (job.salary_range) return job.salary_range;
        return 'Competitive';
    }

    function handleApply(job) {
        if (job.external_apply_url) {
            window.open(job.external_apply_url, '_blank');
        } else if (!user) {
            window.location.href = `/sign-in?redirect=/jobs/${job.id}`;
        } else {
            window.location.href = `/jobs/${job.id}`;
        }
    }

    const hasActiveFilters = selectedCountry !== 'all' || selectedJobType !== 'all' || searchQuery !== '' || salaryRange.min || salaryRange.max || showVisaOnly;
    const totalJobs = filteredJobs.length;

    // Load data on mount and when filters change
    useEffect(() => {
        const savedTime = localStorage.getItem('jobs_last_fetch_time');
        if (savedTime) {
            setLastFetchTime(savedTime);
        }
    }, []);

    useEffect(() => {
        getUser();
        loadJobs();
        loadSavedJobs();
    }, []);

    useEffect(() => {
        filterAndSortJobs();
    }, [jobs, searchQuery, selectedCountry, selectedJobType, sortBy, salaryRange, showVisaOnly]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCountry, selectedJobType, sortBy, salaryRange, showVisaOnly]);

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading && jobs.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-900/30 via-slate-900 to-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 text-center">
                        Verified Job Marketplace
                    </h1>
                    {/* FIXED (2026-08-27): claimed "across 9 countries" -
                        the confirmed real coverage is 7 countries via
                        government/official sources (UK, US, Nigeria,
                        Canada, Australia, Germany, Ireland), plus genuine
                        global remote sources that aren't country-specific
                        at all. "9" appears to be stale from an earlier
                        iteration of this project. */}
                    <p className="text-sm sm:text-base text-slate-300 text-center max-w-2xl mx-auto">
                        Real job listings sourced from official government portals and verified employer career
                        pages across 7 countries, plus global remote opportunities.
                    </p>
                    
                    {/* Intelligence Banner */}
                    <div className="mt-3 sm:mt-4 p-3 bg-gradient-to-r from-primary-900/20 to-sky-900/20 border border-primary-500/30 rounded-xl max-w-2xl mx-auto">
                        <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 flex-shrink-0" />
                            <div>
                                <p className="text-white text-xs sm:text-sm font-medium">ODUSBABA Job Intelligence</p>
                                <p className="text-slate-400 text-[10px] sm:text-xs">Every job is verified for salary fairness, visa eligibility, and fraud signals</p>
                            </div>
                        </div>
                    </div>

                    <PageEdgeBanner>
                        Jobs tagged "Visa Sponsorship" or "Verified" come from official government portals or
                        career pages of employers cross-referenced against real sponsor license registers — not
                        generic scraped listings. Ask the AI chat things like "sponsorship jobs in UK for HR" for
                        live results pulled directly from these sources.
                    </PageEdgeBanner>

                    {/* Search Bar */}
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Job title, keywords, or company..."
                                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 text-sm sm:text-base"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-2.5 sm:py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white flex items-center gap-2 justify-center text-sm sm:text-base"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {hasActiveFilters && <span className="w-2 h-2 bg-primary-500 rounded-full"></span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="border-b border-slate-800 bg-slate-900/30">
                    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {/* Country Filter */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Country</label>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
                                >
                                    {COUNTRIES.map(country => (
                                        <option key={country.code} value={country.code}>
                                            {country.flag} {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Job Type Filter */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Job Type</label>
                                <select
                                    value={selectedJobType}
                                    onChange={(e) => setSelectedJobType(e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
                                >
                                    {JOB_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Sort By */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500 text-sm"
                                >
                                    {SORT_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Salary Range */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-slate-400 mb-1.5 sm:mb-2">Salary Range (USD)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={salaryRange.min}
                                        onChange={(e) => setSalaryRange({...salaryRange, min: e.target.value})}
                                        placeholder="Min"
                                        className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                    <input
                                        type="number"
                                        value={salaryRange.max}
                                        onChange={(e) => setSalaryRange({...salaryRange, max: e.target.value})}
                                        placeholder="Max"
                                        className="w-full px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Visa Sponsorship Toggle */}
                        <div className="mt-3 sm:mt-4">
                            <button
                                onClick={() => setShowVisaOnly(!showVisaOnly)}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition flex items-center gap-2 text-xs sm:text-sm ${
                                    showVisaOnly 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                Visa Sponsorship Only
                            </button>
                        </div>
                        
                        {hasActiveFilters && (
                            <div className="mt-3 sm:mt-4 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-xs sm:text-sm text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sort and Per Page Controls */}
            <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-slate-400 text-xs sm:text-sm">Show:</span>
                        <select
                            value={jobsPerPage}
                            onChange={(e) => { setJobsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className="px-2 sm:px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs sm:text-sm"
                        >
                            {PER_PAGE_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-slate-400 text-xs sm:text-sm">
                            Showing {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} jobs
                        </span>
                        <button
                            onClick={loadJobs}
                            disabled={loading}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            title="Refresh job listings from the database (new external jobs are added daily after admin approval)"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        {lastFetchTime && (
                            <span className="text-[10px] sm:text-xs text-slate-500" title={`Last viewed: ${new Date(lastFetchTime).toLocaleString()}`}>
                                Updated: {formatTimeSinceLastFetch()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 mb-4 sm:mb-6 sm:px-6 lg:px-8">
                    <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                        <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Job Cards Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
                {currentJobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 sm:p-12 text-center">
                        <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No jobs found</h3>
                        <p className="text-slate-400 text-sm">
                            {searchQuery || selectedCountry !== 'all' || selectedJobType !== 'all' || salaryRange.min || salaryRange.max || showVisaOnly
                                ? 'Try adjusting your search filters'
                                : 'Check back soon for new opportunities'}
                        </p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {currentJobs.map((job) => (
                            <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-primary-500/30 transition-all hover:-translate-y-1 duration-200">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                            <span className="text-xl sm:text-2xl">{getCountryFlag(job.source_country)}</span>
                                            <h3 className="text-base sm:text-lg font-semibold text-white">{job.title}</h3>
                                            {getJobTypeBadge(job.job_type)}
                                            {job.sponsorship_eligible && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                                    <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Visa Sponsorship
                                                </span>
                                            )}
                                            {job.source_type === 'authoritative' && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 flex items-center gap-1">
                                                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Verified
                                                </span>
                                            )}
                                            {job.source_type === 'external' && (
                                                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                                    <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Live
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-primary-400 text-xs sm:text-sm mb-1.5 sm:mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {job.company}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400 mb-2 sm:mb-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || getCountryName(job.source_country)}</span>
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatSalary(job)}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(job.posted_at).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {job.description && (
                                            <p className="text-slate-400 text-xs sm:text-sm line-clamp-2">
                                                {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
                                        <button 
                                            onClick={() => handleApply(job)}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                        >
                                            Apply {job.external_apply_url && <ExternalLink className="w-3 h-3" />}
                                        </button>
                                        <button 
                                            onClick={(e) => toggleSaveJob(job.id, e)}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition text-xs sm:text-sm flex items-center gap-1 justify-center"
                                        >
                                            {savedJobs.has(job.id) ? (
                                                <><BookmarkCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> Saved</>
                                            ) : (
                                                <><Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Save</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => goToPage(pageNum)}
                                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition text-xs sm:text-sm ${
                                            currentPage === pageNum
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Safety Notice */}
            <div className="max-w-7xl mx-auto px-4 pb-6 sm:pb-8 sm:px-6 lg:px-8">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 sm:p-4">
                    <p className="text-amber-400 text-xs sm:text-sm text-center flex flex-wrap items-center justify-center gap-1 sm:gap-2">
                        <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <strong>Safety First:</strong> Never pay for a job. Legitimate employers never ask for money upfront.
                        <Link to="/report-fraud" className="underline ml-1">Report suspicious listings</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
