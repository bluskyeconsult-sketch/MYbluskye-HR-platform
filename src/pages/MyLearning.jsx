// src/pages/MyLearning.jsx
//
// NEW (2026-09-20): course enrollment status (in-progress/completed)
// already has a real, working page at /learning (LearnerDashboard.jsx)
// - deliberately not duplicated here. This page covers what was
// genuinely missing: course favorites, the cart, and job application
// status (completed/pending), all already built on the backend but
// with no UI anywhere until now.

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Heart, ShoppingCart, Trash2, Loader2, ArrowRight, Briefcase, Clock, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyLearning() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('favorites');
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [favorites, setFavorites] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [selectedCartIds, setSelectedCartIds] = useState(new Set());
    const [completedJobs, setCompletedJobs] = useState([]);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [processingCheckout, setProcessingCheckout] = useState(false);

    useEffect(() => {
        loadAll();
    }, []);

    async function authHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        return { 'Authorization': `Bearer ${session?.access_token}` };
    }

    async function loadAll() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate('/sign-in?redirect=/my-learning');
            return;
        }
        setUserId(user.id);

        const headers = await authHeaders();

        const [favoritesRes, cartRes, jobsRes] = await Promise.all([
            fetch(`/api/index?action=get-course-favorites&userId=${user.id}`, { headers }).then(r => r.json()),
            fetch(`/api/index?action=get-cart&userId=${user.id}`, { headers }).then(r => r.json()),
            fetch(`/api/index?action=get-my-job-applications&userId=${user.id}`, { headers }).then(r => r.json())
        ]);

        setFavorites(favoritesRes.favorites || []);
        setCartItems(cartRes.items || []);
        setCompletedJobs(jobsRes.completed || []);
        setPendingJobs(jobsRes.pending || []);
        setLoading(false);
    }

    async function removeFavorite(courseId) {
        const headers = await authHeaders();
        await fetch('/api/index?action=toggle-course-favorite', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, courseId })
        });
        setFavorites(prev => prev.filter(f => f.course_id !== courseId));
        toast.success('Removed from favorites');
    }

    async function removeFromCart(cartItemId) {
        const headers = await authHeaders();
        await fetch('/api/index?action=remove-from-cart', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, cartItemId })
        });
        setCartItems(prev => prev.filter(c => c.id !== cartItemId));
    }

    function toggleCartSelect(itemId) {
        setSelectedCartIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }

    const selectedCartItems = cartItems.filter(i => selectedCartIds.has(i.id));
    const cartTotal = selectedCartItems.reduce((sum, item) => sum + (Number(item.details?.price || item.details?.ebook_price) || 0), 0);

    async function handleCheckoutSelected() {
        if (selectedCartItems.length === 0) {
            toast.error('Select at least one item to check out');
            return;
        }
        setProcessingCheckout(true);
        try {
            const headers = await authHeaders();
            const response = await fetch('/api/index?action=cart-checkout', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: selectedCartItems.map(c => ({ type: c.item_type, id: c.item_id })) })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Checkout failed');

            // Free courses (if any were selected) are already enrolled
            // synchronously by the backend - only a real book purchase
            // needs the Stripe redirect.
            if (data.enrolledCourses > 0) {
                toast.success(`Enrolled in ${data.enrolledCourses} course${data.enrolledCourses > 1 ? 's' : ''}!`);
            }
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                setSelectedCartIds(new Set());
                loadAll();
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingCheckout(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
            </div>
        );
    }

    const tabs = [
        { key: 'favorites', label: `Favorites (${favorites.length})`, icon: Heart },
        { key: 'cart', label: `Cart (${cartItems.length})`, icon: ShoppingCart },
        { key: 'jobs-pending', label: `Applications Pending (${pendingJobs.length})`, icon: Clock },
        { key: 'jobs-completed', label: `Applications Completed (${completedJobs.length})`, icon: Briefcase }
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-3xl font-bold text-white">Favorites, Cart & Applications</h1>
                <Link to="/learning" className="flex items-center gap-2 text-primary-400 hover:underline text-sm">
                    <GraduationCap className="w-4 h-4" /> Go to My Courses
                </Link>
            </div>

            <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                            activeTab === tab.key ? 'border-primary-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'favorites' && (
                <div className="grid sm:grid-cols-2 gap-4">
                    {favorites.length === 0 ? (
                        <p className="text-slate-500 col-span-2 text-center py-8">No favorites saved yet. Browse courses and tap the heart icon to save one here.</p>
                    ) : favorites.map(f => (
                        <div key={f.course_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4">
                            {f.courses?.image_url && <img src={f.courses.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <Link to={`/courses/${f.course_id}`} className="text-white font-medium truncate hover:text-primary-400 block">{f.courses?.title}</Link>
                                <p className="text-slate-400 text-xs mt-1">{f.courses?.price === 0 ? 'Free' : `$${f.courses?.price}`}</p>
                            </div>
                            <button onClick={() => removeFavorite(f.course_id)} className="text-slate-500 hover:text-red-400 transition flex-shrink-0">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'cart' && (
                <div>
                    {cartItems.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Your cart is empty.</p>
                    ) : (
                        <>
                            <div className="space-y-3 mb-6">
                                {cartItems.map(item => (
                                    <div key={item.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4 items-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedCartIds.has(item.id)}
                                            onChange={() => toggleCartSelect(item.id)}
                                        />
                                        {item.details?.image_url && <img src={item.details.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{item.details?.title || 'Item unavailable'}</p>
                                            <p className="text-slate-500 text-xs capitalize">{item.item_type}</p>
                                        </div>
                                        <p className="text-white font-semibold">
                                            {item.item_type === 'course' ? 'Free' : `$${Number(item.details?.ebook_price || 0).toFixed(2)}`}
                                        </p>
                                        <button onClick={() => removeFromCart(item.id)} className="text-slate-500 hover:text-red-400 transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                                <div>
                                    <p className="text-slate-400 text-sm">{selectedCartItems.length} item(s) selected</p>
                                    <p className="text-white font-semibold text-lg">Total: ${cartTotal.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={handleCheckoutSelected}
                                    disabled={processingCheckout || selectedCartItems.length === 0}
                                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {processingCheckout ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    Checkout Selected
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'jobs-pending' && (
                <div className="space-y-3">
                    {pendingJobs.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No pending applications.</p>
                    ) : pendingJobs.map(a => (
                        <Link key={a.id} to={`/jobs/${a.jobs?.id}`} className="block bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/50 transition">
                            <p className="text-white font-medium">{a.jobs?.title}</p>
                            <p className="text-slate-400 text-sm">{a.jobs?.company} — {a.jobs?.location}</p>
                            <p className="text-amber-400 text-xs mt-2 capitalize">{a.status}</p>
                        </Link>
                    ))}
                </div>
            )}

            {activeTab === 'jobs-completed' && (
                <div className="space-y-3">
                    {completedJobs.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No completed applications yet.</p>
                    ) : completedJobs.map(a => (
                        <Link key={a.id} to={`/jobs/${a.jobs?.id}`} className="block bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-primary-500/50 transition">
                            <p className="text-white font-medium">{a.jobs?.title}</p>
                            <p className="text-slate-400 text-sm">{a.jobs?.company} — {a.jobs?.location}</p>
                            <p className={`text-xs mt-2 capitalize ${a.status === 'accepted' ? 'text-emerald-400' : 'text-red-400'}`}>{a.status}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
