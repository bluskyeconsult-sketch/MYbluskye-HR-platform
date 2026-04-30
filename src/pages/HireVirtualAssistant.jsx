import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Clock, DollarSign, TrendingUp, Sparkles, Briefcase, FileText, PenTool, CheckCircle, XCircle, Download, Eye } from 'lucide-react';
import { getVirtualAssistants, hireVirtualAssistant, getUserTasks, getTaskStatus, acceptTask, rejectTask, downloadTaskOutput, getUserCredits } from '../services/vaService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function HireVirtualAssistant() {
  const [assistants, setAssistants] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [selectedVA, setSelectedVA] = useState(null);
  const [taskInput, setTaskInput] = useState({});
  const [taskDescription, setTaskDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('marketplace');
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/sign-in'; return; }
    setUser(user);
    
    const vas = await getVirtualAssistants();
    setAssistants(vas);
    
    const tasks = await getUserTasks(user.id);
    setMyTasks(tasks);
    
    const creditBalance = await getUserCredits(user.id);
    setCredits(creditBalance);
    setLoading(false);
    
    const interval = setInterval(async () => {
      const updatedTasks = await getUserTasks(user.id);
      setMyTasks(updatedTasks);
    }, 5000);
    return () => clearInterval(interval);
  }

  async function handleHire(va) {
    if (!taskInput.details) { alert('Please provide details for the task'); return; }
    setSubmitting(true);
    try {
      const result = await hireVirtualAssistant(user.id, va.id, taskInput, va.name, taskDescription);
      alert(`✅ Task created! ${va.name} will deliver in ~${va.delivery_minutes} minutes.`);
      setSelectedVA(null);
      setTaskInput({});
      setTaskDescription('');
      const updatedTasks = await getUserTasks(user.id);
      setMyTasks(updatedTasks);
      setActiveTab('my-tasks');
    } catch (err) { alert('Error: ' + err.message); }
    setSubmitting(false);
  }

  async function viewTaskStatus(task) {
    setSelectedTask(task);
    const status = await getTaskStatus(task.id, user.id);
    setTaskStatus(status);
  }

  async function handleAcceptTask(taskId) {
    await acceptTask(taskId, user.id);
    const updatedTasks = await getUserTasks(user.id);
    setMyTasks(updatedTasks);
    setSelectedTask(null);
  }

  async function handleRejectTask(taskId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    const result = await rejectTask(taskId, user.id, reason);
    alert(result.message);
    const updatedTasks = await getUserTasks(user.id);
    setMyTasks(updatedTasks);
    setSelectedTask(null);
  }

  async function handleDownload(taskId) {
    try {
      const output = await downloadTaskOutput(taskId, user.id);
      const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `va_output_${taskId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Download not available yet'); }
  }

  const categories = [
    { value: 'all', label: 'All', icon: Sparkles },
    { value: 'career', label: 'Career', icon: Briefcase },
    { value: 'resume', label: 'Resume', icon: FileText },
    { value: 'writing', label: 'Writing', icon: PenTool }
  ];

  const filteredAssistants = assistants.filter(a => 
    (category === 'all' || a.category === category) &&
    (a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     a.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading Virtual Assistants...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Hire Virtual Assistant</h1>
            <p className="text-slate-400 mt-1">AI-powered task execution with human-like quality and delivery</p>
          </div>
          <div className="text-right bg-slate-900/50 border border-slate-800 rounded-xl p-3">
            <div className="text-sm text-slate-400">Your Credits</div>
            <div className="text-2xl font-bold text-emerald-400">{credits}</div>
            <button className="text-xs text-sky-400 hover:underline mt-1">Buy Credits</button>
          </div>
        </div>

        <div className="flex gap-4 border-b border-slate-800 mb-6">
          <button onClick={() => { setActiveTab('marketplace'); setSearchTerm(''); }} className={`pb-3 px-4 transition-colors ${activeTab === 'marketplace' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
            🛒 Marketplace
          </button>
          <button onClick={() => { setActiveTab('my-tasks'); }} className={`pb-3 px-4 transition-colors ${activeTab === 'my-tasks' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
            📋 My Tasks ({myTasks.length})
          </button>
        </div>

        {activeTab === 'marketplace' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Search Virtual Assistants..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="flex gap-2">
                {categories.map(cat => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${category === cat.value ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                    <cat.icon className="w-4 h-4" /> {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssistants.map(va => (
                <div key={va.id} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500/30 hover:bg-slate-900/70 transition-all hover:-translate-y-1">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">{va.name}</h3>
                        <p className="text-xs text-slate-400">{va.specialty}</p>
                      </div>
                      {va.is_trending && <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full"><TrendingUp className="w-3 h-3 inline mr-1" />Trending</span>}
                    </div>
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{va.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-slate-500 text-sm">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{va.delivery_minutes} min</span>
                        <span className="flex items-center gap-1"><span className="text-emerald-400">⭐</span> {va.qa_score}% QA</span>
                      </div>
                      <div className="text-lg font-bold text-emerald-400">${va.price}</div>
                    </div>
                    <button onClick={() => setSelectedVA(va)} className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">Hire Now</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'my-tasks' && (
          <div className="space-y-4">
            {myTasks.length === 0 ? <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center"><p className="text-slate-400">No tasks yet. Hire a Virtual Assistant to get started!</p></div> : myTasks.map(task => (
              <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-slate-700 transition-all" onClick={() => viewTaskStatus(task)}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{task.virtual_assistants?.name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{task.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : task.status === 'processing' ? 'bg-sky-500/20 text-sky-400' : task.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{task.status}</span>
                      <span className="text-xs text-slate-500">${task.price_paid}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Created {new Date(task.created_at).toLocaleDateString()}</p>
                    {task.progress_percent > 0 && <div className="mt-2 w-24 bg-slate-700 rounded-full h-1"><div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${task.progress_percent}%` }}></div></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hire Modal */}
        {selectedVA && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-2">Hire: {selectedVA.name}</h2>
              <p className="text-slate-400 text-sm mb-4">${selectedVA.price} • ~{selectedVA.delivery_minutes} min delivery</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Task Details</label>
                  <textarea rows={4} value={taskDescription} onChange={e => setTaskDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder="Describe what you need..." />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleHire(selectedVA)} disabled={submitting} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">{submitting ? 'Processing...' : 'Confirm & Pay'}</button>
                  <button onClick={() => setSelectedVA(null)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Status Modal */}
        {selectedTask && taskStatus && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">{taskStatus.virtual_assistants?.name}</h2>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div className="space-y-4">
                <div><p className="text-sm text-slate-400">Status</p><span className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${taskStatus.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : taskStatus.status === 'processing' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400'}`}>{taskStatus.status}</span></div>
                {taskStatus.progress_percent > 0 && (<div><p className="text-sm text-slate-400">Progress</p><div className="w-full bg-slate-700 rounded-full h-2 mt-1"><div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${taskStatus.progress_percent}%` }}></div></div><p className="text-xs text-slate-500 mt-1">{taskStatus.progress_percent}%</p></div>)}
                {taskStatus.output_data && taskStatus.status === 'qa_review' && (
                  <div className="border-t border-slate-800 pt-4 mt-4">
                    <p className="text-sm text-slate-400 mb-2">Quality Check</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleAcceptTask(taskStatus.id)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />Accept</button>
                      <button onClick={() => handleRejectTask(taskStatus.id)} className="flex-1 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center gap-2"><XCircle className="w-4 h-4" />Reject</button>
                    </div>
                  </div>
                )}
                {taskStatus.output_data && taskStatus.status === 'completed' && (
                  <div><p className="text-sm text-slate-400">Output</p><pre className="mt-2 p-3 bg-slate-800 rounded-lg text-xs text-slate-300 overflow-auto max-h-40">{JSON.stringify(taskStatus.output_data, null, 2)}</pre><button onClick={() => handleDownload(taskStatus.id)} className="mt-3 w-full py-2 bg-sky-600 text-white rounded-lg flex items-center justify-center gap-2"><Download className="w-4 h-4" />Download Output</button></div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
