// src/pages/UserDashboard.jsx
// ADD THESE SECTIONS to your existing dashboard

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getVACredits } from '../services/aiVirtualAssistantService';
import { getUserJobAlerts } from '../services/jobAlertService';

// Add this function inside your component
async function loadDashboardData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Load VA credits
        const vaCredits = await getVACredits(user.id);
        setVaBalance(vaCredits.balance);
        
        // Load job alerts count
        const alerts = await getUserJobAlerts(user.id);
        setJobAlertCount(alerts.length);
        
        // Load active engagements
        const { data: engagements } = await supabase
            .from('engagements')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'active');
        setActiveEngagements(engagements?.length || 0);
    }
}

// Add these state variables
const [vaBalance, setVaBalance] = useState(0);
const [jobAlertCount, setJobAlertCount] = useState(0);
const [activeEngagements, setActiveEngagements] = useState(0);

// Add this JSX in your dashboard (quick stats section)
<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-slate-400 text-sm">VA Credits</h3>
        <p className="text-2xl font-bold text-white">{vaBalance}</p>
        <Link to="/hire-va" className="text-xs text-primary-400 hover:underline">Use credits →</Link>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-slate-400 text-sm">Job Alerts</h3>
        <p className="text-2xl font-bold text-white">{jobAlertCount}</p>
        <Link to="/job-alerts" className="text-xs text-primary-400 hover:underline">Manage alerts →</Link>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-slate-400 text-sm">Active Engagements</h3>
        <p className="text-2xl font-bold text-white">{activeEngagements}</p>
        <Link to="/workforce/engagements" className="text-xs text-primary-400 hover:underline">View work →</Link>
    </div>
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="text-slate-400 text-sm">Courses Started</h3>
        <p className="text-2xl font-bold text-white">{enrolledCourses?.length || 0}</p>
        <Link to="/learning" className="text-xs text-primary-400 hover:underline">Continue learning →</Link>
    </div>
</div>
