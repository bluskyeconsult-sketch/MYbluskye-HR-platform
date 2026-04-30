// Add this state for guest messages
const [guestMessages, setGuestMessages] = useState([]);
const [guestMessageCount, setGuestMessageCount] = useState(0);
const GUEST_LIMIT = 5;

// Modify the sendMessage function to handle guests
async function sendMessage() {
    if (!input.trim() || loading) return;
    
    // Handle guest users (not logged in)
    if (!user) {
        if (guestMessageCount >= GUEST_LIMIT) {
            const errorMsg = {
                id: Date.now(),
                sender: 'odusbaba',
                message: `💡 You've used your ${GUEST_LIMIT} free messages! Sign up or log in to continue chatting with ODUSBABA and unlock:\n\n✅ Unlimited chat\n✅ CV analysis\n✅ Job matching\n✅ Personalized recommendations\n✅ Skill gap analysis\n\n[Sign Up](/-/sign-up) or [Log In](/-/sign-in) to continue!`,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
            setInput('');
            return;
        }
        
        const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        
        // Simple AI response for guests
        const lowerInput = input.toLowerCase();
        let response = '';
        
        if (lowerInput.includes('job') || lowerInput.includes('work')) {
            response = `🔍 I'd love to help you find jobs! Sign up for free to access our job board with thousands of verified positions across 7 countries. [Sign Up Here](/-/sign-up)`;
        } else if (lowerInput.includes('cv') || lowerInput.includes('resume')) {
            response = `📄 CV analysis is available for registered users. Sign up for free to upload your CV and get AI-powered skill extraction and job matching!`;
        } else if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
            response = `✨ I'm ODUSBABA, your AI HR assistant! I can help with:\n\n🔍 Finding jobs\n📄 Analyzing CVs\n📚 Suggesting courses\n💡 Answering HR questions\n\nSign up for free to unlock all features!`;
        } else {
            response = `👋 Welcome to ODUSBABA! I'm your AI HR assistant. Sign up for free to get personalized job recommendations, CV analysis, and much more!`;
        }
        
        const botMsg = {
            id: Date.now() + 1,
            sender: 'odusbaba',
            message: response,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMsg]);
        setGuestMessageCount(prev => prev + 1);
        setLoading(false);
        return;
    }
    
    // Rest of existing sendMessage code for logged-in users...
}
