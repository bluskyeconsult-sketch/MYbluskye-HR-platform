// src/components/workforce/WorkforceOnboarding.jsx
// Complete onboarding flow for workforce professionals

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createWorkforceProfile } from '../../services/workforceService';
import { User, Briefcase, DollarSign, Globe, FileText, CheckCircle, ArrowRight, Plus, X } from 'lucide-react';

export default function WorkforceOnboarding({ onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        headline: '',
        bio: '',
        skills: [],
        experience_years: '',
        hourly_rate: '',
        portfolio_urls: [],
        certifications: []
    });
    const [newSkill, setNewSkill] = useState('');
    const [newPortfolio, setNewPortfolio] = useState('');
    const [newCert, setNewCert] = useState('');

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
            setProfile({ ...profile, skills: [...profile.skills, newSkill.trim()] });
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
    };

    const addPortfolio = () => {
        if (newPortfolio.trim()) {
            setProfile({ ...profile, portfolio_urls: [...profile.portfolio_urls, newPortfolio.trim()] });
            setNewPortfolio('');
        }
    };

    const addCert = () => {
        if (newCert.trim()) {
            setProfile({ ...profile, certifications: [...profile.certifications, newCert.trim()] });
            setNewCert('');
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        const result = await createWorkforceProfile(user.id, {
            headline: profile.headline,
            bio: profile.bio,
            skills: profile.skills,
            experience_years: parseInt(profile.experience_years) || 0,
            hourly_rate: parseFloat(profile.hourly_rate) || 0,
            portfolio_urls: profile.portfolio_urls,
            certifications: profile.certifications
        });

        if (result.success) {
            if (onComplete) onComplete();
        } else {
            alert('Error creating profile');
        }
        setLoading(false);
    };

    const steps = [
        { number: 1, title: 'Basic Info', icon: User },
        { number: 2, title: 'Skills & Experience', icon: Briefcase },
        { number: 3, title: 'Pricing & Portfolio', icon: DollarSign },
        { number: 4, title: 'Review', icon: CheckCircle }
    ];

    return (
        <div className="max-w-2xl mx-auto">
            {/* Progress Steps */}
            <div className="flex justify-between mb-8">
                {steps.map((s, idx) => (
                    <div key={s.number} className="flex-1 text-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                            step > s.number ? 'bg-emerald-500 text-white' :
                            step === s.number ? 'bg-primary-500 text-white' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {step > s.number ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                        </div>
                        <p className={`text-sm ${step === s.number ? 'text-white' : 'text-slate-400'}`}>{s.title}</p>
                    </div>
                ))}
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Tell us about yourself</h2>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Professional Headline</label>
                        <input
                            type="text"
                            value={profile.headline}
                            onChange={(e) => setProfile({...profile, headline: e.target.value})}
                            placeholder="e.g., Senior UX Designer with 8+ years experience"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Bio / About Me</label>
                        <textarea
                            value={profile.bio}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                            rows="4"
                            placeholder="Describe your expertise, approach, and what makes you unique..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                </div>
            )}

            {/* Step 2: Skills & Experience */}
            {step === 2 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Your Expertise</h2>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Years of Experience</label>
                        <input
                            type="number"
                            value={profile.experience_years}
                            onChange={(e) => setProfile({...profile, experience_years: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Skills</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="e.g., React, Project Management, UX Design"
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                            <button onClick={addSkill} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map(skill => (
                                <span key={skill} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-200 flex items-center gap-1">
                                    {skill}
                                    <button onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-400">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Pricing & Portfolio */}
            {step === 3 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Set Your Rates</h2>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Hourly Rate (USD)</label>
                        <input
                            type="number"
                            value={profile.hourly_rate}
                            onChange={(e) => setProfile({...profile, hourly_rate: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="e.g., 75"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Portfolio URLs</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="url"
                                value={newPortfolio}
                                onChange={(e) => setNewPortfolio(e.target.value)}
                                placeholder="https://..."
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                            <button onClick={addPortfolio} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                        </div>
                        <div className="space-y-1">
                            {profile.portfolio_urls.map(url => (
                                <div key={url} className="text-sm text-primary-400 break-all">{url}</div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Certifications</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newCert}
                                onChange={(e) => setNewCert(e.target.value)}
                                placeholder="e.g., PMP, AWS Certified, Google Analytics"
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                            <button onClick={addCert} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {profile.certifications.map(cert => (
                                <span key={cert} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-200">
                                    {cert}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Review Your Profile</h2>
                    <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                        <p><strong className="text-white">Headline:</strong> <span className="text-slate-300">{profile.headline}</span></p>
                        <p><strong className="text-white">Bio:</strong> <span className="text-slate-300">{profile.bio?.substring(0, 100)}...</span></p>
                        <p><strong className="text-white">Experience:</strong> <span className="text-slate-300">{profile.experience_years} years</span></p>
                        <p><strong className="text-white">Skills:</strong> <span className="text-slate-300">{profile.skills.join(', ')}</span></p>
                        <p><strong className="text-white">Hourly Rate:</strong> <span className="text-slate-300">${profile.hourly_rate}/hr</span></p>
                        <p><strong className="text-white">Portfolio Items:</strong> <span className="text-slate-300">{profile.portfolio_urls.length} links</span></p>
                        <p><strong className="text-white">Certifications:</strong> <span className="text-slate-300">{profile.certifications.length}</span></p>
                        <p><strong className="text-amber-400">Verification Status:</strong> Pending (review within 24-48 hours)</p>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                {step > 1 && (
                    <button onClick={() => setStep(step - 1)} className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg">
                        Back
                    </button>
                )}
                {step < 4 ? (
                    <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 ml-auto">
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg ml-auto">
                        {loading ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                )}
            </div>
        </div>
    );
}
