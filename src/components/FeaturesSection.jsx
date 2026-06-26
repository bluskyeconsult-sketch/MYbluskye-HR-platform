// src/components/FeaturesSection.jsx - RESPONSIVE GRID
export default function FeaturesSection() {
    const features = [
        { icon: '🤖', title: 'AI-Powered Insights', desc: 'AI-powered insights to drive better decisions.' },
        { icon: '🌍', title: 'Global Presence', desc: 'Global presence to ensure compliance and reach.' },
        { icon: '💡', title: 'New Technology', desc: 'New technology to stay ahead of the competition.' },
        { icon: '📊', title: 'Latest Insights', desc: 'Latest insights to help you make informed decisions.' }
    ];

    return (
        <div className="py-12 sm:py-16 lg:py-20 bg-slate-900/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-12">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                        An intelligent governance system for the modern workforce
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
                        Experience the future of HR with AI-powered intelligence and verified trust
                    </p>
                </div>

                {/* Responsive Grid: 1 column mobile, 2 columns tablet, 4 columns desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                    {features.map((feature, idx) => (
                        <div key={idx} className="text-center p-4 sm:p-6 bg-slate-800/30 rounded-xl border border-slate-700 hover:border-primary-500/30 transition">
                            <div className="text-3xl sm:text-4xl mb-3">{feature.icon}</div>
                            <h3 className="text-white font-semibold text-base sm:text-lg mb-2">{feature.title}</h3>
                            <p className="text-slate-400 text-xs sm:text-sm">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
