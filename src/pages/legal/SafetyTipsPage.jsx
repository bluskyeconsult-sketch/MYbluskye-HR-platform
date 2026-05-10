// src/pages/legal/SafetyTipsPage.jsx
// Safety tips for job seekers and employers

import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Eye, Lock, Users, Bell, DollarSign, Phone, FileText, Star, CheckCircle, XCircle } from 'lucide-react';

export default function SafetyTipsPage() {
    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="text-center mb-8">
                    <Shield className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-4">Safety Tips for Job Seekers</h1>
                    <p className="text-slate-400">
                        Protect yourself from job scams and fraudulent employers
                    </p>
                </div>
                
                {/* Red Flags Section */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Red Flags to Watch For
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-400" /> Asks for money upfront</p>
                            <p className="text-sm text-slate-400">Legitimate employers never ask for payment for training, background checks, or equipment.</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-red-400" /> Vague job descriptions</p>
                            <p className="text-sm text-slate-400">If you can't understand what you'll actually be doing, be suspicious.</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><Phone className="w-4 h-4 text-red-400" /> Unprofessional communication</p>
                            <p className="text-sm text-slate-400">Poor grammar, generic greetings, and pressure to respond quickly.</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><Star className="w-4 h-4 text-red-400" /> Too good to be true</p>
                            <p className="text-sm text-slate-400">Extremely high pay for minimal work is almost always a scam.</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><Lock className="w-4 h-4 text-red-400" /> Asks for sensitive information</p>
                            <p className="text-sm text-slate-400">Bank details, Social Security numbers, or passport before hiring.</p>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-3">
                            <p className="text-white font-medium flex items-center gap-2"><Users className="w-4 h-4 text-red-400" /> Urgent hiring without interview</p>
                            <p className="text-sm text-slate-400">No legitimate employer hires without some form of interview or screening.</p>
                        </div>
                    </div>
                </div>
                
                {/* Best Practices */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Best Practices for Safe Job Searching
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Eye className="w-5 h-5 text-primary-500 mt-0.5" />
                            <div>
                                <h3 className="text-white font-medium">Research Before Applying</h3>
                                <p className="text-sm text-slate-400">Look up the company online. Check their website, LinkedIn, and Google reviews.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-primary-500 mt-0.5" />
                            <div>
                                <h3 className="text-white font-medium">Keep Communication on Platform</h3>
                                <p className="text-sm text-slate-400">Use ODUSBABA's messaging system. We can monitor for suspicious activity.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Bell className="w-5 h-5 text-primary-500 mt-0.5" />
                            <div>
                                <h3 className="text-white font-medium">Trust Your Instincts</h3>
                                <p className="text-sm text-slate-400">If something feels wrong, it probably is. You can always walk away.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-primary-500 mt-0.5" />
                            <div>
                                <h3 className="text-white font-medium">Report Suspicious Activity</h3>
                                <p className="text-sm text-slate-400">Use our reporting feature immediately if you encounter anything suspicious.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* How ODUSBABA Protects You */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        How ODUSBABA Protects You
                    </h2>
                    <ul className="space-y-2 text-slate-400">
                        <li>• <strong>Employer Verification:</strong> We verify business registration before allowing job posts</li>
                        <li>• <strong>Skill Verification:</strong> Trust scores based on verified skills and history</li>
                        <li>• <strong>24/7 Monitoring:</strong> We monitor for suspicious patterns and activity</li>
                        <li>• <strong>User Reporting:</strong> Report any suspicious user or job post</li>
                        <li>• <strong>Fraud Investigation:</strong> Dedicated team investigates all fraud reports</li>
                        <li>• <strong>Law Enforcement Cooperation:</strong> We provide all data to authorities when fraud is confirmed</li>
                    </ul>
                    
                    <div className="mt-6 p-4 bg-amber-500/10 rounded-lg">
                        <p className="text-amber-400 text-sm text-center">
                            ⚠️ <strong>If you've been scammed:</strong> Contact your bank immediately, save all communications, and 
                            <Link to="/report-fraud" className="underline ml-1">file a report with us</Link>. We will assist with law enforcement.
                        </p>
                    </div>
                </div>
                
            </div>
        </div>
    );
}
