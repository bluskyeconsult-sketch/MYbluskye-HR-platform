// Add these imports
import { Sparkles, Send, Megaphone, TrendingUp } from 'lucide-react';
import { pushToNewsletter, pushToAnnouncementBar, trackContentView } from '../services/contentService';

// Add state
const [showAIAssist, setShowAIAssist] = useState(false);
const [aiSuggestions, setAiSuggestions] = useState(null);
const [pushingToNewsletter, setPushingToNewsletter] = useState(false);
const [pushingToAnnouncement, setPushingToAnnouncement] = useState(false);

// Add effect to track view
useEffect(() => {
    if (user && article) {
        trackContentView(user.id, article.id, 'article');
    }
}, [user, article]);

// Add functions
async function handlePushToNewsletter() {
    setPushingToNewsletter(true);
    const result = await pushToNewsletter(article.id, 'article', article.title);
    alert(`✅ Newsletter sent to ${result.recipientCount} subscribers!`);
    setPushingToNewsletter(false);
}

async function handlePushToAnnouncement() {
    setPushingToAnnouncement(true);
    const result = await pushToAnnouncementBar(article.id, 'article', `📢 New article: ${article.title}`);
    alert(`✅ Announcement added to notification bar!`);
    setPushingToAnnouncement(false);
}

// Add AI Assist Modal button in the article header
<div className="flex flex-wrap gap-3 mt-4">
    <button
        onClick={() => setShowAIAssist(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-600/30 transition-colors"
    >
        <Sparkles className="w-4 h-4" /> AI Assist
    </button>
    <button
        onClick={handlePushToNewsletter}
        disabled={pushingToNewsletter}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
    >
        <Send className="w-4 h-4" /> {pushingToNewsletter ? 'Sending...' : 'Send as Newsletter'}
    </button>
    <button
        onClick={handlePushToAnnouncement}
        disabled={pushingToAnnouncement}
        className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg text-amber-400 text-sm hover:bg-amber-600/30 transition-colors disabled:opacity-50"
    >
        <Megaphone className="w-4 h-4" /> {pushingToAnnouncement ? 'Pushing...' : 'Push to Announcement'}
    </button>
</div>

// Add AI Assist Modal
{showAIAssist && (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">AI Content Assistant</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Suggest Headlines</label>
                    <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                        💡 "The Ultimate Guide to {article.title}"
                    </button>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Generate Social Posts</label>
                    <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                        📱 "Check out our latest article on {article.title}!"
                    </button>
                </div>
                <div>
                    <label className="block text-sm text-slate-400 mb-1">Improve Readability</label>
                    <button className="w-full text-left p-3 bg-slate-800 rounded-lg text-slate-300 hover:bg-slate-700">
                        ✍️ Simplify complex sentences
                    </button>
                </div>
            </div>
            <button onClick={() => setShowAIAssist(false)} className="mt-6 w-full py-2 bg-slate-700 text-white rounded-lg">
                Close
            </button>
        </div>
    </div>
)}
