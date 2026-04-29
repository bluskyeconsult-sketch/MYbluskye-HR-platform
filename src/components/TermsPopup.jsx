import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function TermsPopup({ userId, onAccept }) {
    const [isOpen, setIsOpen] = useState(false)
    const [agreed, setAgreed] = useState(false)

    useEffect(() => {
        checkTermsAccepted()
    }, [userId])

    async function checkTermsAccepted() {
        if (!userId) {
            setIsOpen(true)
            return
        }

        const { data } = await supabase
            .from('profiles')
            .select('terms_accepted_at, terms_accepted_version')
            .eq('id', userId)
            .single()

        if (!data?.terms_accepted_at) {
            setIsOpen(true)
        }
    }

    async function acceptTerms() {
        if (!agreed) {
            alert('You must agree to the Terms of Service to continue.')
            return
        }

        await supabase
            .from('profiles')
            .update({
                terms_accepted_at: new Date().toISOString(),
                terms_accepted_version: '1.0'
            })
            .eq('id', userId)

        setIsOpen(false)
        if (onAccept) onAccept()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-[500px] max-w-[90vw] max-h-[80vh] overflow-y-auto p-6">
                <h2 className="text-xl font-bold mb-4">📋 Terms of Service & Legal Notice</h2>
                
                <div className="space-y-4 text-sm text-gray-700">
                    <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-500">
                        <p className="font-semibold">⚠️ IMPORTANT LEGAL NOTICE</p>
                        <p>• By proceeding, you agree to these terms</p>
                        <p>• We are NOT liable for any hiring or career outcomes</p>
                        <p>• AI advice is for informational purposes only</p>
                    </div>

                    <div>
                        <p className="font-semibold">1. LIMITATION OF LIABILITY</p>
                        <p>BluSkye Consult shall not be liable for any indirect, incidental, special, consequential, or exemplary damages arising from use of the platform.</p>
                    </div>

                    <div>
                        <p className="font-semibold">2. NO RESPONSIBILITY FOR USER DECISIONS</p>
                        <p>Any hiring, employment, or career decisions made based on platform information are solely your responsibility.</p>
                    </div>

                    <div>
                        <p className="font-semibold">3. AI DISCLAIMER</p>
                        <p>AI-powered features are informational only. They do not constitute professional legal, financial, or career advice.</p>
                    </div>

                    <div>
                        <p className="font-semibold">4. AS-IS WARRANTY DISCLAIMER</p>
                        <p>The platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.</p>
                    </div>

                    <div>
                        <p className="font-semibold">5. INDEMNIFICATION</p>
                        <p>You agree to indemnify and hold harmless BluSkye Consult from any claims arising from your platform use.</p>
                    </div>

                    <div>
                        <p className="font-semibold">6. GOVERNING LAW</p>
                        <p>These terms are governed by the laws of the United Kingdom.</p>
                    </div>
                </div>

                <div className="mt-6">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">I have read and agree to the Terms of Service, Privacy Policy, and Legal Disclaimer</span>
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={acceptTerms}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Accept
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-4 text-center">
                    <a href="/legal/terms" className="text-blue-500 hover:underline">View full terms</a>
                </p>
            </div>
        </div>
    )
}
