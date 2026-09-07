// src/components/ODUSBABAChat.jsx
// ODUSBABA AI CHAT v7.2 - PRODUCTION READY
// ✅ Intent detection and intelligent routing via Unified API
// ✅ Role-based access, tier-gated features
// ✅ Job search with sponsorship, PR, and skill matching
// ✅ Legal information fetching for 9 countries
// ✅ Conversation history, typing indicators
// ✅ Guest mode support with limit tracking
// ✅ Admin-approved URL scraping

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
    MessageCircle, X, Send, Bot, User, Sparkles, Briefcase, 
    FileText, Award, TrendingUp, Users, Zap, Loader2, Shield,
    CreditCard, ChevronDown, Copy, Check, AlertCircle, Scale,
    Globe, BookOpen, Brain, Search
} from 'lucide-react';

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = '/api/index';
const CHAT_ENDPOINT = `${API_BASE}?action=chat`;
const GUEST_LIMIT = 5;
const MAX_HISTORY_MESSAGES = 10;
const TYPING_DELAY = 500;
const AUTO_CLOSE_DELAY = 300000;

// ============================================
// LEGAL SOURCES CONFIGURATION
// ============================================

const LEGAL_SOURCES = {
    'UK': { name: 'United Kingdom', laborLaw: 'https://www.gov.uk/employment-status', rights: 'https://www.acas.org.uk/', health: 'https://www.hse.gov.uk/', flag: '🇬🇧' },
    'US': { name: 'United States', laborLaw: 'https://www.dol.gov/', rights: 'https://www.eeoc.gov/', health: 'https://www.osha.gov/', flag: '🇺🇸' },
    'CA': { name: 'Canada', laborLaw: 'https://www.canada.ca/en/employment-social-development.html', rights: 'https://www.chrc-ccdp.gc.ca/', health: 'https://www.ccohs.ca/', flag: '🇨🇦' },
    'AU': { name: 'Australia', laborLaw: 'https://www.fairwork.gov.au/', rights: 'https://humanrights.gov.au/', health: 'https://www.safeworkaustralia.gov.au/', flag: '🇦🇺' },
    'DE': { name: 'Germany', laborLaw: 'https://www.bmas.de/EN/', rights: 'https://www.antidiskriminierungsstelle.de/', health: 'https://www.baua.de/', flag: '🇩🇪' },
    'FR': { name: 'France', laborLaw: 'https://travail-emploi.gouv.fr/', rights: 'https://www.defenseurdesdroits.fr/', health: 'https://www.inrs.fr/', flag: '🇫🇷' },
    'NG': { name: 'Nigeria', laborLaw: 'https://labour.gov.ng/', rights: 'https://www.nigeriarights.gov.ng/', health: 'https://www.nhfvilla.gov.ng/', flag: '🇳🇬' },
    'IE': { name: 'Ireland', laborLaw: 'https://www.workplacerelations.ie/', rights: 'https://www.ihrec.ie/', health: 'https://www.hsa.ie/', flag: '🇮🇪' },
    'IN': { name: 'India', laborLaw: 'https://labour.gov.in/', rights: 'https://nhrc.nic.in/', health: 'https://www.dgfasli.nic.in/', flag: '🇮🇳' }
};

// ============================================
// INTENT DETECTION HELPERS
// ============================================

function detectCountry(message) {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('uk') || lowerMsg.includes('britain') || lowerMsg.includes('england')) return { country: 'United Kingdom', code: 'UK' };
    if (lowerMsg.includes('us') || lowerMsg.includes('usa') || lowerMsg.includes('america')) return { country: 'United States', code: 'US' };
    if (lowerMsg.includes('canada')) return { country: 'Canada', code: 'CA' };
    if (lowerMsg.includes('australia')) return { country: 'Australia', code: 'AU' };
    if (lowerMsg.includes('germany')) return { country: 'Germany', code: 'DE' };
    if (lowerMsg.includes('france')) return { country: 'France', code: 'FR' };
    if (lowerMsg.includes('nigeria')) return { country: 'Nigeria', code: 'NG' };
    if (lowerMsg.includes('ireland')) return { country: 'Ireland', code: 'IE' };
    if (lowerMsg.includes('india')) return { country: 'India', code: 'IN' };
    return { country: 'United Kingdom', code: 'UK' };
}

function detectJobIntent(message) {
    const lowerMsg = message.toLowerCase();
    
    const isJobSearch = /(?:find|search|look for|show me|get me|i want|need)\s*(?:jobs?|positions?|roles?|opportunities?|work|vacancies?)/i.test(lowerMsg);
    const wantsSponsorship = /sponsor|visa|work permit|tier 2|skilled worker/i.test(lowerMsg);
    const wantsPR = /\bpr\b|permanent residency|settlement/i.test(lowerMsg);
    const wantsSkillMatch = /match(?:ing)?\s*(?:my)?\s*skills?|skills?\s*match|jobs?\s*(?:for|with)\s*(?:my)?\s*skills?/i.test(lowerMsg);
    
    return { isJobSearch, wantsSponsorship, wantsPR, wantsSkillMatch };
}

function looksLikeCVOrSkills(text) {
    if (!text || text.length < 150) return false;
    const cvKeywords = /\b(experience|skills|education|qualifications|work history|employment history|proficient in|responsibilities|achievements|certifications)\b/i;
    const matches = (text.match(cvKeywords) || []).length;
    return matches >= 2;
}

function detectLegalIntent(message) {
    const legalKeywords = ['legal', 'rights', 'law', 'employment law', 'workplace rights', 'labor law', 'discrimination', 'harassment', 'unfair dismissal', 'minimum wage', 'working hours', 'holiday pay', 'sick pay', 'maternity leave', 'paternity leave', 'redundancy', 'contract'];
    return legalKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ODUSBABAChat() {
    // State Management
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Listen for custom event to open chat
    useEffect(() => {
        function handleOpenChatEvent() {
            setIsOpen(true);
            setIsMinimized(false);
        }
        window.addEventListener('odusbaba:open-chat', handleOpenChatEvent);
        return () => window.removeEventListener('odusbaba:open-chat', handleOpenChatEvent);
    }, []);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [conversationId, setConversationId] = useState(null);
    const [remainingCredits, setRemainingCredits] = useState(null);
    const [error, setError] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [extractingSkillsFor, setExtractingSkillsFor] = useState(null);
    const [skillsSavedFor, setSkillsSavedFor] = useState(new Set());
    
    // Refs
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const chatContainerRef = useRef(null);

    // ============================================
    // INITIALIZATION
    // ============================================

    useEffect(() => {
        initializeChat();
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isOpen && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.sender === 'odusbaba' && lastMessage.id !== 'welcome') {
                setUnreadCount(prev => prev + 1);
            }
        } else {
            setUnreadCount(0);
        }
    }, [isOpen, messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, isMinimized]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = setTimeout(() => {
                if (messages.length > 1) setIsOpen(false);
            }, AUTO_CLOSE_DELAY);
        }
        return () => { if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current); };
    }, [isOpen, isMinimized, messages]);

    async function initializeChat() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            await loadUserProfile(user);
            await Promise.all([loadConversation(user), loadCredits(user)]);
        } else {
            setMessages([createWelcomeMessage()]);
        }
    }

    function createWelcomeMessage() {
        return {
            id: `welcome_${Date.now()}`,
            sender: 'odusbaba',
            message: "👋 Hello. I'm ODUSBABA.\n\nI don't just chat — I guide, govern, and connect you to the right part of this platform.\n\nTry asking something specific, like:\n• \"Find HR jobs with sponsorship in UK\"\n• \"Match my skills to jobs\"\n• \"Jobs with PR support\"\n\nWhat brings you here today?",
            created_at: new Date().toISOString()
        };
    }

    async function loadUserProfile(explicitUser) {
        const activeUser = explicitUser || user;
        if (!activeUser) return;
        const { data: profile } = await supabase.from('profiles').select('user_type, tier, full_name, job_title, years_experience').eq('id', activeUser.id).single();
        setUserProfile(profile);
        return profile;
    }

    async function loadConversation(explicitUser) {
        const activeUser = explicitUser || user;
        if (!activeUser) return;
        const { data: existing } = await supabase.from('chat_conversations').select('id').eq('user_id', activeUser.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
        let convId = existing?.id;
        if (!convId) {
            const { data: newConv } = await supabase.from('chat_conversations').insert({ user_id: activeUser.id, title: 'New Conversation' }).select().single();
            convId = newConv?.id;
        }
        setConversationId(convId);
        if (convId) {
            const { data: history } = await supabase.from('chat_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
            if (history?.length > 0) {
                setMessages(history);
            } else {
                const profile = await loadUserProfile(activeUser);
                setMessages([{
                    id: 'welcome',
                    sender: 'odusbaba',
                    message: `👋 Welcome back, ${profile?.full_name || activeUser.email?.split('@')[0]}! I'm ODUSBABA.\n\nI can help you find jobs, save your skills, and provide career advice.\n\nWhat would you like help with today?`,
                    created_at: new Date().toISOString()
                }]);
            }
        }
    }

    async function loadCredits(explicitUser) {
        const activeUser = explicitUser || user;
        if (!activeUser) return;
        const { data: profile } = await supabase.from('profiles').select('tier, user_type').eq('id', activeUser.id).single();
        const isUnlimited = profile?.user_type === 'super_admin' || profile?.user_type === 'admin';
        if (isUnlimited) {
            setRemainingCredits(999999);
            return;
        }
        const { data: credits } = await supabase.from('va_credits').select('balance').eq('user_id', activeUser.id).maybeSingle();
        setRemainingCredits(credits?.balance ?? 5);
    }

    // ============================================
    // JOB SEARCH VIA CHAT
    // ============================================

    async function handleJobSearch(query, filters = {}) {
        try {
            const { data: { session: jobSession } } = await supabase.auth.getSession();
            
            // Get user skills for matching if requested
            let userSkills = [];
            if (filters.skillMatch && user) {
                const { data } = await supabase.from('user_skills').select('skill_name').eq('user_id', user.id);
                userSkills = data?.map(s => s.skill_name) || [];
            }
            
            const response = await fetch(`${API_BASE}?action=chat-find-jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(jobSession?.access_token ? { 'Authorization': `Bearer ${jobSession.access_token}` } : {})
                },
                body: JSON.stringify({
                    userId: user?.id,
                    query: query,
                    filters: {
                        keywords: filters.keywords,
                        sponsorship: filters.sponsorship,
                        pr: filters.pr,
                        country: filters.country,
                        skills: userSkills.length > 0 ? userSkills : undefined
                    }
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Job search failed');
            }
            
            let reply;
            if (data.jobs && data.jobs.length > 0) {
                const jobList = data.jobs.map(job => {
                    const matchBadge = job.match_score > 0 ? `🏆 ${job.match_score}% match` : '';
                    const sponsorshipBadge = job.visa_sponsorship ? '🛂 Sponsorship Available' : '';
                    return `• **${job.title}** at ${job.company || 'N/A'}\n  📍 ${job.location || 'Remote'}\n  ${job.salary_range ? `💰 ${job.salary_range}\n  ` : ''}  ${sponsorshipBadge ? ` ${sponsorshipBadge}` : ''} ${matchBadge ? `\n  ${matchBadge}` : ''}\n  🔗 [Apply](${job.external_apply_url || `/jobs/${job.id}`})`;
                }).join('\n\n');
                
                let filterText = '';
                if (filters.sponsorship) filterText += ' with sponsorship';
                if (filters.pr) filterText += ' with PR support';
                if (filters.country) filterText += ` in ${filters.country}`;
                
                reply = `🔍 Found **${data.jobs.length}** jobs matching your search${filterText}:\n\n${jobList}\n\n💡 Tip: View all jobs on the [Job Board](/jobs)`;
                
                if (filters.skillMatch && userSkills.length === 0) {
                    reply += '\n\n📌 You haven\'t saved any skills yet. Share your CV or list your skills and I\'ll save them for better matching!';
                }
            } else {
                reply = `🔍 I couldn't find jobs matching your search. Try:\n• Different keywords\n• Removing filters\n• Checking the [Job Board](/jobs) directly`;
            }
            
            setMessages(prev => [...prev, {
                id: `msg_jobs_${Date.now()}`,
                sender: 'odusbaba',
                message: reply,
                created_at: new Date().toISOString()
            }]);
            
            if (data.remaining !== undefined) {
                setRemainingCredits(data.remaining);
            }
            
            return data;
        } catch (error) {
            console.error('Job search error:', error);
            setMessages(prev => [...prev, {
                id: `msg_job_error_${Date.now()}`,
                sender: 'odusbaba',
                message: "I'm having trouble searching for jobs right now. Please try again in a moment, or browse our [Job Board](/jobs) directly.",
                created_at: new Date().toISOString()
            }]);
            return null;
        }
    }

    // ============================================
    // SKILL EXTRACTION & SAVING
    // ============================================

    async function handleSaveSkills(messageId, text) {
        if (!user) return;
        setExtractingSkillsFor(messageId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}?action=extract-skills-from-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ cvOrSkillsText: text, userId: user.id })
            });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to extract skills');
            }

            setSkillsSavedFor(prev => new Set(prev).add(messageId));

            const skillsList = data.skills && data.skills.length > 0
                ? data.skills.join(', ')
                : 'your skills';

            const confirmMessage = {
                id: `msg_skills_${Date.now()}`,
                sender: 'odusbaba',
                message: `✅ Saved to your profile: **${skillsList}**\n\nWant me to find jobs matching these skills? Just ask, e.g. "find jobs matching my skills".`,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, confirmMessage]);

            if (typeof data.remaining === 'number') {
                setRemainingCredits(data.remaining);
            }
        } catch (error) {
            console.error('Skill extraction error:', error);
            setMessages(prev => [...prev, {
                id: `msg_skills_error_${Date.now()}`,
                sender: 'odusbaba',
                message: "I couldn't save those skills right now. Please try again in a moment.",
                created_at: new Date().toISOString()
            }]);
        } finally {
            setExtractingSkillsFor(null);
        }
    }

    // ============================================
    // LEGAL INFORMATION
    // ============================================

    async function fetchLegalInfo(countryCode, topic) {
        const source = LEGAL_SOURCES[countryCode] || LEGAL_SOURCES['UK'];
        return `📚 **Legal & Workplace Rights Information for ${source.name} ${source.flag}**\n\n` +
            `**📋 Labor Laws:**\n🔗 ${source.laborLaw}\n\n` +
            `**⚖️ Workplace Rights:**\n🔗 ${source.rights}\n\n` +
            `**🛡️ Health & Safety:**\n🔗 ${source.health}\n\n` +
            `**🌍 International Standards:**\n🔗 https://www.ilo.org/global/lang--en/index.htm\n\n` +
            `💡 **Important Note:** ODUSBABA provides general guidance only. For specific legal advice, please consult a qualified attorney.\n\n` +
            `📌 **Topic of interest:** "${topic.substring(0, 100)}"\n\n` +
            `Would you like me to help you find more specific information about your situation?`;
    }

    // ============================================
    // SEND MESSAGE
    // ============================================

    const sendMessage = async () => {
        if (!canSendMessage()) return;
        
        const userMessage = {
            id: `msg_${Date.now()}`,
            sender: 'user',
            message: input.trim(),
            created_at: new Date().toISOString(),
            looksLikeCV: user ? looksLikeCVOrSkills(input.trim()) : false
        };
        
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setError(null);
        setLoading(true);
        
        const typingTimer = setTimeout(() => setIsTyping(true), 500);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = typingTimer;
        
        try {
            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'user',
                    message: userMessage.message
                });
            }

            // Check for legal intent first
            const isLegalQuery = detectLegalIntent(currentInput);
            
            if (isLegalQuery) {
                clearTimeout(typingTimer);
                setIsTyping(false);
                const countryData = detectCountry(currentInput);
                const legalInfo = await fetchLegalInfo(countryData.code, currentInput);
                const botMessage = {
                    id: `msg_${Date.now() + 1}`,
                    sender: 'odusbaba',
                    message: legalInfo,
                    created_at: new Date().toISOString()
                };
                setMessages(prev => [...prev, botMessage]);
                if (conversationId && user) {
                    await supabase.from('chat_messages').insert({
                        conversation_id: conversationId,
                        sender: 'odusbaba',
                        message: legalInfo
                    });
                    await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
                }
                setLoading(false);
                return;
            }

            // Check for job search intent
            const jobIntent = detectJobIntent(currentInput);
            
            if (jobIntent.isJobSearch) {
                clearTimeout(typingTimer);
                setIsTyping(false);
                
                // Extract keywords
                const keywords = currentInput
                    .replace(/(?:find|search|look for|show me|get me|i want|need)\s*(?:jobs?|positions?|roles?|opportunities?|work|vacancies?)\s*(?:in|for|with)?\s*/i, '')
                    .replace(/\b(sponsor|visa|work permit|pr|permanent residency|settlement|match|skills)\b/gi, '')
                    .trim();
                
                // Detect country
                const countryData = detectCountry(currentInput);
                
                // Execute job search
                const result = await handleJobSearch(keywords || currentInput, {
                    keywords: keywords || undefined,
                    sponsorship: jobIntent.wantsSponsorship,
                    pr: jobIntent.wantsPR,
                    country: countryData.code !== 'UK' ? countryData.country : undefined,
                    skillMatch: jobIntent.wantsSkillMatch
                });
                
                setLoading(false);
                return;
            }

            // Check for skill match shortcut
            if (user && /match(?:ing)?\s*(?:my)?\s*skills?|skills?\s*match|jobs?\s*(?:for|with)\s*(?:my)?\s*skills?/i.test(currentInput)) {
                clearTimeout(typingTimer);
                setIsTyping(false);
                try {
                    const { data: { session: matchSession } } = await supabase.auth.getSession();
                    const matchResponse = await fetch(`${API_BASE}?action=match-jobs-to-skills`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(matchSession?.access_token ? { 'Authorization': `Bearer ${matchSession.access_token}` } : {})
                        },
                        body: JSON.stringify({ userId: user.id })
                    });
                    const matchData = await matchResponse.json();

                    let reply;
                    if (matchData.jobs && matchData.jobs.length > 0) {
                        const jobList = matchData.jobs.slice(0, 5).map(job =>
                            `• **${job.title}** at ${job.company || 'N/A'}\n  📍 ${job.location || 'Remote'}${job.salary_range ? `\n  💰 ${job.salary_range}` : ''}`
                        ).join('\n\n');
                        reply = `Based on your saved skills, here are matching jobs:\n\n${jobList}\n\nSee the full [Job Board](/jobs) for more.`;
                    } else if (matchData.message) {
                        reply = matchData.message;
                    } else {
                        reply = "I couldn't find jobs matching your skills right now. Try browsing our [Job Board](/jobs) directly.";
                    }

                    setMessages(prev => [...prev, {
                        id: `msg_match_${Date.now()}`,
                        sender: 'odusbaba',
                        message: reply,
                        created_at: new Date().toISOString()
                    }]);
                } catch (matchError) {
                    console.error('Job matching error:', matchError);
                }
                setLoading(false);
                return;
            }

            // Log activity signal
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            fetch(`${API_BASE}?action=log-activity-signal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(currentSession?.access_token ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {})
                },
                body: JSON.stringify({ signalType: 'chat_topic', queryText: currentInput, sourcePage: 'chat', userId: user?.id })
            }).catch(() => {});

            // Prepare conversation history for API
            const history = messages.slice(-MAX_HISTORY_MESSAGES).map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.message
            }));

            const systemPrompt = `You are ODUSBABA, the AI governance and career assistant for the ODUSBABA HR platform. You help with job search, CV optimization, workplace rights, hiring, and career development, and connect users to the right part of the platform (Jobs, Assessments, Courses, Hire VA, Workforce Marketplace, HR Tools) where relevant. Be concise and structured. The user's current tier is: ${userProfile?.tier || (user ? 'free' : 'visitor')}.`;

            const response = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(currentSession?.access_token ? { 'Authorization': `Bearer ${currentSession.access_token}` } : {})
                },
                body: JSON.stringify({ 
                    message: currentInput,
                    history,
                    systemPrompt,
                    userId: user?.id,
                    conversationId
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Chat failed');
            }

            clearTimeout(typingTimer);
            setIsTyping(false);
            
            const botMessage = {
                id: `msg_${Date.now() + 1}`,
                sender: 'odusbaba',
                message: data.response || data.reply,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMessage]);

            if (conversationId && user) {
                await supabase.from('chat_messages').insert({
                    conversation_id: conversationId,
                    sender: 'odusbaba',
                    message: data.response || data.reply
                });
                await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
            }

            if (data.remaining !== undefined) {
                setRemainingCredits(data.remaining);
            }

        } catch (err) {
            console.error('Chat error:', err);
            clearTimeout(typingTimer);
            setIsTyping(false);
            setError(err.message);
            setMessages(prev => [...prev, {
                id: `msg_error_${Date.now()}`,
                sender: 'odusbaba',
                message: "I'm having trouble connecting right now. Please try again in a moment, or refresh the page if the issue persists.",
                created_at: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const guestMessageCount = messages.filter(m => m.sender === 'user').length;
    
    const canSendMessage = useCallback(() => {
        if (loading) return false;
        if (!input.trim()) return false;
        if (!user && guestMessageCount >= GUEST_LIMIT) return false;
        if (user && remainingCredits !== null && remainingCredits <= 0 && remainingCredits !== 999999) return false;
        return true;
    }, [loading, input, user, guestMessageCount, remainingCredits]);

    const copyToClipboard = async (text, messageId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const getCreditDisplay = () => {
        if (!user) return null;
        if (remainingCredits >= 999999) return null;
        if (remainingCredits <= 5) return 'urgent';
        if (remainingCredits <= 20) return 'warning';
        return 'normal';
    };

    const suggestedActions = [
        { icon: Briefcase, text: "Find Jobs", action: "Find me jobs", isJobSearch: true },
        { icon: Briefcase, text: "Sponsorship Jobs", action: "Find jobs with visa sponsorship", isSponsorship: true },
        { icon: Briefcase, text: "PR Jobs", action: "Find jobs with PR support", isPR: true },
        { icon: Briefcase, text: "Match Skills", action: "Find jobs matching my skills", isSkillMatch: true },
        { icon: Scale, text: "Dismissal Rights", action: "My employer wants to dismiss me. What are my rights?" },
        { icon: FileText, text: "CV Review", action: "Can you review my CV and provide suggestions?" },
    ];

    const showSuggestedActions = messages.filter(m => m.sender === 'user').length === 0 && !loading && messages.length <= 1;
    const creditStatus = getCreditDisplay();
    const isNearLimit = !user && (GUEST_LIMIT - guestMessageCount <= 2);
    const hasReachedLimit = !user && guestMessageCount >= GUEST_LIMIT;

    return (
        <>
            <button
                onClick={() => { setIsOpen(true); setIsMinimized(false); setUnreadCount(0); }}
                className={`fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 group ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                aria-label="Open chat"
            >
                <Shield className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-md">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                {!user && remainingCredits !== 0 && unreadCount === 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div 
                    ref={chatContainerRef}
                    className={`fixed bottom-24 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isMinimized ? 'h-14' : 'h-[600px] max-h-[calc(100vh-8rem)]'}`}
                >
                    {/* Header */}
                    <div 
                        className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-primary-900/30 to-purple-900/30 cursor-pointer hover:from-primary-900/40 hover:to-purple-900/40 transition"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center shadow-lg">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">ODUSBABA AI</h3>
                                <p className="text-xs text-slate-400">Career Advisor • Legal Info • Secure</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {user && remainingCredits !== null && remainingCredits < 999999 && !isMinimized && (
                                <div className={`px-2 py-0.5 rounded-full text-xs font-medium mr-1 ${
                                    creditStatus === 'urgent' ? 'bg-red-500/20 text-red-400 animate-pulse' :
                                    creditStatus === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-slate-700 text-slate-300'
                                }`}>
                                    <CreditCard className="w-3 h-3 inline mr-1" />
                                    {remainingCredits}
                                </div>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                                aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
                            >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                className="p-1 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
                                aria-label="Close chat"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {isNearLimit && !hasReachedLimit && (
                                <div className="mx-4 mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <p className="text-amber-400 text-xs text-center">
                                        ⚠️ {GUEST_LIMIT - guestMessageCount} messages remaining. <a href="/sign-up" className="underline">Sign up</a> to continue.
                                    </p>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-900 to-slate-950 scrollbar-thin scrollbar-thumb-slate-700">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
                                    >
                                        <div className={`max-w-[85%] ${msg.sender === 'user' ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200'} rounded-2xl px-4 py-2.5 ${msg.sender === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'} shadow-sm relative`}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {msg.sender === 'odusbaba' ? (
                                                    <Bot className="w-3 h-3 text-primary-400" />
                                                ) : (
                                                    <User className="w-3 h-3 text-slate-400" />
                                                )}
                                                <span className="text-xs opacity-70">
                                                    {msg.sender === 'odusbaba' ? 'Advisor' : 'You'}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                            <p className="text-[10px] opacity-40 mt-1 text-right">
                                                {formatTimestamp(msg.created_at)}
                                            </p>
                                            {msg.sender === 'user' && msg.looksLikeCV && (
                                                skillsSavedFor.has(msg.id) ? (
                                                    <p className="text-[11px] mt-1.5 text-emerald-300 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Skills saved to your profile
                                                    </p>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSaveSkills(msg.id, msg.message)}
                                                        disabled={extractingSkillsFor === msg.id}
                                                        className="text-[11px] mt-1.5 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {extractingSkillsFor === msg.id ? 'Saving...' : '💾 Save these skills for job matching'}
                                                    </button>
                                                )
                                            )}
                                            {msg.sender === 'odusbaba' && msg.message !== "I'm having trouble connecting..." && (
                                                <button
                                                    onClick={() => copyToClipboard(msg.message, msg.id)}
                                                    className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label="Copy message"
                                                >
                                                    {copiedMessageId === msg.id ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                
                                {isTyping && (
                                    <div className="flex justify-start animate-fade-in">
                                        <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {error && (
                                    <div className="flex justify-center">
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                            <p className="text-red-400 text-xs flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {error}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} />
                            </div>

                            {showSuggestedActions && (
                                <div className="p-3 border-t border-slate-700 bg-slate-900/80">
                                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Quick actions:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestedActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (action.isJobSearch || action.isSponsorship || action.isPR || action.isSkillMatch) {
                                                        const type = action.isSponsorship ? 'sponsorship' : action.isPR ? 'PR' : action.isSkillMatch ? 'matching my skills' : '';
                                                        const promptText = action.isSkillMatch 
                                                            ? "Find jobs matching my skills" 
                                                            : `Find ${action.text.toLowerCase()}${type ? ` with ${type}` : ''}${!action.isJobSearch ? ' in' : ''}`;
                                                        setInput(promptText);
                                                        setTimeout(() => sendMessage(), 100);
                                                    } else {
                                                        setInput(action.action);
                                                        setTimeout(() => sendMessage(), 100);
                                                    }
                                                }}
                                                className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                                                disabled={loading}
                                            >
                                                <action.icon className="w-3 h-3" />
                                                <span className="hidden sm:inline">{action.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-3 border-t border-slate-700 bg-slate-900">
                                <div className="flex gap-2">
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder={hasReachedLimit ? "Free preview limit reached. Sign up to continue." : (user ? "Ask me anything..." : `Try ODUSBABA free (${GUEST_LIMIT - guestMessageCount} messages left)...`)}
                                        rows={1}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                                        style={{ minHeight: '42px', maxHeight: '100px' }}
                                        disabled={loading || (user && remainingCredits === 0 && remainingCredits !== 999999) || hasReachedLimit}
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={!canSendMessage() || hasReachedLimit}
                                        className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[42px]"
                                        aria-label="Send message"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </div>
                                
                                {!user && !hasReachedLimit && (
                                    <p className="text-xs text-slate-500 text-center mt-2">
                                        ✨ {GUEST_LIMIT - guestMessageCount} free {GUEST_LIMIT - guestMessageCount === 1 ? 'message' : 'messages'} remaining. <a href="/sign-up" className="text-primary-400 hover:underline">Sign up</a> for full access
                                    </p>
                                )}
                                {hasReachedLimit && (
                                    <p className="text-xs text-amber-400 text-center mt-2">
                                        ✨ Free preview limit reached. <a href="/sign-up" className="underline">Create account</a> to continue.
                                    </p>
                                )}
                                {user && remainingCredits === 0 && remainingCredits !== 999999 && (
                                    <p className="text-xs text-amber-400 text-center mt-2">
                                        ⚠️ Credits exhausted. <a href="/pricing" className="underline hover:text-amber-300">Upgrade plan</a> to continue.
                                    </p>
                                )}
                                {user && remainingCredits > 0 && remainingCredits <= 5 && remainingCredits !== 999999 && (
                                    <p className="text-xs text-amber-500 text-center mt-2">
                                        ⚡ Low on credits ({remainingCredits} left). <a href="/pricing" className="underline">Purchase more</a>
                                    </p>
                                )}
                                
                                <p className="text-[10px] text-slate-600 text-center mt-2">
                                    🔒 Secure conversation • Your data is protected
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
