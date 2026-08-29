// src/pages/admin/EmployerSourcesManager.jsx
// NEW (2026-08-28) — this page did not exist at all until now. The real
// backend actions (admin-add-employer-source, admin-bulk-import-employer-
// sources, admin-list-employer-sources, admin-deactivate-employer-source,
// admin-scrape-employer-sources) were built and working, but there was
// never a frontend page to actually use them - not an unrouted page like
// TwoFactorSettings was, but genuinely no frontend at all. Built here,
// wired into App.jsx and the admin nav dropdown so it's actually
// discoverable this time.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { authenticatedFetch } from '../../lib/authFetch';
import {
    Building2, Upload, Plus, Loader2, AlertCircle, CheckCircle,
    Trash2, RefreshCw, FileText, X, ShieldCheck
} from 'lucide-react';

export default function EmployerSourcesManager() {
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newSource, setNewSource] = useState({
        companyName: '', websiteUrl: '', careersPageUrl: '',
        isVerifiedSponsor: false, sponsorLicenseType: '', countryCode: 'GB'
    });

    const [csvText, setCsvText] = useState('');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileInputRef = useRef(null);

    const [scraping, setScraping] = useState(false);

    useEffect(() => { loadSources(); }, []);

    async function loadSources() {
        setLoading(true);
        setError(null);
        try {
            const data = await authenticatedFetch('admin-list-employer-sources', {}, { method: 'POST' });
            setSources(data.sources || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddSource(e) {
        e.preventDefault();
        if (!newSource.companyName || !newSource.websiteUrl) {
            setError('Company name and website URL are required.');
            return;
        }
        setAdding(true);
        setError(null);
        try {
            await authenticatedFetch('admin-add-employer-source', newSource);
            setMessage(`Added ${newSource.companyName}.`);
            setNewSource({ companyName: '', websiteUrl: '', careersPageUrl: '', isVerifiedSponsor: false, sponsorLicenseType: '', countryCode: 'GB' });
            setShowAddForm(false);
            await loadSources();
        } catch (err) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    }

    async function handleDeactivate(sourceId, companyName) {
        if (!confirm(`Deactivate ${companyName}? It will stop being scraped and will disappear from the public directory.`)) return;
        try {
            await authenticatedFetch('admin-deactivate-employer-source', { sourceId });
            await loadSources();
        } catch (err) {
            alert('Failed to deactivate: ' + err.message);
        }
    }

    async function handleForceScrape() {
        setScraping(true);
        setMessage(null);
        setError(null);
        try {
            const result = await authenticatedFetch('admin-scrape-employer-sources', {}, { method: 'POST' });
            setMessage(`Scrape complete. ${JSON.stringify(result).replace(/[{}"]/g, '').replace(/,/g, ', ')}`);
            await loadSources();
        } catch (err) {
            setError(err.message);
        } finally {
            setScraping(false);
        }
    }

    // Real CSV parsing - handles a header row (company_name,website_url,
    // careers_page_url,sponsor_license_type,country_code) or plain rows in
    // that same order without a header. Deliberately simple (split on
    // comma) rather than pulling in a CSV library for this one admin
    // page - real sponsor register exports are plain, comma-separated,
    // unquoted rows in practice.
    function parseCSV(text) {
        const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return [];

        const firstLineLower = lines[0].toLowerCase();
        const hasHeader = firstLineLower.includes('company') && firstLineLower.includes('website');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        return dataLines.map(line => {
            const cols = line.split(',').map(c => c.trim());
            return {
                companyName: cols[0] || '',
                websiteUrl: cols[1] || '',
                careersPageUrl: cols[2] || undefined,
                sponsorLicenseType: cols[3] || undefined,
                countryCode: cols[4] || 'GB'
            };
        }).filter(c => c.companyName && c.websiteUrl);
    }

    function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setCsvText(event.target.result);
        reader.readAsText(file);
    }

    async function handleBulkImport() {
        const companies = parseCSV(csvText);
        if (companies.length === 0) {
            setError('No valid rows found. Expected columns: company_name, website_url, careers_page_url (optional), sponsor_license_type (optional), country_code (optional).');
            return;
        }

        if (!confirm(`Import ${companies.length} companies as verified sponsors?`)) return;

        setImporting(true);
        setError(null);
        setImportResult(null);
        try {
            const result = await authenticatedFetch('admin-bulk-import-employer-sources', { companies });
            setImportResult(result);
            setCsvText('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            await loadSources();
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-primary-400" /> Verified Employer Sources
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Manage companies scraped for the public Verified Employer Directory and job sourcing.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleForceScrape}
                        disabled={scraping}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Scrape All Now
                    </button>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add One
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
            {message && (
                <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-emerald-400 text-sm">{message}</p>
                </div>
            )}

            {/* Single add form */}
            {showAddForm && (
                <form onSubmit={handleAddSource} className="mb-6 p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
                    <h2 className="text-white font-semibold mb-2">Add a single company</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                            type="text" placeholder="Company name *" required
                            value={newSource.companyName}
                            onChange={e => setNewSource({ ...newSource, companyName: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <input
                            type="url" placeholder="Website URL *" required
                            value={newSource.websiteUrl}
                            onChange={e => setNewSource({ ...newSource, websiteUrl: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <input
                            type="url" placeholder="Careers page URL (optional, scraped if given)"
                            value={newSource.careersPageUrl}
                            onChange={e => setNewSource({ ...newSource, careersPageUrl: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <input
                            type="text" placeholder="Country code (e.g. GB, NG, US)"
                            value={newSource.countryCode}
                            onChange={e => setNewSource({ ...newSource, countryCode: e.target.value.toUpperCase() })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <input
                            type="text" placeholder="Sponsor license type (optional)"
                            value={newSource.sponsorLicenseType}
                            onChange={e => setNewSource({ ...newSource, sponsorLicenseType: e.target.value })}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                checked={newSource.isVerifiedSponsor}
                                onChange={e => setNewSource({ ...newSource, isVerifiedSponsor: e.target.checked })}
                                className="rounded border-slate-600"
                            />
                            Verified sponsor
                        </label>
                    </div>
                    <button type="submit" disabled={adding} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2">
                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Company
                    </button>
                </form>
            )}

            {/* Bulk CSV import - the feature that was missing */}
            <div className="mb-6 p-5 bg-slate-900/50 border border-slate-800 rounded-xl">
                <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary-400" /> Bulk Import from CSV
                </h2>
                <p className="text-slate-400 text-xs mb-3">
                    Columns: company_name, website_url, careers_page_url (optional), sponsor_license_type (optional), country_code (optional).
                    Bulk-imported companies are automatically marked as verified sponsors.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition flex items-center gap-2 text-sm"
                    >
                        <FileText className="w-4 h-4" /> Choose CSV File
                    </button>
                    <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileSelect} className="hidden" />
                    {csvText && (
                        <span className="text-xs text-slate-500 self-center">
                            {parseCSV(csvText).length} valid rows detected
                        </span>
                    )}
                </div>
                <textarea
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    rows={6}
                    placeholder={"Or paste CSV rows directly here, e.g.:\ncompany_name,website_url,careers_page_url,sponsor_license_type,country_code\nAcme Ltd,https://acme.com,https://acme.com/careers,A-rated,GB"}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                    onClick={handleBulkImport}
                    disabled={importing || !csvText.trim()}
                    className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import {csvText.trim() ? `${parseCSV(csvText).length} Companies` : ''}
                </button>

                {importResult && (
                    <div className="mt-3 p-3 bg-slate-800/50 rounded-lg text-sm">
                        <p className="text-emerald-400">✓ Added: {importResult.added}</p>
                        <p className="text-slate-400">Skipped (already existed or invalid): {importResult.skipped}</p>
                        {importResult.errors?.length > 0 && (
                            <div className="mt-2 text-red-400 text-xs">
                                {importResult.errors.map((e, i) => (
                                    <p key={i}>• {e.company}: {e.error}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Existing sources table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto" />
                    </div>
                ) : sources.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No employer sources added yet. Use the form above or bulk-import a CSV to get started.
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 text-left text-slate-500">
                                <th className="p-3">Company</th>
                                <th className="p-3">Country</th>
                                <th className="p-3">Sponsor</th>
                                <th className="p-3">Last Scraped</th>
                                <th className="p-3">Status</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sources.map(source => (
                                <tr key={source.id} className="border-b border-slate-800/50">
                                    <td className="p-3 text-white">
                                        <a href={source.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary-400">
                                            {source.company_name}
                                        </a>
                                    </td>
                                    <td className="p-3 text-slate-400">{source.country_code}</td>
                                    <td className="p-3">
                                        {source.is_verified_sponsor ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                                                <ShieldCheck className="w-3 h-3" /> Verified
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-slate-400 text-xs">
                                        {source.last_scraped_at ? new Date(source.last_scraped_at).toLocaleString() : 'Never'}
                                        {source.last_scrape_status && (
                                            <span className={`ml-2 ${source.last_scrape_status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                ({source.last_scrape_status})
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {source.is_active ? (
                                            <span className="text-emerald-400 text-xs">Active</span>
                                        ) : (
                                            <span className="text-slate-500 text-xs">Inactive</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {source.is_active && (
                                            <button
                                                onClick={() => handleDeactivate(source.id, source.company_name)}
                                                className="text-slate-500 hover:text-red-400 transition"
                                                title="Deactivate"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
