// src/components/WhyChooseUs.jsx
// PROFESSIONAL WHY CHOOSE US SECTION - Feature showcase with animations

export default function WhyChooseUs() {
    const features = [
        { 
            icon: '🤖', 
            title: 'AI-Powered Intelligence', 
            desc: 'Advanced algorithms for accurate skill verification and job matching',
            color: 'primary'
        },
        { 
            icon: '🛡️', 
            title: 'Governed Trust', 
            desc: 'Every skill and employer is verified through rigorous checks',
            color: 'amber'
        },
        { 
            icon: '⚡', 
            title: '24/7 Availability', 
            desc: 'Round-the-clock AI support for all your career needs',
            color: 'sky'
        },
        { 
            icon: '📊', 
            title: 'Real-time Analytics', 
            desc: 'Track your progress and get personalized insights',
            color: 'emerald'
        }
    ];

    const getColorClasses = (color) => {
        const colors = {
            primary: {
                bg: 'bg-primary-500/10',
                border: 'border-primary-500/20',
                hover: 'hover:border-primary-500/40',
                iconBg: 'bg-primary-500/20'
            },
            amber: {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
                hover: 'hover:border-amber-500/40',
                iconBg: 'bg-amber-500/20'
            },
            sky: {
                bg: 'bg-sky-500/10',
                border: 'border-sky-500/20',
                hover: 'hover:border-sky-500/40',
                iconBg: 'bg-sky-500/20'
            },
            emerald: {
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                hover: 'hover:border-emerald-500/40',
                iconBg: 'bg-emerald-500/20'
            }
        };
        return colors[color] || colors.primary;
    };

    return (
        <div className="py-16 md:py-20 bg-gradient-to-b from-slate-900/50 to-slate-900/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12 md:mb-16">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-4">
                        <span className="text-primary-400 text-sm font-medium">WHY CHOOSE US</span>
                    </div>
                    
                    {/* Title */}
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Why Choose <span className="text-primary-400">ODUSBABA</span>
                    </h2>
                    
                    {/* Subtitle */}
                    <p className="text-slate-400 max-w-2xl mx-auto text-base md:text-lg">
                        An intelligent governance system for the modern workforce
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                    {features.map((feature, idx) => {
                        const colorClasses = getColorClasses(feature.color);
                        return (
                            <div 
                                key={idx} 
                                className={`group text-center p-6 md:p-8 ${colorClasses.bg} rounded-2xl border ${colorClasses.border} ${colorClasses.hover} transition-all duration-300 hover:transform hover:-translate-y-1 backdrop-blur-sm`}
                            >
                                {/* Icon Container */}
                                <div className={`inline-flex items-center justify-center w-16 h-16 ${colorClasses.iconBg} rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110`}>
                                    <span className="text-3xl md:text-4xl">{feature.icon}</span>
                                </div>
                                
                                {/* Title */}
                                <h3 className="text-white font-semibold text-lg md:text-xl mb-2 group-hover:text-primary-400 transition-colors duration-300">
                                    {feature.title}
                                </h3>
                                
                                {/* Description */}
                                <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Optional: Trust Badges */}
                <div className="mt-12 text-center">
                    <div className="inline-flex flex-wrap justify-center gap-4 md:gap-6">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Trusted by 1000+ Job Seekers
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            98% Satisfaction Rate
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            24/7 Customer Support
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
