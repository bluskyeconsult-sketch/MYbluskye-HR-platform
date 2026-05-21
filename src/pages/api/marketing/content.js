// src/pages/api/marketing/content.js
// Marketing content API endpoint

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Return marketing content
    const content = {
        tagline: "The Governed Workforce Platform",
        features: [
            "AI-Powered Job Matching",
            "Verified Skills & Trust Scores",
            "24/7 AI Career Assistant",
            "Fraud Protection"
        ],
        testimonials: [
            { name: "Sarah J.", text: "Found my dream job in 2 weeks!", rating: 5 },
            { name: "Michael K.", text: "The AI chat helped me negotiate a 30% raise.", rating: 5 }
        ]
    };

    return res.status(200).json(content);
}
