// src/pages/UserProfile.jsx
// ODUSBABA USER PROFILE PAGE v3.0 - PRODUCTION READY
// ✅ Complete profile management with avatar upload
// ✅ Email verification status
// ✅ Unified API for profile updates
// ✅ Professional validation and error handling

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    Camera, Linkedin, Github, Mail, Phone, Briefcase, Calendar, 
    Bell, Save, X, CheckCircle, AlertCircle, Loader2, 
    User, MapPin, Award, Clock, FileText
} from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = '/api/index';

// ============================================
// MAIN COMPONENT
// ============================================

export default function UserProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const fileInputRef = useRef(null);

    // ============================================
    // LOAD PROFILE
    // ============================================

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            
            if (!user) {
                navigate('/sign-in?redirect=/profile');
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            
            setProfile(data);
            setFormData(data || {});
            setAvatarUrl(data?.avatar_url);
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    }

    // ============================================
    // AVATAR UPLOAD
    // ============================================

    async function handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            setErrors({ avatar: 'Please upload an image file' });
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            setErrors({ avatar: 'Image must be less than 2MB' });
            return;
        }
        
        setUploadingAvatar(true);
        setErrors({});
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
            
            if (updateError) throw updateError;
            
            setAvatarUrl(publicUrl);
            setProfile({ ...profile, avatar_url: publicUrl });
            setSuccessMessage('Avatar updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            
        } catch (error) {
            console.error('Avatar upload error:', error);
            setErrors({ avatar: error.message });
        } finally {
            setUploadingAvatar(false);
        }
    }

    // ============================================
    // VALIDATION
    // ============================================

    function validateForm() {
        const newErrors = {};
        
        if (formData.full_name && formData.full_name.length < 2) {
            newErrors.full_name = 'Name must be at least 2 characters';
        }
        
        if (formData.phone && !/^[\d\s+()-]+$/.test(formData.phone)) {
            newErrors.phone = 'Please enter a valid phone number';
        }
        
        if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
            newErrors.linkedin_url = 'Please enter a valid LinkedIn URL';
        }
        
        if (formData.github_url && !formData.github_url.includes('github.com')) {
            newErrors.github_url = 'Please enter a valid GitHub URL';
        }
        
        if (formData.years_experience && (formData.years_experience < 0 || formData.years_experience > 60)) {
            newErrors.years_experience = 'Please enter a valid number (0-60)';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    // ============================================
    // GET AUTH TOKEN
    // ============================================

    async function getAuthToken() {
        const session = await supabase.auth.getSession();
        return session.data.session?.access_token;
    }

    // ============================================
    // SAVE PROFILE (Unified API)
    // ============================================

    async function handleSave() {
        if (!validateForm()) return;
        
        setSaving(true);
        setErrors({});
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const token = await getAuthToken();
            
            // ✅ Using unified API endpoint with auth token
            const response = await fetch(`${API_BASE}?action=user-update`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    updates: {
                        full_name: formData.full_name,
                        phone: formData.phone,
                        job_title: formData.job_title,
                        years_experience: formData.years_experience,
                        linkedin_url: formData.linkedin_url,
                        github_url: formData.github_url,
                        email_notifications: formData.email_notifications,
                        location: formData.location,
                        bio: formData.bio
                    }
                })
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setProfile({ ...profile, ...formData });
            setSuccessMessage('Profile updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            setEditing(false);
            
        } catch (error) {
            console.error('Save error:', error);
            setErrors({ submit: error.message });
        } finally {
            setSaving(false);
        }
    }

    // ============================================
    // RESEND VERIFICATION
    // ============================================

    async function handleResendVerification() {
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: profile?.email
            });
            
            if (error) throw error;
            setSuccessMessage('Verification email sent! Check your inbox.');
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            setErrors({ verify: error.message });
        }
    }

    // ============================================
    // LOADING STATE
    // ============================================

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    const isVerified = profile?.email_verified;

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">My Profile</h1>
                        <p className="text-slate-400 mt-1">Manage your personal information and preferences</p>
                    </div>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                        >
                            <User className="w-4 h-4" />
                            Edit Profile
                        </button>
                    )}
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <p className="text-emerald-400 text-sm">{successMessage}</p>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                    
                    {/* Header with Avatar */}
                    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 p-6 md:p-8 border-b border-slate-800">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        profile?.full_name?.[0]?.toUpperCase() || 'U'
                                    )}
                                </div>
                                {editing && (
                                    <>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingAvatar}
                                            className="absolute bottom-0 right-0 p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-all disabled:opacity-50"
                                        >
                                            {uploadingAvatar ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            ) : (
                                                <Camera className="w-4 h-4 text-white" />
                                            )}
                                        </button>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                        />
                                    </>
                                )}
                                {errors.avatar && (
                                    <p className="text-xs text-red-400 mt-1 text-center absolute -bottom-5 left-0 right-0">{errors.avatar}</p>
                                )}
                            </div>
                            
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-bold text-white">{profile?.full_name || 'User'}</h2>
                                <p className="text-slate-400">{profile?.email}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2 justify-center md:justify-start">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        isVerified 
                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                            : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                        {isVerified ? '✓ Email Verified' : '⚠️ Email Not Verified'}
                                    </span>
                                    {!isVerified && (
                                        <button
                                            onClick={handleResendVerification}
                                            className="text-xs text-primary-400 hover:underline"
                                        >
                                            Resend verification
                                        </button>
                                    )}
                                    {errors.verify && (
                                        <p className="text-xs text-red-400">{errors.verify}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Information */}
                    <div className="p-6 md:p-8">
                        {editing ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={formData.full_name || ''}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                errors.full_name ? 'border-red-500' : 'border-slate-700'
                                            }`}
                                            placeholder="Your full name"
                                        />
                                        {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phone || ''}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                errors.phone ? 'border-red-500' : 'border-slate-700'
                                            }`}
                                            placeholder="+44 123 456 7890"
                                        />
                                        {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            value={formData.job_title || ''}
                                            onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="e.g., Senior Software Engineer"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                                        <input
                                            type="number"
                                            value={formData.years_experience || ''}
                                            onChange={(e) => setFormData({...formData, years_experience: parseInt(e.target.value) || 0})}
                                            className={`w-full px-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                errors.years_experience ? 'border-red-500' : 'border-slate-700'
                                            }`}
                                            placeholder="0"
                                        />
                                        {errors.years_experience && <p className="text-xs text-red-400 mt-1">{errors.years_experience}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location || ''}
                                            onChange={(e) => setFormData({...formData, location: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            placeholder="London, UK"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">LinkedIn URL</label>
                                        <div className="relative">
                                            <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="url"
                                                value={formData.linkedin_url || ''}
                                                onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                                                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                    errors.linkedin_url ? 'border-red-500' : 'border-slate-700'
                                                }`}
                                                placeholder="https://linkedin.com/in/username"
                                            />
                                        </div>
                                        {errors.linkedin_url && <p className="text-xs text-red-400 mt-1">{errors.linkedin_url}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">GitHub URL</label>
                                        <div className="relative">
                                            <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="url"
                                                value={formData.github_url || ''}
                                                onChange={(e) => setFormData({...formData, github_url: e.target.value})}
                                                className={`w-full pl-10 pr-4 py-2.5 bg-slate-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                                    errors.github_url ? 'border-red-500' : 'border-slate-700'
                                                }`}
                                                placeholder="https://github.com/username"
                                            />
                                        </div>
                                        {errors.github_url && <p className="text-xs text-red-400 mt-1">{errors.github_url}</p>}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Bio / Professional Summary</label>
                                    <textarea
                                        rows={4}
                                        value={formData.bio || ''}
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Tell us about your professional background, skills, and career goals..."
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="email_notifications"
                                        checked={formData.email_notifications || false}
                                        onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})}
                                        className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                                    />
                                    <label htmlFor="email_notifications" className="text-slate-300">
                                        Receive email notifications about jobs, applications, and updates
                                    </label>
                                </div>
                                
                                {errors.submit && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                        <p className="text-red-400 text-sm">{errors.submit}</p>
                                    </div>
                                )}
                                
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditing(false);
                                            setFormData(profile);
                                            setErrors({});
                                        }}
                                        className="px-5 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-all duration-200 flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column */}
                                <div className="space-y-5">
                                    <div className="flex items-start gap-3">
                                        <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Email Address</p>
                                            <p className="text-white">{profile?.email}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Phone Number</p>
                                            <p className="text-white">{profile?.phone || 'Not provided'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Briefcase className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Job Title</p>
                                            <p className="text-white">{profile?.job_title || 'Not provided'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Award className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Years of Experience</p>
                                            <p className="text-white">{profile?.years_experience || 0} years</p>
                                        </div>
                                    </div>
                                    
                                    {profile?.location && (
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Location</p>
                                                <p className="text-white">{profile?.location}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Right Column */}
                                <div className="space-y-5">
                                    {profile?.linkedin_url && (
                                        <div className="flex items-start gap-3">
                                            <Linkedin className="w-5 h-5 text-slate-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">LinkedIn</p>
                                                <a 
                                                    href={profile.linkedin_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-primary-400 hover:underline break-all text-sm"
                                                >
                                                    {profile.linkedin_url.replace('https://', '').replace('http://', '')}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {profile?.github_url && (
                                        <div className="flex items-start gap-3">
                                            <Github className="w-5 h-5 text-slate-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">GitHub</p>
                                                <a 
                                                    href={profile.github_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-primary-400 hover:underline break-all text-sm"
                                                >
                                                    {profile.github_url.replace('https://', '').replace('http://', '')}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {profile?.bio && (
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-5 h-5 text-slate-500 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-slate-500">Professional Bio</p>
                                                <p className="text-white text-sm leading-relaxed">{profile?.bio}</p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start gap-3">
                                        <Bell className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Email Notifications</p>
                                            <p className="text-white">{profile?.email_notifications ? 'Enabled' : 'Disabled'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-slate-500 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500">Member Since</p>
                                            <p className="text-white">{new Date(profile?.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
