// src/pages/JobsPage.jsx
// COMPLETE REWRITE - Card layout with job type badges, country flags, and apply buttons

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Briefcase, 
    Search, 
    MapPin, 
    DollarSign, 
    Clock, 
    Building2,
    Filter,
    X,
    ChevronDown,
    Loader2,
    ExternalLink
} from 'lucide-react';

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    
    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('all');
    const [selectedJobType, setSelectedJobType] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [showFilters, setShowFilters] = useState(false);
    
    // Country options
    const countries = [
        { code: 'all', name: 'All Countries', flag: '🌍' },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
        { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
        { code: 'CA', name: 'Canada', flag: '🇨🇦' },
        { code: 'US', name: 'United States', flag: '🇺🇸' },
        { code: 'DE', name: 'Germany', flag: '🇩🇪' },
        { code: 'AU', name: 'Australia', flag: '🇦🇺' }
    ];
    
    // Job type options
    const jobTypes = [
        { value: 'all', label: 'All Types' },
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

    useEffect(() => {
        getUser();
        fetchJobs();
    }, []);

    useEffect(() => {
        filterAndSortJobs();
    }, [jobs, searchQuery, selectedCountry, selectedJobType, sortBy]);

    async function getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    async function fetchJobs() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('is_active', true)
                .eq('compliance_status', 'approved')
                .order('posted_at', { ascending: false });
            
            if (error) throw error;
            setJobs(data || []);
            setFilteredJobs(data || []);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
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
            filtered = filtered.filter(job => job.country_code === selectedCountry);
        }
        
        // Job type filter
        if (selectedJobType !== 'all') {
            filtered = filtered.filter(job => job.job_type === selectedJobType);
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
    }

    function getCountryFlag(countryCode) {
        const flags = {
            GB: '🇬🇧',
            NG: '🇳🇬',
            IE: '🇮🇪',
            CA: '🇨🇦',
            US: '🇺🇸',
            DE: '🇩🇪',
            AU: '🇦🇺'
        };
        return flags[countryCode] || '🌍';
    }

    function getCountryName(countryCode) {
        const names = {
            GB: 'United Kingdom',
            NG: 'Nigeria',
            IE: 'Ireland',
            CA: 'Canada',
            US: 'United States',
            DE: 'Germany',
            AU: 'Australia'
        };
        return names[countryCode] || countryCode;
    }

    function getJobTypeBadge(jobType) {
        const types = {
            full_time: { label: 'Full Time', color: 'bg-emerald-500/20 text-emerald-400' },
            part_time: { label: 'Part Time', color: 'bg-blue-500/20 text-blue-400' },
            remote: { label: 'Remote', color: 'bg-purple-500/20 text-purple-400' },
            contract: { label: 'Contract', color: 'bg-amber-500/20 text-amber-400' },
            freelance: { label: 'Freelance', color: 'bg-pink-500/20 text-pink-400' },
            hybrid: { label: 'Hybrid', color: 'bg-cyan-500/20 text-cyan-400' },
            onsite: { label: 'On-site', color: 'bg-slate-500/20 text-slate-400' }
        };
        const info = types[jobType] || { label: jobType || 'Unknown', color: 'bg-slate-500/20 text-slate-400' };
        return <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>;
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
        if (!user) {
            // Redirect to sign in with return URL
            window.location.href = `/sign-in?redirect=/jobs/${job.id}`;
            return;
        }
        // Navigate to job detail page where they can apply
        window.location.href = `/jobs/${job.id}`;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
                    <p className="text-slate-400">Loading jobs...</p>
                </div>
            </div>
        );
    }

    const hasActiveFilters = selectedCountry !== 'all' || selectedJobType !== 'all' || searchQuery !== '';

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-900/30 via-slate-900 to-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Find Your Next Opportunity
                    </h1>
                    <p className="text-lg text-slate-300 max-w-2xl">
                        Browse thousands of jobs from trusted employers across 7 countries.
                        Verified listings. No scams.
                    </p>
                    
                    {/* Search Bar */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {/* Results Count */}
            <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                <p className="text-slate-400 text-sm">
                    Showing {filteredJobs.length} of {jobs.length} jobs
                </p>
            </div>

            {/* Job Cards Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
                {filteredJobs.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No jobs found</h3>
                        <p className="text-slate-400">
                            Try adjusting your search or filters to find more opportunities.
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredJobs.map((job) => (
                            <div 
                                key={job.id} 
                                className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all hover:-translate-y-1 duration-200"
                            >
                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                    {/* Job Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className="text-2xl">{getCountryFlag(job.country_code)}</span>
                                            <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                                            {getJobTypeBadge(job.job_type)}
                                            {job.source_type === 'authoritative' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">
                                                    ✓ Verified Source
                                                </span>
                                            )}
                                        </div>
                                        
                                        <p className="text-primary-400 text-sm mb-2 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {job.company}
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {job.location || getCountryName(job.country_code)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" /> {formatSalary(job)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(job.posted_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        
                                        {job.description && (
                                            <p className="text-slate-400 text-sm line-clamp-2">
                                                {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                                            </p>
                                        )}
                                        
                                        <div className="flex items-center gap-4 mt-3">
                                            {job.external_apply_url && (
                                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" />
                                                    External listing
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Apply Button */}
                                    <div className="flex flex-row md:flex-col gap-2">
                                        {job.external_apply_url ? (
                                            <a
                                                href={job.external_apply_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                            >
                                                Apply on Source <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <button
                                                onClick={() => handleApply(job)}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors text-sm font-medium flex items-center gap-1 whitespace-nowrap"
                                            >
                                                Apply Now →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Safety Notice */}
            <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-amber-400 text-sm text-center">
                        🔒 <strong>Safety First:</strong> Never pay for a job. Legitimate employers never ask for money upfront.
                        <Link to="/report-fraud" className="underline ml-2">Report suspicious listings</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
