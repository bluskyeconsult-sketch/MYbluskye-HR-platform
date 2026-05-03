// src/components/ODUSBABAChat.jsx
// COMPLETE - Added logo to chat header, all existing functionality preserved

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageCircle, X, Send, Sparkles, Briefcase, FileText, BookOpen, TrendingUp, Users, Zap, Rocket, Gift, Star } from 'lucide-react';
import { getRemainingChatCredits, recordChatUsage, getAIResponse, escalateToAdmin } from '../services/odusbabaChatService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ODUSBABAChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [remainingCredits, setRemainingCredits] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const GUEST_LIMIT = 5;
    const CTA_INTERVAL = 2; // Show CTA after every 2 messages

    useEffect(() => {
        checkAuth();
        const savedCount = localStorage.getItem('guest-chat-count');
        if (savedCount) setGuestMessageCount(parseInt(savedCount));
    }, []);

    useEffect(() => {
        if (isOpen && user) {
            loadConversation();
            loadRemainingCredits();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setProfile(profile);
        }
    }

    async function loadRemainingCredits() {
        if (!user) return;
        const credits = await getRemainingChatCredits(user.id);
        setRemainingCredits(credits);
    }

    async function loadConversation() {
        if (!user) return;
        
        let { data: conv } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();
        
        if (!conv) {
            const { data: newConv } = await supabase
                .from('chat_conversations')
                .insert({
                    user_id: user.id,
                    title: 'ODUSBABA Chat',
                    jurisdiction: profile?.country_code || 'GB'
                })
                .select()
                .single();
            conv = newConv;
        }
        
        if (conv) {
            setConversationId(conv.id);
            
            const { data: msgs } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true });
            
            if (msgs && msgs.length > 0) {
                setMessages(msgs);
                setMessageCount(msgs.filter(m => m.sender === 'user').length);
            } else {
                const welcomeMsg = {
                    id: 'welcome',
                    sender: 'odusbaba',
                    message: `👋 Hello${profile?.full_name ? ' ' + profile.full_name : ' there'}! I'm ODUSBABA, your AI career assistant. I can help you with job search, CV optimization, career advice, and more. What would you like to explore today?`,
                    created_at: new Date().toISOString()
                };
                setMessages([welcomeMsg]);
            }
        }
    }

    // Generate contextual CTA based on user's conversation
    function getContextualCTA() {
        const lastUserMessage = [...messages].reverse().find(m => m.sender === 'user')?.message || '';
        const lowerLastMessage = lastUserMessage.toLowerCase();
        
        // Job-related conversations
        if (lowerLastMessage.includes('job') || lowerLastMessage.includes('work') || lowerLastMessage.includes('position')) {
            return {
                title: "🎯 Find Your Dream Job Faster",
                description: "Sign up to get personalized job matches delivered to your inbox!",
                cta: "Create Free Account",
                link: "/sign-up",
                icon: <Briefcase className="w-5 h-5" />
            };
        }
        
        // CV-related conversations
        if (lowerLastMessage.includes('cv') || lowerLastMessage.includes('resume')) {
            return {
                title: "📄 Get Your CV Analyzed by AI",
                description: "Upload your CV and get instant feedback, skill extraction, and job matching!",
                cta: "Upload CV Now",
                link: "/sign-up",
                icon: <FileText className="w-5 h-5" />
            };
        }
        
        // Interview-related conversations
        if (lowerLastMessage.includes('interview') || lowerLastMessage.includes('prepare')) {
            return {
                title: "🎯 Ace Your Next Interview",
                description: "Get access to 100+ interview questions and practice with our AI coach!",
                cta: "Start Practicing",
                link: "/sign-up",
                icon: <Users className="w-5 h-5" />
            };
        }
        
        // Salary-related conversations
        if (lowerLastMessage.includes('salary') || lowerLastMessage.includes('negotiate')) {
            return {
                title: "💰 Know Your Worth",
                description: "Get salary insights and negotiation scripts tailored to your role and location!",
                cta: "Get Salary Data",
                link: "/sign-up",
                icon: <TrendingUp className="w-5 h-5" />
            };
        }
        
        // Skill-related conversations
        if (lowerLastMessage.includes('skill') || lowerLastMessage.includes('learn')) {
            return {
                title: "📚 Level Up Your Skills",
                description: "Discover personalized course recommendations based on your career goals!",
                cta: "Explore Courses",
                link: "/courses",
                icon: <BookOpen className="w-5 h-5" />
            };
        }
        
        // Default CTA
        return {
            title: "✨ Unlock Full AI Features",
            description: "Sign up for free to get unlimited chat, CV analysis, and personalized job matching!",
            cta: "Get Started Free",
            link: "/sign-up",
            icon: <Rocket className="w-5 h-5" />
        };
    }

    // Show CTA after every 2 messages
    function shouldShowCTA() {
        if (user) return false; // No CTA for logged-in users
        if (messageCount === 0) return false;
        return messageCount % CTA_INTERVAL === 0;
    }

    // Enhanced guest response function
    function getEnhancedGuestResponse(input) {
        const lowerInput = input.toLowerCase();
        
        // Job search intent
        if (lowerInput.includes('job') || lowerInput.includes('work') || lowerInput.includes('position') || 
            lowerInput.includes('vacancy') || lowerInput.includes('hire') || lowerInput.includes('recruit')) {
            return {
                response: `🔍 **Job Search Help**

I'd love to help you find the perfect job! Here's what I can do for you:

✅ **Browse jobs** - Go to the Jobs page to see all available positions
✅ **Search by keyword** - Find jobs matching your skills
✅ **Filter by location** - Jobs in UK, Nigeria, US, Canada, Germany, Australia, and more

**To unlock personalized job matching:**
1. Sign up for free (takes 30 seconds)
2. Upload your CV
3. Get AI-powered job recommendations tailored to you

👉 [Create Free Account](/sign-up)

Already have an account? [Sign In](/sign-in)

What specific job title or industry are you interested in?`,
                needsEscalation: false
            };
        }
        
        // CV/Resume intent
        if (lowerInput.includes('cv') || lowerInput.includes('resume') || lowerInput.includes('curriculum') || 
            lowerInput.includes('application') || lowerInput.includes('cover letter')) {
            return {
                response: `📄 **CV & Resume Help**

I can help you create a standout CV! Here are some professional tips:

**CV Best Practices:**
• Keep it to 2 pages maximum (1 page for US resumes)
• Use action verbs (achieved, managed, led, created)
• Quantify your achievements with numbers
• Tailor your CV to each job application
• Include keywords from the job description

**CV Sections to Include:**
1. Contact information
2. Professional summary
3. Work experience (with achievements)
4. Skills (technical and soft)
5. Education and certifications

**To get your CV analyzed by AI:**
1. Sign up for free
2. Upload your CV
3. Get instant skill extraction and job matching

👉 [Create Free Account and Upload CV](/sign-up)

Would you like me to help with a specific section of your CV?`,
                needsEscalation: false
            };
        }
        
        // Skill development / learning intent
        if (lowerInput.includes('skill') || lowerInput.includes('learn') || lowerInput.includes('course') || 
            lowerInput.includes('training') || lowerInput.includes('upskill') || lowerInput.includes('certification')) {
            return {
                response: `📚 **Skill Development & Learning**

I can help you identify skills to advance your career!

**In-Demand Skills for 2026:**
• AI and Machine Learning
• Data Analysis and Visualization
• Project Management (Agile, Scrum)
• Cloud Computing (AWS, Azure, GCP)
• Cybersecurity
• Digital Marketing
• Communication and Leadership

**How to develop these skills:**
✅ Browse our courses at /courses
✅ Read our HR and career books at /books
✅ Take free assessments to identify your strengths

**To get personalized skill recommendations:**
1. Sign up for free
2. Complete your profile
3. Get AI-powered skill gap analysis

👉 [Create Free Account](/sign-up)

What skills are you most interested in developing?`,
                needsEscalation: false
            };
        }
        
        // Interview preparation intent
        if (lowerInput.includes('interview') || lowerInput.includes('prepare') || lowerInput.includes('question') || 
            lowerInput.includes('tips') || lowerInput.includes('advice')) {
            return {
                response: `🎯 **Interview Preparation Guide**

I can help you ace your next interview!

**Common Interview Questions:**
1. "Tell me about yourself" - Focus on professional background
2. "Why do you want this job?" - Research the company
3. "What are your strengths/weaknesses?" - Be honest but strategic
4. "Where do you see yourself in 5 years?" - Show ambition

**STAR Method for Behavioral Questions:**
• **S**ituation - Set the context
• **T**ask - What needed to be accomplished
• **A**ction - What you actually did
• **R**esult - The outcome (use numbers)

**Questions to Ask the Employer:**
• What does success look like in this role?
• What are the team's biggest challenges?
• How is performance measured?

**To practice with AI:**
1. Sign up for free
2. Access interview question generator
3. Get personalized feedback

👉 [Create Free Account](/sign-up)

Would you like me to help you prepare for a specific role?`,
                needsEscalation: false
            };
        }
        
        // Salary negotiation intent
        if (lowerInput.includes('salary') || lowerInput.includes('negotiate') || lowerInput.includes('pay') || 
            lowerInput.includes('raise') || lowerInput.includes('increase') || lowerInput.includes('compensation')) {
            return {
                response: `💰 **Salary Negotiation Tips**

Negotiating your salary can increase your lifetime earnings significantly!

**Before Negotiating:**
• Research market rates (Glassdoor, LinkedIn, Levels.fyi)
• Know your worth based on experience and skills
• Consider total compensation (benefits, bonus, remote work)

**Sample Script:**
*"Based on my research and experience, I'm looking for a range between $X and $Y. I'm flexible based on total compensation."*

**What to Negotiate:**
✅ Base salary
✅ Signing bonus
✅ Annual bonus potential
✅ Remote work days
✅ Vacation time
✅ Professional development budget

**If They Say No:**
• Ask: "What would it take to reach $X?"
• Negotiate a 3-6 month performance review
• Request additional vacation or benefits

**To get market salary data for your role:**
1. Sign up for free
2. Complete your profile
3. Get AI-powered salary insights

👉 [Create Free Account](/sign-up)

Would you like salary data for a specific role and location?`,
                needsEscalation: false
            };
        }
        
        // Employer/Hiring intent
        if (lowerInput.includes('employer') || lowerInput.includes('hire') || lowerInput.includes('recruit') || 
            lowerInput.includes('post job') || lowerInput.includes('candidate')) {
            return {
                response: `🏢 **For Employers & Hiring Managers**

Looking to hire top talent? ODUSBABA can help you find the right candidates!

**Employer Features:**
✅ Post jobs to reach qualified candidates
✅ AI-powered candidate matching
✅ Applicant tracking system
✅ View candidate trust scores and verified skills
✅ Bulk applicant export (Business plan)

**Pricing Plans:**
• **Employer** ($129.99/month) - 20 job posts, view applicants
• **Business** ($399.99/month) - Unlimited jobs, team accounts (5 users), API access

**To get started:**
👉 [Create Employer Account](/sign-up?type=employer)

**Need help writing job descriptions?** I can help you create compelling job posts that attract the right talent.

What type of role are you looking to fill?`,
                needsEscalation: false
            };
        }
        
        // Assessment intent
        if (lowerInput.includes('assessment') || lowerInput.includes('test') || lowerInput.includes('personality') || 
            lowerInput.includes('psychometric') || lowerInput.includes('evaluate')) {
            return {
                response: `📊 **Career Assessments**

Discover your strengths and identify growth opportunities!

**Available Assessments:**
🧠 **Personality Profile (Big 5)** - Understand your workplace personality
💡 **Emotional Intelligence (EQ)** - Measure emotional awareness
👔 **Leadership Potential** - Evaluate management readiness
💬 **Communication Skills** - Assess verbal and written skills
🔧 **Problem Solving** - Measure analytical thinking
🤝 **Team Collaboration** - Evaluate teamwork ability
🎯 **Career Aptitude** - Discover careers matching your strengths

**Free users:** 1 free assessment per month
**Professional users:** Unlimited assessments

👉 [Take Free Assessment](/assessments)

Which assessment would you like to try first?`,
                needsEscalation: false
            };
        }
        
        // Virtual Assistant intent
        if (lowerInput.includes('virtual assistant') || lowerInput.includes('va') || lowerInput.includes('hire va') || 
            lowerInput.includes('cv optimization') || lowerInput.includes('linkedin makeover')) {
            return {
                response: `🤖 **Hire a Virtual Assistant**

Our AI-powered Virtual Assistants can help with career tasks instantly!

**Available Virtual Assistants:**
📄 **CV Optimizer Pro** - Rewrite your CV for ATS systems
✍️ **Cover Letter Writer** - Generate personalized cover letters
🔗 **LinkedIn Makeover** - Optimize your profile for recruiters
📊 **Skill Gap Analyst** - Identify missing skills
🎯 **Interview Q Generator** - Prepare with role-specific questions
💰 **Salary Negotiation Coach** - Get market data and scripts

**Pricing:** Starting from $9.99 per task
**Registered users:** 1 free task/month
**Professional users:** 10 free tasks/month

👉 [Browse All Virtual Assistants](/hire-va)

Which task would you like help with today?`,
                needsEscalation: false
            };
        }
        
        // General help / what can you do
        if (lowerInput.includes('help') || lowerInput.includes('what can you do') || lowerInput.includes('capabilities') || 
            lowerInput.includes('features') || lowerInput.includes('how can you help')) {
            return {
                response: `✨ **How I Can Help You**

I'm ODUSBABA, your AI career assistant. Here's everything I can do:

**🔍 Job Search**
• Find jobs matching your skills
• Get job alerts for new positions
• Save jobs to apply later

**📄 Career Development**
• CV optimization tips and analysis
• Interview preparation and practice
• Salary negotiation strategies
• Skill gap identification

**📚 Learning**
• Course recommendations
• Book suggestions
• Career path guidance

**🏢 For Employers**
• Post job openings
• Find qualified candidates
• AI-powered candidate matching

**🤖 Virtual Assistants**
• CV rewrite service
• Cover letter generation
• LinkedIn profile optimization

**📊 Assessments**
• Personality tests
• Skills evaluations
• Career aptitude tests

**To unlock all features:**
1. **Free** - Browse only
2. **Registered** - Apply to jobs, basic AI (free)
3. **Professional** - Unlimited AI, CV analysis ($39.99/month)

👉 [Create Free Account](/sign-up) or [Sign In](/sign-in)

What would you like help with first?`,
                needsEscalation: false
            };
        }
        
        // Platform info
        if (lowerInput.includes('about') || lowerInput.includes('what is odusbaba') || lowerInput.includes('platform')) {
            return {
                response: `🚀 **About ODUSBABA**

ODUSBABA is an AI-governed workforce platform that connects professionals and employers through verified skills and intelligent matching.

**Our Mission:** "Creating Value for Partnership"

**What makes us different:**
✅ **Governed Trust** - Skills verified through AI + human oversight
✅ **AI-Powered Intelligence** - Smart matching and career guidance
✅ **Global Reach** - Jobs and talent from 7 countries
✅ **Real-Time Matching** - Instant job and skill matching

**Our Services:**
• Job Board - Find verified opportunities
• Workforce Marketplace - Browse verified skills
• Virtual Assistants - AI-powered task completion
• Assessments - Psychometric and skill evaluations
• Affiliate Program - Earn commissions on referrals

👉 [Create Free Account](/sign-up) to get started!

Want to learn more about a specific feature? Just ask!`,
                needsEscalation: false
            };
        }
        
        // Pricing inquiry
        if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('pricing') || 
            lowerInput.includes('subscription') || lowerInput.includes('plan')) {
            return {
                response: `💰 **ODUSBABA Pricing Plans**

**Free** - $0/month
• Browse jobs and marketplace
• 5 AI chat messages/month
• 1 CV analysis/month

**Registered** - $0/month
• Apply to jobs (10/month)
• Submit skills (3 total)
• 20 AI chat messages/month
• Job alerts (3 alerts)

**Professional** - $39.99/month
• Unlimited job applications
• Unlimited skill submissions
• 100 AI chat messages/month
• 20 CV analyses/month
• Gated content access
• 10 VA tasks/month

**Employer** - $129.99/month
• Post jobs (20/month)
• View applicants
• Contact candidates
• 5 VA tasks/month

**Business** - $399.99/month
• Unlimited job posts
• Team accounts (5 users)
• Bulk applicant export
• API access
• 20 VA tasks/month

👉 [View Full Pricing Details](/pricing)

All plans include geo-pricing - prices vary by country. Which plan interests you?`,
                needsEscalation: false
            };
        }
        
        // Default welcome response
        return {
            response: `👋 **Welcome to ODUSBABA!**

I'm your AI career assistant. I can help you with:

🔍 **Job search** - Find positions matching your skills
📄 **CV optimization** - Get your resume interview-ready
💰 **Salary negotiation** - Tips and market data
📚 **Career growth** - Courses and skill recommendations
🏢 **Employer services** - Post jobs and find talent
🤖 **Virtual Assistants** - Get tasks done instantly
📊 **Assessments** - Discover your strengths

**To get personalized assistance:**
👉 [Create Free Account](/sign-up) (30 seconds)

Already have an account? [Sign In](/sign-in)

**Try asking me:**
• "Find me jobs in UK"
• "Help with my CV"
• "Interview tips"
• "Salary negotiation"
• "What assessments are available?"

What would you like help with today?`,
            needsEscalation: false
        };
    }

    async function sendMessage() {
        if (!input.trim() || loading) return;
        
        // Guest user (not logged in)
        if (!user) {
            if (guestMessageCount >= GUEST_LIMIT) {
                const errorMsg = {
                    id: Date.now(),
                    sender: 'odusbaba',
                    message: `💡 **You've reached your free message limit (${GUEST_LIMIT} messages)**

Sign up for free to unlock:
✅ Unlimited chat messages
✅ CV analysis and skill extraction
✅ Personalized job matching
✅ AI-powered career advice

👉 [Create Free Account](/sign-up)

Already have an account? [Sign In](/sign-in)

Thank you for trying ODUSBABA!`,
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
            
            // Increment message count for CTA trigger
            const newMessageCount = messageCount + 1;
            setMessageCount(newMessageCount);
            
            const enhancedResponse = getEnhancedGuestResponse(input);
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: enhancedResponse.response,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            
            const newCount = guestMessageCount + 1;
            setGuestMessageCount(newCount);
            localStorage.setItem('guest-chat-count', newCount.toString());
            
            // Show CTA after every 2 messages
            if (newMessageCount % CTA_INTERVAL === 0) {
                const cta = getContextualCTA();
                const ctaMsg = {
                    id: Date.now() + 2,
                    sender: 'odusbaba',
                    message: `✨ **${cta.title}**

${cta.description}

👉 [${cta.cta}](${cta.link})

*This message appears after every 2 messages to help you get the most out of ODUSBABA.*`,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, ctaMsg]);
            }
            
            setLoading(false);
            return;
        }
        
        // Logged-in user
        if (remainingCredits?.remaining <= 0) {
            const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
            setMessages(prev => [...prev, userMsg]);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: `⚠️ **You've reached your monthly chat limit (${remainingCredits?.limit || 5} messages)**

**Options to continue:**
• Upgrade to Professional for unlimited messages (${remainingCredits?.tier === 'free' ? '$39.99/month' : 'upgrade now'})
• Wait until next month when your credits reset
• Purchase extra credits

👉 [View Pricing Plans](/pricing)

Would you like me to help you upgrade?`,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
            setInput('');
            setLoading(false);
            return;
        }
        
        const userMsg = { id: Date.now(), sender: 'user', message: input, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        
        try {
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: input
                });
            }
            
            const aiResponse = await getAIResponse(user?.id, input, conversationId, profile, remainingCredits?.tier);
            
            const botMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: aiResponse.response,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            
            if (conversationId) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: aiResponse.response
                });
            }
            
            await recordChatUsage(user.id);
            await loadRemainingCredits();
            
            if (aiResponse.needsEscalation && user) {
                const ticket = await escalateToAdmin(
                    user.id,
                    conversationId,
                    aiResponse.escalationSubject || 'User requested assistance',
                    input
                );
                const escalationMsg = {
                    id: Date.now() + 2,
                    sender: 'odusbaba',
                    message: `✅ **Request Escalated**

Your request has been sent to our admin team.

**Ticket Reference:** ${ticket.ticketId.substring(0, 8)}

A human administrator will respond within 24 hours. You can also contact us directly at support@bluskyeconsult.com

Is there anything else I can help you with while you wait?`,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, escalationMsg]);
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: escalationMsg.message
                });
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                id: Date.now() + 1,
                sender: 'odusbaba',
                message: `⚠️ **I encountered an issue processing your request.**

Please try again in a moment. If the problem persists, please contact support at support@bluskyeconsult.com

**Debug info:** ${error.message.substring(0, 100)}`,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function getTierColor() {
        switch (remainingCredits?.tier) {
            case 'free': return 'text-slate-400';
            case 'registered': return 'text-blue-400';
            case 'professional': return 'text-emerald-400';
            case 'employer': return 'text-purple-400';
            case 'business': return 'text-amber-400';
            default: return 'text-slate-400';
        }
    }

    const showCTA = shouldShowCTA();

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-full shadow-lg hover:scale-105 transition-all duration-300 hover:shadow-primary-500/25"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
                    
                    {/* ============================================ */}
                    {/* HEADER WITH LOGO - UPDATED SECTION */}
                    {/* ============================================ */}
                    <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* BRANDED LOGO - ADDED HERE */}
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-sky-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 4a6 6 0 100 12 6 6 0 000-12zM7 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">ODUSBABA</h3>
                                    <p className="text-xs text-slate-400">AI Career Assistant</p>
                                </div>
                            </div>
                            {user && remainingCredits ? (
                                <div className="text-right">
                                    <div className={`text-xs font-medium ${getTierColor()}`}>
                                        {remainingCredits.tier.toUpperCase()} • {remainingCredits.remaining} credits left
                                    </div>
                                    {remainingCredits.remaining <= 5 && remainingCredits.remaining > 0 && (
                                        <div className="text-xs text-amber-400">⚠️ Low credits</div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-right">
                                    <div className="text-xs text-slate-400">
                                        💬 {guestMessageCount}/{GUEST_LIMIT} free messages
                                    </div>
                                    {guestMessageCount >= GUEST_LIMIT - 1 && guestMessageCount < GUEST_LIMIT && (
                                        <div className="text-xs text-amber-400">⚠️ Last free message</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                                        msg.sender === 'user'
                                            ? 'bg-primary-500 text-white rounded-br-sm'
                                            : msg.message.includes('✨') && msg.message.includes('unlock')
                                                ? 'bg-gradient-to-r from-purple-600/30 to-primary-600/30 border border-purple-500/30 text-slate-200 rounded-bl-sm'
                                                : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                                    }`}
                                >
                                    <div className="text-sm whitespace-pre-wrap">{msg.message}</div>
                                    <p className="text-xs opacity-50 mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 border-t border-slate-800 bg-slate-900/50 overflow-x-auto">
                        <div className="flex gap-2 pb-2">
                            <button onClick={() => setInput('Find me jobs in UK')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 whitespace-nowrap">
                                <Briefcase className="w-3 h-3" /> Find Jobs
                            </button>
                            <button onClick={() => setInput('Help with my CV')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 whitespace-nowrap">
                                <FileText className="w-3 h-3" /> CV Help
                            </button>
                            <button onClick={() => setInput('Interview tips')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 whitespace-nowrap">
                                <Users className="w-3 h-3" /> Interview Tips
                            </button>
                            <button onClick={() => setInput('Salary negotiation advice')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 whitespace-nowrap">
                                <TrendingUp className="w-3 h-3" /> Salary Help
                            </button>
                            <button onClick={() => setInput('Show me available courses')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-full hover:bg-slate-700 whitespace-nowrap">
                                <BookOpen className="w-3 h-3" /> Courses
                            </button>
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900">
                        <div className="flex gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={user ? "Ask ODUSBABA anything..." : "Try ODUSBABA free (5 messages)..."}
                                rows={1}
                                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 resize-none"
                                style={{ minHeight: '44px', maxHeight: '100px' }}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        {!user && (
                            <p className="text-xs text-slate-500 text-center mt-2">
                                <a href="/sign-up" className="text-primary-400 hover:underline">Sign up free</a> or <a href="/sign-in" className="text-primary-400 hover:underline">log in</a> for unlimited chat
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
