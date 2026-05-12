// src/pages/admin/SecurityDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, AlertTriangle, Ban, Eye, Loader2, CheckCircle, XCircle, RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function SecurityDashboard() {
    const [events, setEvents] = useState([]);
    const [blockedIPs, setBlockedIPs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newBlockIP, setNewBlockIP] = useState('');
    const [blockReason, setBlockReason] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setRefreshing(true);
        try {
            const { data: eventsData } = await supabase
                .from('security_events')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            setEvents(eventsData || []);
            
            const { data: ipsData } = await supabase
                .from('blocked_ips')
                .select('*')
                .gt('expires_at', new Date().toISOString());
            setBlockedIPs(ipsData || []);
        } catch (error) {
            console.error('Error loading security data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function handleBlockIP() {
        if (!newBlockIP) return;
        await supabase.from('blocked_ips').insert({
            ip_address: newBlockIP,
            reason: blockReason || 'Manual block',
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
        });
        setNewBlockIP('');
        setBlockReason('');
        loadData();
    }

    async function handleUnblockIP(ipId) {
        await supabase.from('blocked_ips').delete().eq('id', ipId);
        loadData();
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Security Monitoring Dashboard</h1>
                    <p className="text-slate-400">Security events and IP management</p>
                </div>
                <button onClick={loadData} disabled={refreshing} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Eye className="w-4 h-4 text-primary-400" /> Recent Security Events</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {events.map((event, idx) => (
                            <div key={idx} className="p-3 border-b border-slate-800">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</span>
                                        <p className="text-slate-300 text-sm mt-1">{event.event_type?.replace(/_/g, ' ')}</p>
                                        <p className="text-slate-500 text-xs">IP: {event.ip_address}</p>
                                    </div>
                                    {event.severity === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && <p className="text-slate-400 text-center py-4">No security events</p>}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Ban className="w-4 h-4 text-primary-400" /> Blocked IP Addresses</h3>
                    
                    <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                        <p className="text-white text-sm mb-2">Manually Block IP Address</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input type="text" value={newBlockIP} onChange={(e) => setNewBlockIP(e.target.value)} placeholder="IP Address" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                            <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason" className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                            <button onClick={handleBlockIP} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"><Plus className="w-4 h-4 inline mr-1" /> Block IP</button>
                        </div>
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {blockedIPs.map((ip) => (
                            <div key={ip.id} className="flex justify-between items-center p-2 bg-slate-800/30 rounded-lg">
                                <div><p className="text-white font-mono text-sm">{ip.ip_address}</p><p className="text-slate-500 text-xs">Expires: {new Date(ip.expires_at).toLocaleString()}</p></div>
                                <button onClick={() => handleUnblockIP(ip.id)} className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-700"><Trash2 className="w-3 h-3 inline mr-1" /> Unblock</button>
                            </div>
                        ))}
                        {blockedIPs.length === 0 && <p className="text-slate-400 text-center py-4">No blocked IPs</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
