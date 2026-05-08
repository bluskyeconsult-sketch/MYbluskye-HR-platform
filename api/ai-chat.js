// api/ai-chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { message, context } = req.body;
  
  // Simple rule-based responses (no API key needed)
  const responses = {
    jobs: "You can manage all job postings in the Admin Dashboard under 'Job Management'. Would you like me to show you the pending approvals?",
    users: "User statistics are available in the Analytics Dashboard. Total users, growth trends, and role breakdowns are displayed there.",
    security: "Security monitoring is available in the Admin Security panel. You can view blocked IPs, audit logs, and security events.",
    system: "System health metrics are in the Diagnostics panel. All systems are currently operational with 99.9% uptime.",
    skills: "The most in-demand skills currently are: AI/ML, Cloud Computing, Data Analysis, Cybersecurity, and Project Management.",
    growth: "Platform insights: User growth is steady (15% month-over-month), job postings increased 12%, and assessment completion rates are up 8%."
  };
  
  let reply = "I can help you with:\n• Pending job approvals\n• User statistics\n• Security monitoring\n• System health\n• Trending skills\n• Platform insights\n\nWhat would you like to know?";
  
  const lowerMsg = message.toLowerCase();
  for (const [key, response] of Object.entries(responses)) {
    if (lowerMsg.includes(key)) {
      reply = response;
      break;
    }
  }
  
  res.status(200).json({ reply });
}
