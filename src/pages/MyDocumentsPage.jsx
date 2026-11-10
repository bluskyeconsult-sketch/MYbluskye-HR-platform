// src/pages/MyDocumentsPage.jsx
// NEW (2026-11-10): "My Documents" - a private, moderate word processor and spreadsheet for members.
// No extra libraries: the editor uses the browser's own editing, the spreadsheet uses src/lib/sheetEngine.js.
// Saved to the user_documents table (SQL 37): only the owner can read or change a row. Limits are enforced by the database.
//   Documents: headings, bold/italic/underline, lists, alignment, links, tables. Import .txt/.html. Export Word (.doc), print or save as PDF.
//   Spreadsheets: up to 200 rows by 26 columns, formulas (SUM, AVERAGE, MIN, MAX, COUNT, ROUND, ABS and + - * / ^). Import/export CSV.
// Not included: .docx or .xlsx import/export, images, macros, pivot tables, charts.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sanitizeHtml, textToHtml, escapeHtml } from '../lib/docSanitize';
import { MAX_ROWS, MAX_COLS, colName, cellKey, evaluateAll, csvToCells, cellsToCsv } from '../lib/sheetEngine';
import { FileText, Table2, Plus, Trash2, ArrowLeft, Save, Download, Upload, Printer, Loader2, AlertCircle } from 'lucide-react';

const DOC_STYLE = `
.odu-doc { min-height: 480px; outline: none; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.6; color: #0f172a; }
.odu-doc h1 { font-size: 1.9em; font-weight: 700; margin: .6em 0 .3em; }
.odu-doc h2 { font-size: 1.5em; font-weight: 700; margin: .6em 0 .3em; }
.odu-doc h3 { font-size: 1.2em; font-weight: 700; margin: .6em 0 .3em; }
.odu-doc p { margin: 0 0 .7em; }
.odu-doc ul { list-style: disc; padding-left: 1.6em; margin: 0 0 .7em; }
.odu-doc ol { list-style: decimal; padding-left: 1.6em; margin: 0 0 .7em; }
.odu-doc a { color: #1d4ed8; text-decoration: underline; }
.odu-doc table { border-collapse: collapse; margin: .5em 0 1em; width: 100%; }
.odu-doc td, .odu-doc th { border: 1px solid #94a3b8; padding: 6px 8px; min-width: 60px; }
.odu-doc blockquote { border-left: 3px solid #94a3b8; margin: 0 0 .7em; padding-left: 12px; color: #334155; }
`;

const FREE_LIMIT_TEXT = 'You have reached your limit of saved items. Delete one you no longer need, or upgrade for more space.';

function downloadBlob(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(title, ext) {
    const base = (title || 'document').replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'document';
    return base + '.' + ext;
}

// ---------------------------------------------------------------- document editor
function ToolButton({ label, onClick, children, active }) {
    return (
        <button type="button" title={label} aria-label={label}
            onMouseDown={(e) => e.preventDefault()} onClick={onClick}
            className={`px-2.5 py-1.5 rounded text-sm hover:bg-slate-700 ${active ? 'bg-slate-700' : ''} text-slate-200`}>
            {children}
        </button>
    );
}

function DocEditor({ editorRef, initialHtml, onChange }) {
    const [linkOpen, setLinkOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('https://');
    const savedRange = useRef(null);

    useEffect(() => {
        if (editorRef.current) editorRef.current.innerHTML = sanitizeHtml(initialHtml) || '<p><br></p>';
        // set once when the editor opens; after that the browser owns the content
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const run = (cmd, value = null) => {
        editorRef.current && editorRef.current.focus();
        document.execCommand(cmd, false, value);
        onChange();
    };
    const insertTable = () => {
        const cell = '<td><br></td>';
        const row = '<tr>' + cell + cell + cell + '</tr>';
        run('insertHTML', '<table><tbody>' + row + row + row + '</tbody></table><p><br></p>');
    };
    const rememberSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
    };
    const applyLink = () => {
        const url = linkUrl.trim();
        if (/^(https?:\/\/|mailto:)/i.test(url)) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            if (savedRange.current) sel.addRange(savedRange.current);
            run('createLink', url);
        }
        setLinkOpen(false); setLinkUrl('https://');
    };

    return (
        <div>
            <style>{DOC_STYLE}</style>
            <div className="flex flex-wrap items-center gap-1 bg-slate-800 border border-slate-700 rounded-t-xl px-2 py-1.5" role="toolbar" aria-label="Formatting">
                <select aria-label="Text style" defaultValue="P"
                    onChange={(e) => { run('formatBlock', e.target.value); e.target.value = 'P'; }}
                    className="bg-slate-900 text-slate-200 text-sm rounded px-2 py-1.5 border border-slate-700">
                    <option value="P">Paragraph</option>
                    <option value="H1">Heading 1</option>
                    <option value="H2">Heading 2</option>
                    <option value="H3">Heading 3</option>
                </select>
                <ToolButton label="Bold" onClick={() => run('bold')}><b>B</b></ToolButton>
                <ToolButton label="Italic" onClick={() => run('italic')}><i>I</i></ToolButton>
                <ToolButton label="Underline" onClick={() => run('underline')}><u>U</u></ToolButton>
                <span className="w-px h-5 bg-slate-600 mx-1" />
                <ToolButton label="Bulleted list" onClick={() => run('insertUnorderedList')}>• List</ToolButton>
                <ToolButton label="Numbered list" onClick={() => run('insertOrderedList')}>1. List</ToolButton>
                <span className="w-px h-5 bg-slate-600 mx-1" />
                <ToolButton label="Align left" onClick={() => run('justifyLeft')}>Left</ToolButton>
                <ToolButton label="Centre" onClick={() => run('justifyCenter')}>Centre</ToolButton>
                <ToolButton label="Align right" onClick={() => run('justifyRight')}>Right</ToolButton>
                <span className="w-px h-5 bg-slate-600 mx-1" />
                <ToolButton label="Insert table" onClick={insertTable}>Table</ToolButton>
                <ToolButton label="Add link" onClick={() => { rememberSelection(); setLinkOpen(o => !o); }}>Link</ToolButton>
                <ToolButton label="Undo" onClick={() => run('undo')}>Undo</ToolButton>
                <ToolButton label="Redo" onClick={() => run('redo')}>Redo</ToolButton>
            </div>
            {linkOpen && (
                <div className="flex gap-2 items-center bg-slate-800 border-x border-b border-slate-700 px-3 py-2">
                    <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} aria-label="Link address"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white" />
                    <button type="button" onClick={applyLink} className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white rounded text-sm">Add</button>
                </div>
            )}
            <div className="bg-white rounded-b-xl border border-slate-700 p-6 sm:p-10">
                <div ref={editorRef} className="odu-doc" contentEditable suppressContentEditableWarning
                    role="textbox" aria-multiline="true" aria-label="Document"
                    onInput={onChange}
                    onPaste={(e) => {
                        // paste as clean text so no outside formatting or scripts come in
                        e.preventDefault();
                        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                        document.execCommand('insertText', false, text);
                    }} />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- spreadsheet
function SheetCell({ k, raw, shown, onCommit, onMove }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const isNumber = typeof shown === 'number';
    const isError = typeof shown === 'string' && shown.startsWith('#');
    return (
        <td className="p-0 border border-slate-700 min-w-[88px]">
            <input
                aria-label={'Cell ' + k}
                value={editing ? draft : (shown === undefined ? '' : String(shown))}
                onFocus={() => { setDraft(raw || ''); setEditing(true); }}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => { setEditing(false); if (draft !== (raw || '')) onCommit(k, draft); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); onMove(k, 1, 0); }
                    if (e.key === 'ArrowDown' && !e.shiftKey) { onMove(k, 1, 0); }
                    if (e.key === 'ArrowUp' && !e.shiftKey) { onMove(k, -1, 0); }
                }}
                className={`w-full bg-slate-900 px-2 py-1.5 text-sm outline-none focus:bg-slate-800 focus:ring-1 focus:ring-primary-500 ${isNumber ? 'text-right text-emerald-200' : 'text-left text-slate-100'} ${isError ? 'text-red-400' : ''}`}
            />
        </td>
    );
}

function SheetEditor({ sheet, setSheet }) {
    const values = useMemo(() => evaluateAll(sheet.cells), [sheet.cells]);
    const tableRef = useRef(null);

    const commit = useCallback((k, v) => {
        setSheet(prev => {
            const cells = { ...prev.cells };
            if (v === '') delete cells[k]; else cells[k] = v.slice(0, 1000);
            return { ...prev, cells };
        });
    }, [setSheet]);

    const move = useCallback((k, dr) => {
        const m = /^([A-Z])(\d+)$/.exec(k);
        if (!m) return;
        const next = m[1] + (parseInt(m[2], 10) + dr);
        setTimeout(() => {
            const el = tableRef.current && tableRef.current.querySelector(`input[aria-label="Cell ${next}"]`);
            if (el) el.focus();
        }, 0);
    }, []);

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                <button type="button" onClick={() => setSheet(s => ({ ...s, rows: Math.min(MAX_ROWS, s.rows + 10) }))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm">Add 10 rows</button>
                <button type="button" onClick={() => setSheet(s => ({ ...s, cols: Math.min(MAX_COLS, s.cols + 1) }))}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm">Add column</button>
                <span className="text-xs text-slate-500 self-center">Start a formula with =, for example =SUM(A1:A5) or =B2*C2</span>
            </div>
            <div className="overflow-auto max-h-[65vh] border border-slate-700 rounded-xl">
                <table ref={tableRef} className="border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="bg-slate-800 border border-slate-700 w-10 text-xs text-slate-400" />
                            {Array.from({ length: sheet.cols }, (_, c) => (
                                <th key={c} className="bg-slate-800 border border-slate-700 text-xs text-slate-400 py-1">{colName(c)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: sheet.rows }, (_, r) => (
                            <tr key={r}>
                                <th className="bg-slate-800 border border-slate-700 text-xs text-slate-400 px-2 sticky left-0">{r + 1}</th>
                                {Array.from({ length: sheet.cols }, (_, c) => {
                                    const k = cellKey(r, c);
                                    return <SheetCell key={k} k={k} raw={sheet.cells[k]} shown={values[k]} onCommit={commit} onMove={move} />;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------- page
export default function MyDocumentsPage() {
    const [userId, setUserId] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [limitHit, setLimitHit] = useState(false);
    const [current, setCurrent] = useState(null);          // { id, kind, title }
    const [sheet, setSheet] = useState(null);              // { rows, cols, cells }
    const [docInitial, setDocInitial] = useState('');
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState(null);
    const editorRef = useRef(null);
    const fileRef = useRef(null);

    const handleDbError = (e) => {
        const msg = (e && e.message) || 'Something went wrong. Please try again.';
        if (msg.includes('DOCUMENT_LIMIT')) { setLimitHit(true); setError(FREE_LIMIT_TEXT); }
        else if (/size_limit|1000000/.test(msg)) setError('This item is too large to save (limit about 1 MB). Remove some content and try again.');
        else setError('Could not complete that. Please try again.');
    };

    const loadList = useCallback(async (uid) => {
        const { data, error: e } = await supabase
            .from('user_documents').select('id, kind, title, updated_at, size_bytes')
            .eq('user_id', uid).order('updated_at', { ascending: false });
        if (e) { handleDbError(e); return; }
        setItems(data || []);
    }, []);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { window.location.href = '/sign-in?redirect=/my-documents'; return; }
            setUserId(user.id);
            await loadList(user.id);
            setLoading(false);
        })();
    }, [loadList]);

    // warn before leaving with unsaved changes
    useEffect(() => {
        const handler = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [dirty]);

    const markDirty = useCallback(() => setDirty(true), []);

    const backToList = async () => {
        if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
        setCurrent(null); setSheet(null); setDirty(false); setSavedAt(null); setError(''); setLimitHit(false);
        if (userId) await loadList(userId);
    };

    const create = async (kind) => {
        setError(''); setLimitHit(false);
        const content = kind === 'doc' ? { html: '<p><br></p>' } : { rows: 30, cols: 10, cells: {} };
        const { data, error: e } = await supabase.from('user_documents')
            .insert({ user_id: userId, kind, title: kind === 'doc' ? 'Untitled document' : 'Untitled spreadsheet', content })
            .select('id, kind, title').single();
        if (e) { handleDbError(e); return; }
        openLoaded(data, content);
    };

    const openLoaded = (meta, content) => {
        setCurrent({ id: meta.id, kind: meta.kind, title: meta.title });
        if (meta.kind === 'doc') setDocInitial((content && content.html) || '');
        else setSheet({ rows: (content && content.rows) || 30, cols: (content && content.cols) || 10, cells: (content && content.cells) || {} });
        setDirty(false); setSavedAt(null);
    };

    const open = async (id) => {
        setError('');
        const { data, error: e } = await supabase.from('user_documents').select('id, kind, title, content').eq('id', id).single();
        if (e) { handleDbError(e); return; }
        openLoaded(data, data.content);
    };

    const save = async () => {
        if (!current) return;
        setSaving(true); setError('');
        const content = current.kind === 'doc'
            ? { html: sanitizeHtml(editorRef.current ? editorRef.current.innerHTML : '') }
            : { rows: sheet.rows, cols: sheet.cols, cells: sheet.cells };
        const { error: e } = await supabase.from('user_documents')
            .update({ title: (current.title || 'Untitled').slice(0, 200), content }).eq('id', current.id);
        setSaving(false);
        if (e) { handleDbError(e); return; }
        setDirty(false); setSavedAt(new Date());
    };

    useEffect(() => {
        const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && current) { e.preventDefault(); save(); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const remove = async (id, title) => {
        if (!window.confirm('Delete "' + title + '"? This cannot be undone.')) return;
        const { error: e } = await supabase.from('user_documents').delete().eq('id', id);
        if (e) { handleDbError(e); return; }
        setLimitHit(false); setError('');
        await loadList(userId);
    };

    // ---- exports and imports
    const exportWord = () => {
        const html = sanitizeHtml(editorRef.current ? editorRef.current.innerHTML : '');
        const doc = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>'
            + escapeHtml(current.title) + '</title></head><body>' + html + '</body></html>';
        downloadBlob(safeFileName(current.title, 'doc'), '﻿' + doc, 'application/msword');
    };
    const printDoc = () => {
        const html = sanitizeHtml(editorRef.current ? editorRef.current.innerHTML : '');
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
        document.body.appendChild(iframe);
        const d = iframe.contentWindow.document;
        d.open();
        d.write('<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(current.title)
            + '</title><style>body{font-family:Georgia,serif;line-height:1.6;color:#000;margin:24mm}table{border-collapse:collapse}td,th{border:1px solid #666;padding:4px 6px}</style></head><body>'
            + html + '</body></html>');
        d.close();
        iframe.contentWindow.focus();
        setTimeout(() => { iframe.contentWindow.print(); setTimeout(() => iframe.remove(), 2000); }, 250);
    };
    const exportCsv = () => downloadBlob(safeFileName(current.title, 'csv'), '﻿' + cellsToCsv(sheet.cells, sheet.rows, sheet.cols), 'text/csv');

    const importFile = async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file || !current) return;
        if (file.size > 900000) { setError('That file is too large to import (limit about 900 KB).'); return; }
        const text = await file.text();
        const name = file.name.toLowerCase();
        if (current.kind === 'doc') {
            if (name.endsWith('.txt')) { editorRef.current.innerHTML = textToHtml(text); markDirty(); }
            else if (name.endsWith('.html') || name.endsWith('.htm')) { editorRef.current.innerHTML = sanitizeHtml(text) || '<p><br></p>'; markDirty(); }
            else setError('Documents can import .txt or .html files. For Word files, save as .html or copy and paste the text.');
        } else {
            if (name.endsWith('.csv')) { const imported = csvToCells(text); setSheet(imported); markDirty(); }
            else setError('Spreadsheets can import .csv files. In Excel choose Save As, then CSV.');
        }
    };

    // keep sheet edits flagged as unsaved
    const setSheetDirty = useCallback((fn) => { setSheet(fn); setDirty(true); }, []);

    // ------------------------------------------------------------ render
    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary-400 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
                {!current ? (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white">My Documents</h1>
                                <p className="text-slate-400 text-sm mt-1">Write letters and CVs, build simple budgets and checklists. Private to you.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => create('doc')} className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New document</button>
                                <button onClick={() => create('sheet')} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> New spreadsheet</button>
                            </div>
                        </div>
                        {error && (
                            <div role="alert" className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error} {limitHit && <Link to="/pricing" className="underline text-primary-300">See plans</Link>}</span>
                            </div>
                        )}
                        {items.length === 0 ? (
                            <div className="text-center py-14 bg-slate-900/50 border border-slate-800 rounded-xl">
                                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">Nothing here yet. Start with a new document or spreadsheet.</p>
                            </div>
                        ) : (
                            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map(it => (
                                    <li key={it.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col">
                                        <button onClick={() => open(it.id)} className="text-left flex-1">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                                                {it.kind === 'doc' ? <FileText className="w-4 h-4 text-primary-400" /> : <Table2 className="w-4 h-4 text-emerald-400" />}
                                                {it.kind === 'doc' ? 'Document' : 'Spreadsheet'}
                                            </div>
                                            <p className="text-white font-medium line-clamp-2">{it.title}</p>
                                            <p className="text-slate-500 text-xs mt-1">Edited {new Date(it.updated_at).toLocaleDateString()}</p>
                                        </button>
                                        <button onClick={() => remove(it.id, it.title)} aria-label={'Delete ' + it.title} className="self-end mt-2 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-slate-500 mt-6">Free and registered accounts can save 5 items; professional and business plans can save 50. Each item can be about 1 MB. Word export uses the .doc format that Word opens directly.</p>
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <button onClick={backToList} className="inline-flex items-center gap-1 text-slate-300 hover:text-white text-sm"><ArrowLeft className="w-4 h-4" /> All documents</button>
                            <input value={current.title} aria-label="Title" onChange={(e) => { setCurrent({ ...current, title: e.target.value }); markDirty(); }}
                                className="flex-1 min-w-[180px] bg-transparent border-b border-slate-700 focus:border-primary-500 outline-none text-white text-xl font-semibold px-1 py-1" />
                            <span className="text-xs text-slate-500">{saving ? 'Saving...' : dirty ? 'Unsaved changes' : savedAt ? 'Saved ' + savedAt.toLocaleTimeString() : ''}</span>
                            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg text-sm"><Save className="w-4 h-4" /> Save</button>
                        </div>
                        {error && <div role="alert" className="mb-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">{error}</div>}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <input ref={fileRef} type="file" className="hidden" onChange={importFile} accept={current.kind === 'doc' ? '.txt,.html,.htm' : '.csv'} />
                            <button onClick={() => fileRef.current && fileRef.current.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm"><Upload className="w-4 h-4" /> Import {current.kind === 'doc' ? '.txt or .html' : '.csv'}</button>
                            {current.kind === 'doc' ? (
                                <>
                                    <button onClick={exportWord} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm"><Download className="w-4 h-4" /> Download for Word</button>
                                    <button onClick={printDoc} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm"><Printer className="w-4 h-4" /> Print or save as PDF</button>
                                </>
                            ) : (
                                <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm"><Download className="w-4 h-4" /> Download for Excel (.csv)</button>
                            )}
                        </div>
                        {current.kind === 'doc'
                            ? <DocEditor editorRef={editorRef} initialHtml={docInitial} onChange={markDirty} />
                            : sheet && <SheetEditor sheet={sheet} setSheet={setSheetDirty} />}
                    </>
                )}
            </div>
        </div>
    );
}
