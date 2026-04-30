import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CountryManagement() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newCountry, setNewCountry] = useState({ code: '', name: '', default_currency: 'USD', default_multiplier: 1.0 });

  useEffect(() => { loadCountries(); }, []);

  async function loadCountries() {
    const { data } = await supabase.from('countries').select('*').order('name');
    setCountries(data || []);
    setLoading(false);
  }

  async function addCountry() {
    if (!newCountry.code || !newCountry.name) { alert('Please fill all fields'); return; }
    const { error } = await supabase.from('countries').insert({ code: newCountry.code.toUpperCase(), name: newCountry.name, default_currency: newCountry.default_currency, default_multiplier: parseFloat(newCountry.default_multiplier) });
    if (error) alert('Error: ' + error.message);
    else { setShowModal(false); setNewCountry({ code: '', name: '', default_currency: 'USD', default_multiplier: 1.0 }); loadCountries(); }
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-slate-400">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-white">Country Management</h1><button onClick={() => setShowModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">+ Add Country</button></div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr><th className="px-6 py-3 text-left text-white">Code</th><th className="px-6 py-3 text-left text-white">Country</th><th className="px-6 py-3 text-left text-white">Currency</th><th className="px-6 py-3 text-left text-white">Multiplier</th></tr>
            </thead>
            <tbody>
              {countries.map(c => (<tr key={c.id} className="border-t border-slate-800"><td className="px-6 py-4 text-white">{c.code}</td><td className="px-6 py-4 text-white">{c.name}</td><td className="px-6 py-4 text-slate-300">{c.default_currency}</td><td className="px-6 py-4 text-slate-300">{c.default_multiplier}</td></tr>))}
            </tbody>
          </table>
        </div>
        {showModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md"><h2 className="text-xl font-bold text-white mb-4">Add New Country</h2><div className="space-y-4"><input type="text" placeholder="Country Code (2 letters)" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newCountry.code} onChange={e => setNewCountry({...newCountry, code: e.target.value.toUpperCase()})} /><input type="text" placeholder="Country Name" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newCountry.name} onChange={e => setNewCountry({...newCountry, name: e.target.value})} /><input type="text" placeholder="Currency (USD, EUR, GBP)" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newCountry.default_currency} onChange={e => setNewCountry({...newCountry, default_currency: e.target.value.toUpperCase()})} /><input type="number" step="0.01" placeholder="Price Multiplier" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" value={newCountry.default_multiplier} onChange={e => setNewCountry({...newCountry, default_multiplier: e.target.value})} /><div className="flex gap-3"><button onClick={addCountry} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">Add</button><button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">Cancel</button></div></div></div></div>)}
      </div>
    </div>
  );
}
