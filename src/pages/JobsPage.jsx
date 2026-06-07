// src/pages/JobsPage.jsx
// ODUSBABA JOB BOARD v3.1 - PRODUCTION READY
// ✅ Live job fetching from external sources (daily auto-refresh)
// ✅ Advanced filtering and pagination
// ✅ Database persistence with external jobs
// ✅ Save Job functionality
// ✅ Source badges (Live/Verified)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Briefcase, MapPin, DollarSign, Building2, Clock, 
    Search, Filter, Loader2, AlertCircle, ExternalLink,
    Calendar, ChevronLeft, ChevronRight, X, TrendingUp,
    Star, Award, Shield, Zap, RefreshCw, Bookmark, BookmarkCheck
} from 'lucide-react';

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingLive, setFetchingLive] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [savedJobs, setSavedJobs] = useState(new Set());
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [jobsPerPage, setJobsPerPage] = useState(50);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [selectedJobType, setSelectedJobType] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    const [salaryRange, setSalaryRange] = useState({ min: '', max: '' });
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // Country options
    const countries = [
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
    const jobTypes = [
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
    const sortOptions = [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'salary_high', label: 'Highest Salary' },
        { value: 'salary_low', label: 'Lowest Salary' }
    ];

    // Jobs per page options
    const perPageOptions = [25, 50, 100, 250];

    // Helper function to check if refresh is needed
    function shouldRefreshJobs() {
        if (!lastFetchTime) return true;
        
        const now = new Date();
        const lastFetch = new Date(lastFetchTime);
        const hoursSinceLastFetch = (now - lastFetch) / (1000 * 60 * 60);
        
        // Refresh if more than 24 hours have passed
        return hoursSinceLastFetch >= 24;
    }

    // Save last fetch time to localStorage
    function saveLastFetchTime() {
        const now = new Date().toISOString();
        setLastFetchTime(now);
        localStorage.setItem('jobs_last_fetch_time', now);
    }

    // Load last fetch time from localStorage on init
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
        
        // Check for refresh every hour (to see if 24 hours have passed)
        const interval = setInterval(() => {
            if (shouldRefreshJobs()) {
                console.log('🔄 24 hours passed, refreshing jobs...');
                loadJobs();
            }
        }, 60 * 60 * 1000); // Check every hour
        
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        filterAndSortJobs();
    }, [jobs, searchQuery, selectedCountry, selectedJobType, sortBy, salaryRange]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCountry, selectedJobType, sortBy, salaryRange]);

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
            // Unsave
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
            // Save
            await supabase
                .from('saved_jobs')
                .insert({ user_id: user.id, job_id: jobId });
            setSavedJobs(prev => new Set([...prev, jobId]));
        }
    }

    async function loadJobs() {
        setLoading(true);
        setError(null);
        
        try {
            // 1. Fetch from database (existing jobs)
            const { data: dbJobs, error: dbError } = await supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .eq('compliance_status', 'approved')
                .order('posted_at', { ascending: false });
            
            if (dbError) throw dbError;
            
            // 2. Check if we need to fetch live jobs (once daily)
            if (shouldRefreshJobs()) {
                await fetchLiveJobs();
                saveLastFetchTime();
            }
            
            // 3. Fetch updated database jobs after potential live job insert
            const { data: updatedDbJobs, error: updatedDbError } = await supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .eq('compliance_status', 'approved')
                .order('posted_at', { ascending: false });
            
            if (updatedDbError) throw updatedDbError;
            
            // Add source indicator
            const jobsWithSource = (updatedDbJobs || []).map(job => ({
                ...job,
                source: job.source_type === 'external' ? 'live' : 'database'
            }));
            
            setJobs(jobsWithSource);
            
            if (!lastFetchTime) {
                saveLastFetchTime();
            }
            
        } catch (err) {
            console.error('Error loading jobs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchLiveJobs() {
        setFetchingLive(true);
        try {
            // Call unified API to fetch jobs
            const response = await fetch('/api/index?action=jobs', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) throw new Error('Failed to fetch jobs');
            
            const data = await response.json();
            
            if (data.success && data.jobs && data.jobs.length > 0) {
                let newJobsCount = 0;
                
                // Save to database for persistence
                for (const job of data.jobs) {
                    // Check if job already exists
                    const { data: existing } = await supabase
                        .from('jobs')
                        .select('id')
                        .eq('title', job.title)
                        .eq('company', job.company)
                        .maybeSingle();
                    
                    if (!existing) {
                        await supabase.from('jobs').insert({
                            title: job.title,
                            company: job.company,
                            location: job.location || 'Remote',
                            description: job.description,
                            salary_range: job.salary_range,
                            job_type: job.job_type || 'full_time',
                            external_apply_url: job.external_url,
                            source_type: 'external',
                            source_name: job.source_name || 'Jobicy',
                            compliance_status: 'approved',
                            is_active: true,
                            posted_at: new Date().toISOString(),
                            country_code: job.source_country || 'Global'
                        });
                        newJobsCount++;
                    }
                }
                
                console.log(`✅ Fetched ${data.jobs.length} live jobs (${newJobsCount} new)`);
            }
        } catch (err) {
            console.error('Live job fetch error:', err);
            // Don't show error to user - fallback to database jobs only
        } finally {
            setFetchingLive(false);
        }
    }

    function filterAndSortJobs() {
        let filtered = [...jobs];
        
        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(job => 
                job.title?.toLowerCase().includes(query) ||
                job.company?.toLowerCase().includes(query) ||
                job.description?.toLowerCase().includes(query) ||
                job.location?.toLowerCase().includes(query)
            );
        }
        
        // Country filter
        if (selectedCountry !== 'all') {
            filtered = filtered.filter(job => 
                job.country_code === selectedCountry ||
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
    }

    // Pagination calculations
    const indexOfLastJob = currentPage * jobsPerPage;
    const indexOfFirstJob = indexOfLastJob - jobsPerPage;
    const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

    function goToPage(page) {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

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
        const type = jobTypes.find(t => t.value === jobType);
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

    const hasActiveFilters = selectedCountry !== 'all' || selectedJobType !== 'all' || searchQuery !== '' || salaryRange.min || salaryRange.max;
    const totalJobs = filteredJobs.length;

    if (loading && jobs.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-900/30 via-slate-900 to-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                        <Briefcase className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-center">
                        Find Your Next Opportunity
                    </h1>
                    <p className="text-lg text-slate-300 text-center max-w-2xl mx-auto">
                        Browse thousands of jobs from trusted employers and government sources across 9 countries.
                    </p>
                    
                    {/* Live Job Fetch Indicator */}
                    {fetchingLive && (
                        <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-center justify-center gap-2 max-w-md mx-auto">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                            <p className="text-primary-400 text-sm">Fetching latest jobs...</p>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Job title, keywords, or company..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white flex items-center gap-2 justify-center"
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
                    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Country Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Country</label>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    {countries.map(country => (
                                        <option key={country.code} value={country.code}>
                                            {country.flag} {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Job Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Job Type</label>
                                <select
                                    value={selectedJobType}
                                    onChange={(e) => setSelectedJobType(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    {jobTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Sort By */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Sort By</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                >
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Salary Range */}
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Salary Range (USD)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={salaryRange.min}
                                        onChange={(e) => setSalaryRange({...salaryRange, min: e.target.value})}
                                        placeholder="Min"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                    <input
                                        type="number"
                                        value={salaryRange.max}
                                        onChange={(e) => setSalaryRange({...salaryRange, max: e.target.value})}
                                        placeholder="Max"
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {hasActiveFilters && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sort and Per Page Controls */}
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">Show:</span>
                        <select
                            value={jobsPerPage}
                            onChange={(e) => { setJobsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        >
                            {perPageOptions.map(option => (
                                <option key={option} value={option}>{option} per page</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">
                            Showing {indexOfFirstJob + 1}-{Math.min(indexOfLastJob, filteredJobs.length)} of {filteredJobs.length} jobs
                        </span>
                        <button
                            onClick={loadJobs}
                            disabled={fetchingLive}
                            className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                            title="Manually refresh jobs (auto-refreshes daily)"
                        >
                            <RefreshCw className={`w-3 h-3 ${fetchingLive ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        {lastFetchTime && (
                            <span className="text-xs text-slate-500" title={`Last updated: ${new Date(lastFetchTime).toLocaleString()}`}>
                                Updated: {formatTimeSinceLastFetch()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 mb-6 sm:px-6 lg:px-8">
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Job Cards Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
                {currentJobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
                        <p className="text-slate-400">
                            {searchQuery || selectedCountry !== 'all' || selectedJobType !== 'all' || salaryRange.min || salaryRange.max
                                ? 'Try adjusting your search filters'
                                : 'Check back soon for new opportunities'}
                        </p>
                        {hasActiveFilters && (
                            <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {currentJobs.map((job) => (
                            <div key={job.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all hover:-translate-y-1 duration-200">
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-2xl">{getCountryFlag(job.country_code)}</span>
                                            <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                                            {getJobTypeBadge(job.job_type)}
                                            {job.source_type === 'authoritative' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> Verified Source
                                                </span>
                                            )}
                                            {job.source_type === 'external' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                                    <Zap className="w-3 h-3" /> Live
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-primary-400 text-sm mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {job.company}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location || getCountryName(job.country_code)}</span>
                                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {formatSalary(job)}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(job.posted_at).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {job.description && (
                                            <p className="text-slate-400 text-sm line-clamp-2">
                                                {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-row md:flex-col gap-2">
                                        <button 
                                            onClick={() => handleApply(job)}
                                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                        >
                                            Apply Now {job.external_apply_url && <ExternalLink className="w-3 h-3" />}
                                        </button>
                                        <button 
                                            onClick={(e) => toggleSaveJob(job.id, e)}
                                            className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition text-sm flex items-center gap-1 justify-center"
                                        >
                                            {savedJobs.has(job.id) ? (
                                                <><BookmarkCheck className="w-4 h-4 text-emerald-400" /> Saved</>
                                            ) : (
                                                <><Bookmark className="w-4 h-4" /> Save Job</>
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
                    <div className="flex justify-center items-center gap-2 mt-8 pt-4 border-t border-slate-800">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <ChevronLeft className="w-5 h-5" />
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
                                        className={`w-10 h-10 rounded-lg transition ${
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
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Safety Notice */}
            <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-amber-400 text-sm text-center flex items-center justify-center gap-2">
                        <Shield className="w-4 h-4" />
                        <strong>Safety First:</strong> Never pay for a job. Legitimate employers never ask for money upfront.
                        <Link to="/report-fraud" className="underline ml-1">Report suspicious listings</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
