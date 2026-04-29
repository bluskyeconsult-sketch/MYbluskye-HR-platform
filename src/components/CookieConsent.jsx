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
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm">
                    We use cookies to improve your experience. By continuing, you agree to our 
                    <a href="/legal/cookies" className="underline ml-1 hover:text-gray-300">Cookie Policy</a>.
                </p>
                <button
                    onClick={acceptCookies}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-sm"
                >
                    Accept Cookies
                </button>
            </div>
        </div>
    )
}
