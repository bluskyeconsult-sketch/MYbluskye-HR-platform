// src/pages/CompanyProfile.jsx
// COMPLETE COMPANY PROFILE - Copy and replace entire file

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Building2, MapPin, Globe, Mail, Phone, Users, Briefcase, Edit2, Save, X } from 'lucide-react';

export default function CompanyProfile() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
        company_name: '',
        company_website: '',
        company_linkedin: '',
        company_size: '',
        industry: '',
        location: '',
        about: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = '/sign-in?redirect=/company-profile';
            return;
        }
        setUser(user);
        
        const { data: profileData } = await supabase
            .from('company_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (profileData) {
            setProfile(profileData);
            setFormData({
                company_name: profileData.company_name || '',
                company_website: profileData.company_website || '',
                company_linkedin: profileData.company_linkedin || '',
                company_size: profileData.company_size || '',
                industry: profileData.industry || '',
                location: profileData.location || '',
                about: profileData.about || ''
            });
        }
        
        setLoading(false);
    }

    async function handleSave() {
        setLoading(true);
        
        if (profile) {
            await supabase
                .from('company_profiles')
                .update(formData)
                .eq('id', profile.id);
        } else {
            await supabase
                .from('company_profiles')
                .insert({
                    user_id: user.id,
                    ...formData
                });
        }
        
        setEditing(false);
        await loadProfile();
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Company Profile</h1>
                        <p className="text-slate-400">Manage your company information and hiring preferences</p>
                    </div>
                    {!editing ? (
                        <button onClick={() => setEditing(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                            <Edit2 className="w-4 h-4" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save
                            </button>
                            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                                <X className="w-4 h-4" /> Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Profile Display/Edit */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    {editing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Company Name</label>
                                <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Website</label>
                                <input type="url" value={formData.company_website} onChange={e => setFormData({...formData, company_website: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">LinkedIn</label>
                                <input type="url" value={formData.company_linkedin} onChange={e => setFormData({...formData, company_linkedin: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Company Size</label>
                                    <select value={formData.company_size} onChange={e => setFormData({...formData, company_size: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                                        <option value="">Select size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="500+">500+ employees</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Industry</label>
                                    <input type="text" value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Location</label>
                                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">About Company</label>
                                <textarea value={formData.about} onChange={e => setFormData({...formData, about: e.target.value})} rows="4" className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                                <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-8 h-8 text-primary-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{profile?.company_name || 'Not set'}</h2>
                                    <p className="text-slate-400">{profile?.industry || 'Industry not specified'}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {profile?.location && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MapPin className="w-4 h-4" /> {profile.location}
                                    </div>
                                )}
                                {profile?.company_website && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Globe className="w-4 h-4" /> 
                                        <a href={profile.company_website} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">{profile.company_website}</a>
                                    </div>
                                )}
                                {profile?.company_size && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users className="w-4 h-4" /> {profile.company_size} employees
                                    </div>
                                )}
                                {profile?.company_linkedin && (
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Briefcase className="w-4 h-4" /> 
                                        <a href={profile.company_linkedin} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">LinkedIn</a>
                                    </div>
                                )}
                            </div>
                            
                            {profile?.about && (
                                <div className="pt-4 border-t border-slate-800">
                                    <h3 className="text-white font-semibold mb-2">About</h3>
                                    <p className="text-slate-400">{profile.about}</p>
                                </div>
                            )}
                            
                            {!profile && (
                                <div className="text-center py-8 text-slate-400">
                                    <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                    <p>No company profile yet. Click Edit to add your company information.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Workforce Dashboard Link - NEW SECTION */}
                <div className="mt-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Post Service Requests</h3>
                            <p className="text-slate-400 text-sm mb-3">
                                Find verified professionals for your projects. Post a service request and get proposals from qualified candidates.
                            </p>
                            <Link to="/workforce/dashboard" className="text-primary-400 text-sm hover:underline inline-flex items-center gap-1">
                                Go to Workforce Dashboard →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
