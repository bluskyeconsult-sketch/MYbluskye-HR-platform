// src/components/admin/ConvertBookToCourseButton.jsx
//
// NEW (2026-09-21): drop-in button that converts a book's real
// chapters into a real course - pass it the book's id and title.
// Mount this wherever the admin book-management UI renders each
// book's row/card (e.g. AdminBooks.jsx), alongside its other actions.
//
// Usage: <ConvertBookToCourseButton bookId={book.id} bookTitle={book.title} />

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { GraduationCap, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConvertBookToCourseButton({ bookId, bookTitle, onConverted }) {
    const [converting, setConverting] = useState(false);

    async function handleConvert() {
        if (!window.confirm(`Convert "${bookTitle}" into a course? Each chapter with real content becomes one lesson.`)) return;

        // NEW (2026-09-21): genuine AI elaboration option - adds real
        // learning objectives and key takeaways per lesson while
        // preserving the book's actual content, rather than just
        // copying chapter text as-is. Opt-in since it's slower and
        // uses real AI credits per chapter.
        const elaborateWithAI = window.confirm('Also use AI to add learning objectives and key takeaways to each lesson? (Preserves the book\'s real content - just adds structure around it.) Click Cancel to convert with the raw chapter text only.');

        setConverting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generate-course-from-book', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ bookId, elaborateWithAI })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Conversion failed');

            toast.success(`Course created with ${data.lessonsCreated} lessons — it's saved as a draft, ready to review before publishing.`);
            if (onConverted) onConverted(data.course);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setConverting(false);
        }
    }

    return (
        <button
            onClick={handleConvert}
            disabled={converting}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
            title="Convert this book's chapters into a course"
        >
            {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
            Convert to Course
        </button>
    );
}
