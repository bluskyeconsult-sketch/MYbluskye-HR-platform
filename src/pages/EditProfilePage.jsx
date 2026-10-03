// src/pages/EditProfilePage.jsx
//
// NEW (2026-09-25): the genuinely missing "edit my own profile" page -
// confirmed UserSettings.jsx was an explicit, documented stub with no
// real form at all. Uses the same, already-proven field set as the
// admin's own profile-editing modal (AdminUsers.jsx), all confirmed
// real columns on profiles.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Loader2, Camera, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [form, setForm] = useState({
        full_name: '', bio: '', phone: '', location: '', country_code: '',
        job_title: '', linkedin_url: '', github_url: '', years_experience: '',
        avatar_url: '', date_of_birth: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/sign-in?redirect=/settings/profile');
            return;
        }
        setUserId(user.id);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!error && data) {
            setForm({
                full_name: data.full_name || '',
                bio: data.bio || '',
                phone: data.phone || '',
                location: data.location || '',
                country_code: data.country_code || '',
                job_title: data.job_title || '',
                linkedin_url: data.linkedin_url || '',
                github_url: data.github_url || '',
                years_experience: data.years_experience ?? '',
                avatar_url: data.avatar_url || '',
                date_of_birth: data.date_of_birth || ''
            });
        }
        setLoading(false);
    }

    async function handleAvatarUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !userId) return;

        // NEW (2026-09-26): confirmed the same zero-validation gap as
        // the CV upload - accept="image/*" is only a browser hint.
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        const hasValidMimeType = allowedMimeTypes.includes(file.type);
        const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3MB - genuinely generous for a profile photo

        if (!hasValidExtension || !hasValidMimeType) {
            toast.error('Please upload a JPG, PNG, GIF, or WebP image');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_SIZE_BYTES) {
            toast.error('Image is too large - please keep it under 3MB');
            e.target.value = '';
            return;
        }

        setUploadingAvatar(true);
        try {
            // NEW (2026-09-26): routes through a real virus scan
            // before the file is ever stored, matching the same,
            // secure pattern now used for CV uploads.
            const fileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const { data: { session } } = await supabase.auth.getSession();
            const scanResponse = await fetch('/api/index?action=scan-and-upload-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({
                    fileBase64,
                    fileName: `avatar-${Date.now()}.${file.name.split('.').pop()}`,
                    mimeType: file.type,
                    bucket: 'avatars',
                    folder: userId
                })
            });
            const scanData = await scanResponse.json();

            if (!scanData.success) {
                if (scanData.error?.includes('not found') || scanData.error?.includes('Bucket')) {
                    throw new Error("Storage bucket 'avatars' doesn't exist yet - create it in your Supabase dashboard (Storage → New bucket → name it 'avatars' → make it Public), then try again.");
                }
                throw new Error(scanData.error || 'Failed to upload photo');
            }

            setForm(prev => ({ ...prev, avatar_url: scanData.url }));
            toast.success('Photo uploaded - remember to save your profile.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: form.full_name || null,
                    bio: form.bio || null,
                    phone: form.phone || null,
                    location: form.location || null,
                    country_code: form.country_code || null,
                    job_title: form.job_title || null,
                    linkedin_url: form.linkedin_url || null,
                    github_url: form.github_url || null,
                    years_experience: form.years_experience === '' ? null : parseInt(form.years_experience),
                    avatar_url: form.avatar_url || null,
                    date_of_birth: form.date_of_birth || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // NEW (2026-09-25): fire-and-forget real activity logging,
            // matching this session's own, proven pattern - never
            // awaited, so it can't slow down or block a real save.
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!session?.access_token) return;
                fetch('/api/index?action=log-user-activity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ userId, actionType: 'profile_updated' })
                }).catch(() => {});
            }).catch(() => {});

            toast.success('Profile updated!');
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                <User className="w-7 h-7 text-primary-400" /> Edit Profile
            </h1>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {form.avatar_url ? (
                            <img src={form.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border border-slate-700" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                <User className="w-8 h-8 text-slate-600" />
                            </div>
                        )}
                        <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-500 transition">
                            {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Camera className="w-3.5 h-3.5 text-white" />}
                            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
                        </label>
                    </div>
                    <p className="text-slate-400 text-sm">Click the camera icon to change your photo.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Job Title</label>
                        <input
                            type="text"
                            value={form.job_title}
                            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Bio</label>
                    <textarea
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Phone</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Location</label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">LinkedIn URL</label>
                        <input
                            type="text"
                            value={form.linkedin_url}
                            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">GitHub URL</label>
                        <input
                            type="text"
                            value={form.github_url}
                            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Years of Experience</label>
                    <input
                        type="number"
                        min="0"
                        value={form.years_experience}
                        onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                        className="w-32 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Date of Birth (optional)</label>
                    <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                        className="w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">Only used to send you a birthday message - never shown publicly.</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                </button>
            </div>
        </div>
    );
}
