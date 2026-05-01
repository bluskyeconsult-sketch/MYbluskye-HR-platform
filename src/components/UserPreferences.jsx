import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Settings, Save } from 'lucide-react';
import { updateUserPreferences } from '../services/contentService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function UserPreferences() {
    const [preferences, setPreferences] = useState({
        categories: [],
        tags: [],
        frequency: 'weekly'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);

    const categories = [
        'AI & Technology', 'Employment Law', 'HR Strategy', 
        'Workforce Trends', 'Career Development', 'Skill Verification'
    ];

    useEffect(() => {
        loadUserAndPreferences();
    }, []);

    async function loadUserAndPreferences() {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
            const { data } = await supabase
                .from('user_content_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (data) {
                setPreferences({
                    categories: data.preferred_categories || [],
                    tags: data.preferred_tags || [],
                    frequency: data.notification_frequency || 'weekly'
                });
            }
        }
        setLoading(false);
    }

    async function handleSave() {
        if (!user) {
            alert('Please sign in to save preferences');
            window.location.href = '/sign-in';
            return;
        }
        
        setSaving(true);
        await updateUserPreferences(user.id, preferences);
        alert('Preferences saved!');
        setSaving(false);
    }

    function toggleCategory(category) {
        setPreferences(prev => ({
            ...prev,
            categories: prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category]
        }));
    }

    if (loading) return <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 animate-pulse">Loading...</div>;

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-400" /> Your Content Preferences
            </h3>
            <p className="text-sm text-slate-400 mb-4">Select topics you're interested in to get personalized recommendations.</p>
            
            <div className="mb-4">
                <label className="text-sm text-slate-300 mb-2 block">Categories</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                preferences.categories.includes(cat)
                                    ? 'bg-primary-500 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mb-4">
                <label className="text-sm text-slate-300 mb-2 block">Notification Frequency</label>
                <select
                    value={preferences.frequency}
                    onChange={(e) => setPreferences({ ...preferences, frequency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                    <option value="monthly">Monthly digest</option>
                    <option value="never">Never</option>
                </select>
            </div>
            
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            
            {!user && (
                <p className="text-xs text-slate-500 text-center mt-3">
                    <a href="/sign-in" className="text-primary-400 hover:underline">Sign in</a> to save your preferences
                </p>
            )}
        </div>
    );
}
