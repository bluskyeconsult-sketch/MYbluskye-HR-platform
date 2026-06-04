// src/pages/tester/TesterRegisterPage.jsx - COMPLETE WITH INVITE CODE
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function TesterRegisterPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        masterInviteCode: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate invite code (static for now - should check database)
        if (formData.masterInviteCode !== 'ODUSBABA2024') {
            setError('Invalid master invite code');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (!formData.agreeTerms) {
            setError('You must agree to the terms and conditions');
            setLoading(false);
            return;
        }

        try {
            // Register via API
            const response = await fetch('/api/index?action=tester-create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    name: formData.fullName,
                    uses: 10,
                    days: 30
                })
            });

            const data = await response.json();

            if (data.success) {
                navigate('/tester/dashboard');
            } else {
                setError(data.error || 'Registration failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-md mx-auto px-4">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white">Become a Tester</h1>
                        <p className="text-slate-400 text-sm">Join our exclusive testing program with master invite code</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Master Invite Code *</label>
                            <input
                                type="text"
                                name="masterInviteCode"
                                value={formData.masterInviteCode}
                                onChange={handleChange}
                                placeholder="Enter master invite code"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                required
                            />
                            <p className="text-xs text-slate-500 mt-1">Enter the master invite code provided by your administrator</p>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Full Name *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password *</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Confirm Password *</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="********"
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                required
                            />
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-slate-400">I agree to the testing program terms and conditions</span>
                        </label>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                        >
                            {loading ? 'Registering...' : 'Register as Tester'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Already have a tester account? <Link to="/tester-login" className="text-primary-400 hover:underline">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
