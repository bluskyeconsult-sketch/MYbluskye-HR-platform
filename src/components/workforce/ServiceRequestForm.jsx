// src/components/workforce/ServiceRequestForm.jsx
// COMPLETE PROFESSIONAL SERVICE REQUEST FORM - With unified API, enhanced validation, and improved UX

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
    Send, X, Calendar, MapPin, DollarSign, Briefcase, 
    Loader2, AlertCircle, CheckCircle, Globe, Clock,
    Tag, FileText, Users, Zap, Shield, Sparkles
} from 'lucide-react';

export default function ServiceRequestForm({ onClose, onSuccess, editRequest = null }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budget_min: '',
        budget_max: '',
        deadline: '',
        location: '',
        is_remote: true,
        required_skills: [],
        experience_level: 'intermediate',
        estimated_duration: ''
    });
    const [skillInput, setSkillInput] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);

    const categories = [
        { value: 'web_development', label: 'Web Development', icon: '💻' },
        { value: 'mobile_development', label: 'Mobile Development', icon: '📱' },
        { value: 'ui_ux_design', label: 'UI/UX Design', icon: '🎨' },
        { value: 'content_writing', label: 'Content Writing', icon: '✍️' },
        { value: 'digital_marketing', label: 'Digital Marketing', icon: '📈' },
        { value: 'data_entry', label: 'Data Entry', icon: '📊' },
        { value: 'virtual_assistant', label: 'Virtual Assistant', icon: '🤝' },
        { value: 'customer_support', label: 'Customer Support', icon: '💬' },
        { value: 'accounting', label: 'Accounting', icon: '💰' },
        { value: 'legal_services', label: 'Legal Services', icon: '⚖️' },
        { value: 'hr_consulting', label: 'HR Consulting', icon: '👥' },
        { value: 'it_support', label: 'IT Support', icon: '🖥️' },
        { value: 'graphic_design', label: 'Graphic Design', icon: '🎨' },
        { value: 'video_editing', label: 'Video Editing', icon: '🎬' },
        { value: 'social_media', label: 'Social Media Management', icon: '📱' },
        { value: 'seo', label: 'SEO Services', icon: '🔍' }
    ];

    const experienceLevels = [
        { value: 'entry', label: 'Entry Level (0-2 years)', icon: '🌱' },
        { value: 'intermediate', label: 'Intermediate (2-5 years)', icon: '📈' },
        { value: 'senior', label: 'Senior (5-8 years)', icon: '🏆' },
        { value: 'expert', label: 'Expert (8+ years)', icon: '👑' }
    ];

    useEffect(() => {
        getCurrentUser();
        if (editRequest) {
            setIsEditMode(true);
            populateFormForEdit(editRequest);
        }
    }, [editRequest]);

    async function getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (!user) {
            setError('Please sign in to post a service request');
        }
    }

    function populateFormForEdit(request) {
        setFormData({
            title: request.title || '',
            description: request.description || '',
            category: request.category || '',
            budget_min: request.budget_min || '',
            budget_max: request.budget_max || '',
            deadline: request.deadline?.split('T')[0] || '',
            location: request.location || '',
            is_remote: request.is_remote ?? true,
            required_skills: request.required_skills || [],
            experience_level: request.experience_level || 'intermediate',
            estimated_duration: request.estimated_duration || ''
        });
    }

    function addSkill() {
        if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
            setFormData({
                ...formData,
                required_skills: [...formData.required_skills, skillInput.trim()]
            });
            setSkillInput('');
        }
    }

    function removeSkill(skill) {
        setFormData({
            ...formData,
            required_skills: formData.required_skills.filter(s => s !== skill)
        });
    }

    function validateForm() {
        if (!formData.title.trim()) {
            setError('Please enter a title');
            return false;
        }
        if (!formData.category) {
            setError('Please select a category');
            return false;
        }
        if (!formData.description.trim() || formData.description.length < 20) {
            setError('Please provide a detailed description (at least 20 characters)');
            return false;
        }
        if (formData.budget_min && formData.budget_max && parseFloat(formData.budget_min) > parseFloat(formData.budget_max)) {
            setError('Minimum budget cannot exceed maximum budget');
            return false;
        }
        return true;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!validateForm()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const action = isEditMode ? 'workforce-update-request' : 'workforce-post-request';
            const endpoint = `/api/index?action=${action}`;
            
            const requestData = {
                userId: user?.id,
                request: {
                    title: formData.title.trim(),
                    description: formData.description.trim(),
                    category: formData.category,
                    budget_min: parseFloat(formData.budget_min) || null,
                    budget_max: parseFloat(formData.budget_max) || null,
                    deadline: formData.deadline || null,
                    location: formData.location?.trim() || null,
                    is_remote: formData.is_remote,
                    required_skills: formData.required_skills,
                    experience_level: formData.experience_level,
                    estimated_duration: formData.estimated_duration || null
                }
            };
            
            // ✅ Using unified API endpoint
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();
            
            if (!result.success) throw new Error(result.error);
            
            setSuccess(true);
            
            if (onSuccess) onSuccess(result.requestId);
            
            // Close modal after 1.5 seconds on success
            setTimeout(() => {
                if (onClose) onClose();
            }, 1500);
            
        } catch (err) {
            console.error('Error posting request:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function getCategoryIcon(categoryValue) {
        const cat = categories.find(c => c.value === categoryValue);
        return cat?.icon || '📋';
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isEditMode ? 'Edit Service Request' : 'Post a Service Request'}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {isEditMode ? 'Update your existing request' : 'Find the right professional for your project'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
                        disabled={loading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Success Message */}
                    {success && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <p className="text-emerald-400 text-sm">
                                {isEditMode ? 'Request updated successfully!' : 'Request posted successfully!'}
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="e.g., Need WordPress Developer for E-commerce Site"
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                disabled={loading || success}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Category <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                disabled={loading || success}
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Description <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows="5"
                                placeholder="Describe the work required, expectations, deliverables, and any specific requirements..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                                disabled={loading || success}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {formData.description.length}/5000 characters
                        </p>
                    </div>

                    {/* Budget Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Min Budget ($)
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="number"
                                    step="10"
                                    value={formData.budget_min}
                                    onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                                    placeholder="0"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Max Budget ($)
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="number"
                                    step="10"
                                    value={formData.budget_max}
                                    onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                                    placeholder="Unlimited"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Experience Level */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Preferred Experience Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {experienceLevels.map(level => (
                                <button
                                    key={level.value}
                                    type="button"
                                    onClick={() => setFormData({...formData, experience_level: level.value})}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                                        formData.experience_level === level.value
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                    disabled={loading || success}
                                >
                                    <span>{level.icon}</span>
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Required Skills */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Required Skills
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="e.g., React, Python, Project Management"
                                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                disabled={loading || success}
                            />
                            <button
                                type="button"
                                onClick={addSkill}
                                className="px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                                disabled={loading || success}
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.required_skills.map(skill => (
                                <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-full text-sm text-slate-300">
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => removeSkill(skill)}
                                        className="hover:text-red-400 transition"
                                        disabled={loading || success}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Deadline & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Deadline
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Estimated Duration
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.estimated_duration}
                                    onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                                    placeholder="e.g., 2 weeks, 1 month"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location & Remote */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                    placeholder="e.g., London, UK"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    disabled={loading || success}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="is_remote"
                                checked={formData.is_remote}
                                onChange={(e) => setFormData({...formData, is_remote: e.target.checked})}
                                className="w-4 h-4 rounded border-slate-600 text-primary-500 focus:ring-primary-500"
                                disabled={loading || success}
                            />
                            <label htmlFor="is_remote" className="text-white text-sm flex items-center gap-1">
                                <Globe className="w-4 h-4" /> Remote position
                            </label>
                        </div>
                    </div>

                    {/* Trust Badge */}
                    <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <p className="text-xs text-slate-400">
                            Your request will be reviewed and published within 24 hours. All professionals are AI-verified.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading || success}
                            className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-lg shadow-primary-500/20"
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> {isEditMode ? 'Updating...' : 'Posting...'}</>
                            ) : (
                                <><Send className="w-4 h-4" /> {isEditMode ? 'Update Request' : 'Post Request'}</>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-all duration-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
