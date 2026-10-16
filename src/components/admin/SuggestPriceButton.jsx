// src/components/admin/SuggestPriceButton.jsx
//
// NEW (2026-09-25): AI pricing assistant - drops in next to any price
// input field (books, courses, VAs, HR tools) and suggests a genuine,
// grounded price recommendation with reasoning, so pricing decisions
// aren't guesswork.
//
// Usage: <SuggestPriceButton itemType="book" name={bookForm.title}
//   description={bookForm.description} onApply={(price) => setBookForm({...bookForm, ebook_price: price})} />

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DollarSign, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SuggestPriceButton({ itemType, name, description, category, executionType, version, bookId, pageCount, ink, trim, onApply }) {
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState(null);

    async function handleSuggest() {
        if (!name?.trim()) {
            toast.error('Enter a name/title first, so the suggestion has something real to work from.');
            return;
        }
        setLoading(true);
        setSuggestion(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=suggest-price', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ itemType, name, description, category, executionType, version, bookId, pageCount, ink, trim })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not get a suggestion');
            setSuggestion(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={handleSuggest}
                disabled={loading}
                className="text-xs px-2.5 py-1.5 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition disabled:opacity-50 flex items-center gap-1.5"
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-primary-400" />}
                {loading ? 'Thinking...' : 'Suggest Price'}
            </button>

            {suggestion && (
                <div className="mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-400" />
                            <span className="text-white font-semibold">${suggestion.suggestedPrice}</span>
                            <span className="text-slate-500 text-xs">
                                (range: ${suggestion.priceRange?.min}–${suggestion.priceRange?.max})
                            </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded-full capitalize">
                            {suggestion.competitivePosition}
                        </span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{suggestion.reasoning}</p>
                    {suggestion.costInfo?.amazon && (
                        <p className="text-slate-500 text-xs mb-2">
                            Amazon prints this for ${Number(suggestion.costInfo.amazon.printingCost).toFixed(2)} and will not accept a list price below ${Number(suggestion.costInfo.amazon.minimumListPrice).toFixed(2)}. To earn about ${Number(suggestion.costInfo.amazon.targetRoyaltyPerCopy).toFixed(2)} per copy, list it at ${Number(suggestion.costInfo.floor).toFixed(2)} or more.
                        </p>
                    )}
                    {suggestion.costInfo?.compare && (
                        <p className="text-slate-500 text-xs mb-2">
                            At ${Number(suggestion.costInfo.compare.atPrice).toFixed(2)} your site keeps about ${Number(suggestion.costInfo.compare.yourSiteKeepsPerSale).toFixed(2)} per sale
                            {suggestion.costInfo.compare.kindleKeepsPerSaleBeforeDeliveryFee !== undefined ? `; Amazon Kindle would keep you about $${Number(suggestion.costInfo.compare.kindleKeepsPerSaleBeforeDeliveryFee).toFixed(2)} before its delivery fee.` : '.'}
                        </p>
                    )}
                    {suggestion.costInfo && !suggestion.costInfo.amazon && (
                        <p className="text-slate-500 text-xs mb-2">
                            {suggestion.costInfo.floor
                                ? `Cost floor $${Number(suggestion.costInfo.floor).toFixed(2)}`
                                    + (suggestion.costInfo.audioGenerationCost !== undefined ? ` (audio generation about $${Number(suggestion.costInfo.audioGenerationCost).toFixed(2)} over ${suggestion.costInfo.assumedSalesToRecoverAudioCost} sales, plus payment fees)` : ' (payment fees)')
                                : suggestion.costInfo.note}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => onApply?.(suggestion.suggestedPrice)}
                        className="text-xs px-3 py-1 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition"
                    >
                        Use This Price
                    </button>
                </div>
            )}
        </div>
    );
}
