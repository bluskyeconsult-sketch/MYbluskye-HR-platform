import { useState, useEffect } from 'react'

export default function CookieConsent() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const consented = localStorage.getItem('cookie-consent')
        if (!consented) {
            setVisible(true)
        }
    }, [])

    function acceptCookies() {
        localStorage.setItem('cookie-consent', 'true')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:bottom-4 md:max-w-md z-50">
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">We value your privacy</h3>
                        <p className="text-sm text-gray-600 mb-3">
                            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                            By clicking "Accept", you consent to our use of cookies.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={acceptCookies}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Accept Cookies
                            </button>
                            <a 
                                href="/legal/cookies" 
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Learn More
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
