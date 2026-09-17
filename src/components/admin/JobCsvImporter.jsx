// src/components/admin/JobCsvImporter.jsx
//
// NEW (2026-09-17): job CSV bulk-import - for manually-scraped or
// externally-sourced job data the admin has already personally
// reviewed before uploading. Matches the same safe, chunked pattern
// already proven for employer CSV imports (30-per-batch here, given
// job rows are typically larger than employer directory rows, to stay
// well under Vercel's request size limit).

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, Loader2, X, FileText } from 'lucide-react';

const REQUIRED_COLUMNS = ['title'];
const EXPECTED_COLUMNS = [
    'title', 'company', 'location', 'description', 'salary_range',
    'salary_min', 'salary_max', 'job_type', 'external_apply_url',
    'country_code', 'source_name', 'sponsorship_eligible'
];

function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        // Simple CSV split that handles quoted commas
        const values = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) || [];
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = (values[idx] || '').trim().replace(/^"|"$/g, '');
        });
        if (row.title) rows.push(row);
    }
    return rows;
}

export default function JobCsvImporter({ onClose }) {
    const [csvText, setCsvText] = useState('');
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(null);
    const [result, setResult] = useState(null);

    const parsedRows = csvText.trim() ? parseCSV(csvText) : [];

    async function handleImport() {
        if (parsedRows.length === 0) {
            alert('No valid rows found. Expected a "title" column at minimum.');
            return;
        }
        if (!confirm(`Import ${parsedRows.length} jobs directly as live, approved listings?`)) return;

        setImporting(true);
        setResult(null);

        // Same safe, chunked pattern already proven for employer CSV
        // imports - avoids the 413 payload-too-large error a single,
        // large request would hit.
        const CHUNK_SIZE = 30;
        const chunks = [];
        for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
            chunks.push(parsedRows.slice(i, i + CHUNK_SIZE));
        }

        const aggregate = { added: 0, failed: 0, errors: [] };
        setProgress({ current: 0, total: chunks.length });

        const { data: { session } } = await supabase.auth.getSession();

        for (let i = 0; i < chunks.length; i++) {
            try {
                const response = await fetch('/api/index?action=admin-bulk-import-jobs-csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                    },
                    body: JSON.stringify({ jobs: chunks[i] })
                });
                const data = await response.json();
                aggregate.added += data.added || 0;
                aggregate.failed += data.failed || 0;
                if (data.errors?.length) aggregate.errors.push(...data.errors);
            } catch (err) {
                aggregate.errors.push({ row: `Batch ${i + 1}`, error: err.message });
                aggregate.failed += chunks[i].length;
            }
            setProgress({ current: i + 1, total: chunks.length });
        }

        setResult(aggregate);
        setProgress(null);
        setImporting(false);
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-400" /> Bulk Import Jobs (CSV)
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-slate-400 text-sm mb-3">
                    For manually-collected job data you've already reviewed - imported directly as live, approved listings, not sent to a pending queue.
                </p>
                <p className="text-slate-500 text-xs mb-4">
                    Required: <span className="text-slate-300">title</span>. Recognized columns: {EXPECTED_COLUMNS.join(', ')}
                </p>

                <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    rows={10}
                    placeholder="title,company,location,description,job_type,external_apply_url&#10;Software Engineer,Acme Ltd,London,Great role...,full_time,https://..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono mb-4"
                />

                {csvText.trim() && (
                    <p className="text-slate-400 text-sm mb-4">{parsedRows.length} valid row(s) detected</p>
                )}

                <button
                    onClick={handleImport}
                    disabled={importing || parsedRows.length === 0}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Import {parsedRows.length > 0 ? `${parsedRows.length} Jobs` : ''}
                </button>

                {progress && (
                    <div className="mt-3">
                        <p className="text-sm text-slate-400 mb-1">Importing batch {progress.current} of {progress.total}...</p>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                        </div>
                    </div>
                )}

                {result && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${result.failed === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <p>✓ Added: {result.added} — Failed: {result.failed}</p>
                        {result.errors.length > 0 && (
                            <ul className="mt-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                                {result.errors.map((e, i) => (
                                    <li key={i}>- {e.row}: {e.error}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
