// src/components/workforce/ServiceRequestForm.jsx
// Service Request Form for employers to post work opportunities

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createServiceRequest } from '../../services/workforceService';
import { Send, X, Calendar, MapPin, DollarSign, Briefcase } from 'lucide-react';

export default function ServiceRequestForm({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        budget_min: '',
        budget_max: '',
        deadline: '',
        location: '',
        is_remote: true
    });

    const categories = [
        'Web Development', 'Mobile Development', 'UI/UX Design',
        'Content Writing', 'Digital Marketing', 'Data Entry',
        'Virtual Assistant', 'Customer Support', 'Accounting',
        'Legal Services', 'HR Consulting', 'IT Support'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        
        const result = await createServiceRequest(user.id, {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            budget_min: parseFloat(formData.budget_min) || 0,
            budget_max: parseFloat(formData.budget_max) || 0,
            deadline: formData.deadline || null,
            location: formData.location,
            is_remote: formData.is_remote
        });

        if (result.success) {
            if (onSuccess) onSuccess(result.requestId);
            if (onClose) onClose();
        } else {
            alert('Error creating service request');
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Post a Service Request</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            placeholder="e.g., Need WordPress Developer for E-commerce Site"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Category *</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            required
                        >
                            <option value="">Select a category</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows="5"
                            placeholder="Describe the work required, expectations, and any specific requirements..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Budget Min ($)</label>
                            <input
                                type="number"
                                value={formData.budget_min}
                                onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Budget Max ($)</label>
                            <input
                                type="number"
                                value={formData.budget_max}
                                onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Deadline</label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Location</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                placeholder="e.g., London, UK or Remote"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="is_remote"
                            checked={formData.is_remote}
                            onChange={(e) => setFormData({...formData, is_remote: e.target.checked})}
                            className="w-4 h-4"
                        />
                        <label htmlFor="is_remote" className="text-white text-sm">This is a remote position</label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? 'Posting...' : <><Send className="w-4 h-4" /> Post Request</>}
                        </button>
                        <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
