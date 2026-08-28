// src/components/workforce/WorkforceOnboarding.jsx
// Complete onboarding flow for workforce professionals
//
// UPGRADED (2026-08-27): added a real category selection (professional /
// tradesperson / job_seeker), matching the three real listing_category
// values now supported by workforce_profiles. The job_seeker path is
// deliberately shorter (matches "free job seekers get most basic
// listing" - no rate/portfolio step needed) and auto-verifies
// immediately rather than waiting on admin review, unlike the other two
// categories which keep the existing verification requirement.

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createWorkforceProfile } from '../../services/workforceService';
import { User, Briefcase, DollarSign, Globe, FileText, CheckCircle, ArrowRight, Plus, X, Wrench, Sparkles } from 'lucide-react';

const CATEGORIES = [
    { id: 'job_seeker', label: 'Job Seeker Profile', icon: Sparkles, desc: 'Free. A quick, basic listing showing your skills to employers browsing for talent - upgrades automatically once you complete an assessment, a course, or verify a few skills.' },
    { id: 'professional', label: 'Professional Services', icon: Briefcase, desc: 'For consultants, freelancers, and service professionals offering paid engagements. Reviewed and verified before listing.' },
    { id: 'tradesperson', label: 'Tradesperson / Skilled Worker', icon: Wrench, desc: 'For plumbers, electricians, handymen, braiders, and other skilled or semi-skilled trades. Reviewed and verified before listing.' }
];

export default function WorkforceOnboarding({ onComplete }) {
    const [category, setCategory] = useState(null);
    const [step, setStep] = useState(0); // 0 = category choice
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({
        headline: '',
        bio: '',
        skills: [],
        experience_years: '',
        hourly_rate: '',
        portfolio_urls: [],
        certifications: [],
        countryCode: '',
        generalLocation: ''
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
            listingCategory: category,
            headline: profile.headline,
            bio: profile.bio,
            skills: profile.skills,
            experience_years: parseInt(profile.experience_years) || 0,
            hourly_rate: category === 'job_seeker' ? null : (parseFloat(profile.hourly_rate) || 0),
            portfolio_urls: profile.portfolio_urls,
            certifications: profile.certifications,
            countryCode: profile.countryCode,
            generalLocation: profile.generalLocation
        });

        if (result.success) {
            if (onComplete) onComplete(result);
        } else {
            alert('Error creating profile');
        }
        setLoading(false);
    };

    // job_seeker skips the Pricing & Portfolio step entirely - matches
    // "free job seekers get most basic listing," no rate-setting needed
    // for a pure discovery listing.
    const steps = category === 'job_seeker' ? [
        { number: 1, title: 'Basic Info', icon: User },
        { number: 2, title: 'Skills & Location', icon: Briefcase },
        { number: 3, title: 'Review', icon: CheckCircle }
    ] : [
        { number: 1, title: 'Basic Info', icon: User },
        { number: 2, title: 'Skills & Experience', icon: Briefcase },
        { number: 3, title: 'Pricing & Portfolio', icon: DollarSign },
        { number: 4, title: 'Review', icon: CheckCircle }
    ];
    const reviewStepNumber = steps[steps.length - 1].number;

    // job_seeker has no Pricing & Portfolio step (position 3 in the
    // 4-step flow) - these helpers skip over it for that category
    // rather than needing separate step-numbering logic everywhere.
    function goNext() {
        if (category === 'job_seeker' && step === 2) {
            setStep(3); // straight to review for job_seeker
        } else {
            setStep(step + 1);
        }
    }
    function goBack() {
        if (category === 'job_seeker' && step === 3) {
            setStep(2);
        } else {
            setStep(step - 1);
        }
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Step 0: Category selection - shown before anything else.
                Nothing below renders until a category is chosen, since
                the rest of the flow (step count, labels, whether
                Pricing & Portfolio appears at all) depends on it. */}
            {!category ? (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-1">What kind of listing is this?</h2>
                    <p className="text-slate-400 text-sm mb-4">This determines what you'll be asked for next, and how your listing appears to employers.</p>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => { setCategory(cat.id); setStep(1); }}
                            className="w-full text-left p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-primary-500/50 hover:bg-slate-800 transition flex items-start gap-3"
                        >
                            <cat.icon className="w-6 h-6 text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-white font-medium">{cat.label}</p>
                                <p className="text-slate-400 text-sm mt-1">{cat.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            ) : (
            <>
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
                        <label className="block text-sm text-slate-400 mb-1">{category === 'tradesperson' ? 'Trade / Headline' : 'Professional Headline'}</label>
                        <input
                            type="text"
                            value={profile.headline}
                            onChange={(e) => setProfile({...profile, headline: e.target.value})}
                            placeholder={category === 'tradesperson' ? 'e.g., Licensed Electrician, 10 years experience' : 'e.g., Senior UX Designer with 8+ years experience'}
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

            {/* Step 2: Skills, Experience & Location - country/location
                fields are new here, added for all categories since
                regional differentiation matters across the board, not
                just for tradespeople. */}
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
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Country Code</label>
                            <input
                                type="text"
                                value={profile.countryCode}
                                onChange={(e) => setProfile({...profile, countryCode: e.target.value.toUpperCase()})}
                                placeholder="e.g., GB, NG, US"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">General Location</label>
                            <input
                                type="text"
                                value={profile.generalLocation}
                                onChange={(e) => setProfile({...profile, generalLocation: e.target.value})}
                                placeholder="e.g., Greater London"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            />
                        </div>
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

            {/* Step 3: Pricing & Portfolio - skipped entirely for
                job_seeker (goNext() jumps straight to review for that
                category), matches "free job seekers get most basic
                listing," no rate-setting needed for pure discovery. */}
            {step === 3 && category !== 'job_seeker' && (
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

            {/* Review - uses reviewStepNumber since job_seeker's review
                is at position 3, not 4. */}
            {step === reviewStepNumber && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Review Your Profile</h2>
                    <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
                        <p><strong className="text-white">Headline:</strong> <span className="text-slate-300">{profile.headline}</span></p>
                        <p><strong className="text-white">Bio:</strong> <span className="text-slate-300">{profile.bio?.substring(0, 100)}...</span></p>
                        <p><strong className="text-white">Experience:</strong> <span className="text-slate-300">{profile.experience_years} years</span></p>
                        <p><strong className="text-white">Location:</strong> <span className="text-slate-300">{profile.generalLocation || 'Not specified'}{profile.countryCode ? ` (${profile.countryCode})` : ''}</span></p>
                        <p><strong className="text-white">Skills:</strong> <span className="text-slate-300">{profile.skills.join(', ') || 'None added'}</span></p>
                        {category !== 'job_seeker' && (
                            <>
                                <p><strong className="text-white">Hourly Rate:</strong> <span className="text-slate-300">${profile.hourly_rate}/hr</span></p>
                                <p><strong className="text-white">Portfolio Items:</strong> <span className="text-slate-300">{profile.portfolio_urls.length} links</span></p>
                                <p><strong className="text-white">Certifications:</strong> <span className="text-slate-300">{profile.certifications.length}</span></p>
                            </>
                        )}
                        {/* FIXED (2026-08-27): this always said "Pending
                            review" regardless of category - job_seeker
                            listings are now auto-verified and appear
                            immediately, which is genuinely different and
                            worth telling the person accurately. */}
                        {category === 'job_seeker' ? (
                            <p><strong className="text-emerald-400">Status:</strong> Your listing will be visible immediately after submitting.</p>
                        ) : (
                            <p><strong className="text-amber-400">Verification Status:</strong> Pending (review within 24-48 hours)</p>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
                {step > 1 && (
                    <button onClick={goBack} className="px-6 py-2 border border-slate-600 text-slate-300 rounded-lg">
                        Back
                    </button>
                )}
                {step < reviewStepNumber ? (
                    <button onClick={goNext} className="px-6 py-2 bg-primary-600 text-white rounded-lg flex items-center gap-2 ml-auto">
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-emerald-600 text-white rounded-lg ml-auto">
                        {loading ? 'Submitting...' : (category === 'job_seeker' ? 'Create My Listing' : 'Submit for Verification')}
                    </button>
                )}
            </div>
            </>
            )}
        </div>
    );
}
