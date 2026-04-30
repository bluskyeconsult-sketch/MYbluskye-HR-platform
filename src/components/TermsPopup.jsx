import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function TermsPopup({ userId, onAccept }) {
    const [isOpen, setIsOpen] = useState(false)
    const [agreed, setAgreed] = useState(false)

    useEffect(() => {
        // Check localStorage FIRST (this survives page refreshes)
        const localAccepted = localStorage.getItem('terms-accepted')
        if (localAccepted === 'true') {
            setIsOpen(false)
            return
        }

        // If not in localStorage, check database
        checkTermsAccepted()
    }, [userId])

    async function checkTermsAccepted() {
        if (!userId) {
            // Not logged in - don't show popup
            setIsOpen(false)
            return
        }

        const { data } = await supabase
            .from('profiles')
            .select('terms_accepted_at')
            .eq('id', userId)
            .single()

        if (data?.terms_accepted_at) {
            // Already accepted in database
            localStorage.setItem('terms-accepted', 'true')
            setIsOpen(false)
        } else {
            // Never accepted - show popup
            setIsOpen(true)
        }
    }

    async function acceptTerms() {
        if (!agreed) {
            alert('You must agree to the Terms of Service to continue.')
            return
        }

        // Save to database
        await supabase
            .from('profiles')
            .update({
                terms_accepted_at: new Date().toISOString(),
                terms_accepted_version: '1.0'
            })
            .eq('id', userId)

        // Save to localStorage (so it survives page refreshes)
        localStorage.setItem('terms-accepted', 'true')

        setIsOpen(false)
        if (onAccept) onAccept()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 w-[500px] max-w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="border-b border-slate-800 p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Terms of Service & Legal Notice</h2>
                            <p className="text-sm text-slate-400">Please read carefully before proceeding</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-sm text-slate-300 max-h-[50vh] overflow-y-auto">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <p className="font-semibold text-amber-400 mb-2">⚠️ IMPORTANT LEGAL NOTICE</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-300">
                            <li>By proceeding, you agree to these terms</li>
                            <li>We are NOT liable for any hiring or career outcomes</li>
                            <li>AI advice is for informational purposes only</li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="font-semibold text-white">1. LIMITATION OF LIABILITY</p>
                            <p className="text-slate-400">BluSkye Consult shall not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from use of the platform.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">2. NO RESPONSIBILITY FOR USER DECISIONS</p>
                            <p className="text-slate-400">Any hiring, employment, or career decisions made based on platform information are solely your responsibility.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">3. AI DISCLAIMER</p>
                            <p className="text-slate-400">AI-powered features are informational only. They do not constitute professional legal, financial, or career advice.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">4. AS-IS WARRANTY DISCLAIMER</p>
                            <p className="text-slate-400">The platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">5. INDEMNIFICATION</p>
                            <p className="text-slate-400">You agree to indemnify and hold harmless BluSkye Consult from any claims arising from your platform use.</p>
                        </div>
                        <div>
                            <p className="font-semibold text-white">6. GOVERNING LAW</p>
                            <p className="text-slate-400">These terms are governed by the laws of the United Kingdom.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-800 p-5">
                    <label className="flex items-center gap-3 mb-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-emerald-500"
                        />
                        <span className="text-sm text-slate-300">I have read and agree to the Terms of Service, Privacy Policy, and Legal Disclaimer</span>
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={acceptTerms}
                            disabled={!agreed}
                            className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Accept & Continue
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-4 text-center">
                        <a href="/legal/terms" className="text-sky-400 hover:underline">View full terms</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
