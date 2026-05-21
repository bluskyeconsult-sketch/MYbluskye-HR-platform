// src/pages/api/marketing/content.js
// OPTIMIZED - Marketing content API endpoint with caching and fallbacks

export default async function handler(req, res) {
    // ============================================
    // CORS Configuration
    // ============================================
    const corsHeaders = {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
        'Access-Control-Max-Age': '86400'
    };

    // Apply CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: 'Method not allowed',
            allowedMethods: ['GET']
        });
    }

    // ============================================
    // Cache Configuration (for production)
    // ============================================
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
    
    // ============================================
    // Marketing Content Data
    // ============================================
    const marketingContent = {
        // Hero Section
        hero: {
            tagline: "The Governed Workforce Platform",
            title: "BluSkye Integrated Consult",
            subtitle: "ODUSBABA Intelligence",
            description: "Verified skills. Trusted hiring. AI-powered matching.",
            ctaText: "Get Started",
            ctaLink: "/sign-up",
            secondaryCta: {
                text: "Learn More",
                link: "/about"
            }
        },
        
        // Features Section
        features: [
            {
                id: "ai-matching",
                title: "AI-Powered Job Matching",
                description: "ODUSBABA learns from every interaction to find your perfect match",
                icon: "🤖",
                highlight: true
            },
            {
                id: "verified-skills",
                title: "Verified Skills & Trust Scores",
                description: "Skills verified through AI and human oversight",
                icon: "✅",
                highlight: true
            },
            {
                id: "ai-assistant",
                title: "24/7 AI Career Assistant",
                description: "Always-on AI assistance for career guidance and support",
                icon: "💬",
                highlight: true
            },
            {
                id: "fraud-protection",
                title: "Fraud Protection",
                description: "Advanced security measures to protect your profile and interactions",
                icon: "🛡️",
                highlight: false
            },
            {
                id: "governed-trust",
                title: "Governed Trust",
                description: "Building confidence through verified credentials and transparent processes",
                icon: "🏛️",
                highlight: false
            },
            {
                id: "global-workforce",
                title: "Global Workforce",
                description: "Connect with verified professionals worldwide",
                icon: "🌍",
                highlight: false
            }
        ],
        
        // Stats Section
        stats: [
            {
                value: "98%",
                label: "CONFIDENCE",
                description: "Task Execution Success Rate",
                trend: "+2%",
                trendDirection: "up"
            },
            {
                value: "24/7",
                label: "AVAILABILITY",
                description: "Always-on AI Assistance",
                trend: "100%",
                trendDirection: "up"
            },
            {
                value: "10k+",
                label: "IMPACT",
                description: "Documents Generated Globally",
                trend: "+1.2k",
                trendDirection: "up"
            },
            {
                value: "2.5x",
                label: "EFFICIENCY",
                description: "Faster Hiring Process",
                trend: "+0.5x",
                trendDirection: "up"
            }
        ],
        
        // Testimonials Section
        testimonials: [
            {
                id: "sarah-j",
                name: "Sarah Johnson",
                role: "Software Engineer",
                avatar: "SJ",
                text: "Found my dream job in just 2 weeks! The AI matching is incredibly accurate.",
                rating: 5,
                date: "2024-01-15"
            },
            {
                id: "michael-k",
                name: "Michael Kim",
                role: "Product Manager",
                avatar: "MK",
                text: "The AI chat helped me negotiate a 30% raise. Game changer!",
                rating: 5,
                date: "2024-01-10"
            },
            {
                id: "emily-c",
                name: "Emily Chen",
                role: "HR Director",
                avatar: "EC",
                text: "We've reduced our hiring time by 60% using BluSkye's platform. Highly recommended!",
                rating: 5,
                date: "2024-01-05"
            }
        ],
        
        // Footer/Social Proof
        socialProof: {
            companies: [
                "TechCorp", "GlobalFinance", "InnovateLabs", "FutureSoft"
            ],
            badges: [
                "ISO 27001 Certified",
                "GDPR Compliant",
                "SOC 2 Type II"
            ]
        },
        
        // Metadata
        meta: {
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
            source: "api"
        }
    };

    // ============================================
    // Optional: Dynamic Content Loading
    // ============================================
    // Check if we should return specific sections
    const { section, limit } = req.query;
    
    if (section && marketingContent[section]) {
        // Return only requested section
        return res.status(200).json({
            success: true,
            section,
            data: marketingContent[section],
            meta: marketingContent.meta
        });
    }

    // Return full content with pagination for testimonials if limit specified
    let responseData = { ...marketingContent };
    
    if (limit && parseInt(limit) > 0) {
        responseData.testimonials = marketingContent.testimonials.slice(0, parseInt(limit));
        responseData.features = marketingContent.features.slice(0, parseInt(limit));
    }

    // Return full marketing content
    return res.status(200).json({
        success: true,
        data: responseData,
        meta: {
            ...marketingContent.meta,
            totalFeatures: marketingContent.features.length,
            totalTestimonials: marketingContent.testimonials.length,
            totalStats: marketingContent.stats.length
        }
    });
}

// ============================================
// Fallback Content (for offline/error scenarios)
// ============================================
export const fallbackContent = {
    hero: {
        tagline: "The Governed Workforce Platform",
        title: "BluSkye Integrated Consult",
        description: "Connecting talent with opportunity",
        ctaText: "Get Started",
        ctaLink: "/sign-up"
    },
    features: [
        { title: "AI-Powered Matching", description: "Smart job recommendations" },
        { title: "Verified Skills", description: "Trusted credentials" },
        { title: "24/7 Support", description: "Always here to help" }
    ],
    stats: [
        { value: "98%", label: "Success Rate" },
        { value: "24/7", label: "Support" },
        { value: "10k+", label: "Users" }
    ]
};
