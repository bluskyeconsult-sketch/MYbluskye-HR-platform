import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X, Gift, Shield, CheckCircle } from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function PremiumTermsPopup({ userId, onAccept }) {
    const [isOpen, setIsOpen] = useState(false)
    const [email, setEmail] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [showDiscount, setShowDiscount] = useState(true)

    useEffect(() => {
        const localAccepted = localStorage.getItem('terms-accepted')
        if (localAccepted === 'true') {
            setIsOpen(false)
            return
        }
        checkTermsAccepted()
    }, [userId])

    async function checkTermsAccepted() {
        if (!userId) {
            setIsOpen(false)
            return
        }

        const { data } = await supabase
            .from('profiles')
            .select('terms_accepted_at')
            .eq('id', userId)
            .single()

        if (data?.terms_accepted_at) {
            localStorage.setItem('terms-accepted', 'true')
            setIsOpen(false)
        } else {
            setIsOpen(true)
        }
    }

    async function handleSubscribeAndAccept() {
        if (!agreed) {
            alert('You must agree to the Terms of Service to continue.')
            return
        }

        // Save email to newsletter if provided
        if (email) {
            await supabase.from('newsletter_subscribers').upsert({ 
                email, 
                subscribed_at: new Date().toISOString() 
            })
        }

        // Save terms acceptance
        await supabase
            .from('profiles')
            .update({
                terms_accepted_at: new Date().toISOString(),
                terms_accepted_version: '1.0'
            })
            .eq('id', userId)

        localStorage.setItem('terms-accepted', 'true')
        if (onAccept) onAccept()
        setIsOpen(false)
    }

    function closePopup() {
        setShowDiscount(false)
        setIsOpen(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative max-w-md w-full">
                {/* Close button */}
                <button
                    onClick={closePopup}
                    className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Discount Banner */}
                {showDiscount && (
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl p-4 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Gift className="w-5 h-5 text-white" />
                            <span className="text-white font-bold text-lg">Unlock 10% off Today</span>
                        </div>
                        <p className="text-white/90 text-sm">When you sign up for emails and texts.</p>
                    </div>
                )}

                {/* Main Popup Card */}
                <div className="bg-slate-900 rounded-b-2xl border border-slate-800 shadow-2xl overflow-hidden">
                    {/* Email Input Section */}
                    <div className="p-6">
                        <div className="mb-4">
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <button
                            onClick={handleSubscribeAndAccept}
                            disabled={!agreed}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-lg hover:from-emerald-500 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            CONTINUE
                        </button>

                        <p className="text-xs text-slate-500 text-center mt-3">
                            Only valid on Kits over $25
                        </p>
                    </div>

                    {/* Terms Agreement */}
                    <div className="border-t border-slate-800 p-4 bg-slate-800/30">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 checked:bg-emerald-500"
                            />
                            <span className="text-xs text-slate-400">
                                By providing your e-mail address, you agree to our 
                                <a href="/legal/terms" className="text-emerald-400 hover:underline ml-1">Terms</a>
                                <span className="mx-1">and</span>
                                <a href="/legal/privacy" className="text-emerald-400 hover:underline">Privacy Policy</a>
                            </span>
                        </label>
                    </div>

                    {/* Trust Badges */}
                    <div className="border-t border-slate-800 p-3 bg-slate-900 flex justify-center gap-4">
                        <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-slate-500">Secure</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-xs text-slate-500">Verified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
