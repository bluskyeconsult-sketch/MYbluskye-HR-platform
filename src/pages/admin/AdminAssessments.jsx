import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit, Trash2, Brain } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'psychometric',
    description: '',
    price: 9.99,
    duration_minutes: 15,
    question_count: 20,
    is_active: true
  });

  useEffect(() => {
    loadAssessments();
  }, []);

  async function loadAssessments() {
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .order('created_at', { ascending: false });
    setAssessments(data || []);
    setLoading(false);
  }

  async function saveAssessment() {
    if (editing) {
      await supabase
        .from('assessments')
        .update(formData)
        .eq('id', editing);
    } else {
      await supabase
        .from('assessments')
        .insert(formData);
    }
    setShowForm(false);
    setEditing(null);
    setFormData({
      name: '',
      category: 'psychometric',
      description: '',
      price: 9.99,
      duration_minutes: 15,
      question_count: 20,
      is_active: true
    });
    loadAssessments();
  }

  async function deleteAssessment(id) {
    if (confirm('Delete this assessment?')) {
      await supabase
        .from('assessments')
        .delete()
        .eq('id', id);
      loadAssessments();
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading assessments...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Assessment Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg flex items-center gap-2 hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Assessment
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {editing ? 'Edit Assessment' : 'New Assessment'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              >
                <option value="psychometric">Psychometric</option>
                <option value="workplace_skill">Workplace Skill</option>
                <option value="career_aptitude">Career Aptitude</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Questions</label>
                <input
                  type="number"
                  value={formData.question_count}
                  onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-primary-500"
              />
              <label htmlFor="is_active" className="text-white">Active</label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={saveAssessment}
                className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-dark transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No assessments found. Click "Add Assessment" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-primary-500/30 transition-all hover:-translate-y-1"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{assessment.name}</h3>
                    <p className="text-sm text-slate-400">{assessment.category}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(assessment.id);
                      setFormData(assessment);
                      setShowForm(true);
                    }}
                    className="text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAssessment(assessment.id)}
                    className="text-danger hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-3 line-clamp-2">{assessment.description}</p>
              <div className="mt-3 flex justify-between items-center">
                <div>
                  <span className="text-primary-400 font-bold">${assessment.price}</span>
                  <span className="text-xs text-slate-500 ml-2">{assessment.duration_minutes} min</span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    assessment.is_active ? 'bg-success/20 text-success' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {assessment.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
