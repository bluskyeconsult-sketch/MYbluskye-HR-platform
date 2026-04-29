import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function CountryManagement() {
    const [countries, setCountries] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [newCountry, setNewCountry] = useState({
        code: '',
        name: '',
        default_currency: 'GBP',
        default_multiplier: 1.0
    })

    useEffect(() => {
        loadCountries()
    }, [])

    async function loadCountries() {
        const { data } = await supabase
            .from('countries')
            .select('*')
            .order('name')
        setCountries(data || [])
        setLoading(false)
    }

    async function addCountry() {
        if (!newCountry.code || !newCountry.name) {
            alert('Please enter country code and name')
            return
        }

        const { error } = await supabase
            .from('countries')
            .insert({
                code: newCountry.code.toUpperCase(),
                name: newCountry.name,
                default_currency: newCountry.default_currency,
                default_multiplier: parseFloat(newCountry.default_multiplier)
            })

        if (error) {
            alert('Error: ' + error.message)
        } else {
            alert('Country added successfully!')
            setShowModal(false)
            setNewCountry({ code: '', name: '', default_currency: 'GBP', default_multiplier: 1.0 })
            loadCountries()
        }
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Country Management</h1>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                    + Add New Country
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Multiplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {countries.map(country => (
                            <tr key={country.id}>
                                <td className="px-6 py-4 font-medium">{country.code}</td>
                                <td className="px-6 py-4">{country.name}</td>
                                <td className="px-6 py-4">{country.default_currency}</td>
                                <td className="px-6 py-4">{country.default_multiplier}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs ${country.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {country.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Country Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 max-w-full">
                        <h2 className="text-xl font-bold mb-4">Add New Country</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Country Code (2 letters)</label>
                                <input 
                                    type="text" 
                                    maxLength="2"
                                    className="w-full border rounded px-3 py-2"
                                    value={newCountry.code}
                                    onChange={e => setNewCountry({...newCountry, code: e.target.value.toUpperCase()})}
                                    placeholder="e.g., FR"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Country Name</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded px-3 py-2"
                                    value={newCountry.name}
                                    onChange={e => setNewCountry({...newCountry, name: e.target.value})}
                                    placeholder="e.g., France"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Currency</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded px-3 py-2"
                                    value={newCountry.default_currency}
                                    onChange={e => setNewCountry({...newCountry, default_currency: e.target.value.toUpperCase()})}
                                    placeholder="EUR"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Price Multiplier (0.1 - 2.0)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="w-full border rounded px-3 py-2"
                                    value={newCountry.default_multiplier}
                                    onChange={e => setNewCountry({...newCountry, default_multiplier: e.target.value})}
                                    placeholder="0.90"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
                            <button onClick={addCountry} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Country</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
