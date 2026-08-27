// src/pages/VerifiedEmployersPage.jsx
// NEW (2026-08-27) — public directory of verified sponsor/employer
// companies, built from the verified_employer_sources table populated
// via admin-add-employer-source / admin-bulk-import-employer-sources.
// Genuinely valuable to show even for companies with zero scraped jobs
// right now - "here is a real, government-cross-referenced company known
// to sponsor" is useful information on its own, distinct from whether
// any specific vacancy was successfully pulled from their site today.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ExternalLink, ShieldCheck, Search, Loader2, Globe } from 'lucide-react';

const API_BASE = '/api/index';

const COUNTRIES = [
    { code: '', label: 'All Countries' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'US', label: 'United States' },
    { code: 'NG', label: 'Nigeria' },
    { code: 'CA', label: 'Canada' },
    { code: 'AU', label: 'Australia' },
    { code: 'DE', label: 'Germany' },
    { code: 'IE', label: 'Ireland' }
];

export default function VerifiedEmployersPage() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [country, setCountry] = useState('');

    useEffect(() => {
        loadCompanies();
    }, [country]);

    async function loadCompanies() {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ action: 'verified-employers-list' });
            if (country) params.append('country', country);

            const response = await fetch(`${API_BASE}?${params.toString()}`);
            const result = await response.json();

            if (!result.success) throw new Error(result.error || 'Failed to load directory');
            setCompanies(result.companies || []);
        } catch (err) {
            console.error('Error loading verified employers:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const filtered = companies.filter(c =>
        !searchTerm.trim() || c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm mb-4">
                        <ShieldCheck className="w-4 h-4" /> Government-Verified
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Verified Employer Directory</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Real companies cross-referenced against official government registers, including sponsor
                        license records. Visit any company's careers page directly, or browse jobs we've sourced
                        automatically from their published listings.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search companies..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-16 text-red-400">Unable to load the directory: {error}</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
                        <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No verified employers match your search yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filtered.map(company => (
                            <div key={company.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <h3 className="text-white font-semibold">{company.company_name}</h3>
                                    {company.is_verified_sponsor && (
                                        <span className="flex-shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                                            <ShieldCheck className="w-3 h-3" /> Verified Sponsor
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
                                    <Globe className="w-3.5 h-3.5" /> {COUNTRIES.find(c => c.code === company.country_code)?.label || company.country_code}
                                    {company.sponsor_license_type && ` · ${company.sponsor_license_type}`}
                                </p>
                                <a
                                    href={company.careers_page_url || company.website_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary-400 text-sm hover:underline"
                                >
                                    View careers page <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-center text-slate-500 text-xs mt-10">
                    Jobs sourced automatically from these companies still go through the same review process as
                    every other listing before appearing on the <Link to="/jobs" className="text-primary-400 hover:underline">job board</Link>.
                </p>
            </div>
        </div>
    );
}
