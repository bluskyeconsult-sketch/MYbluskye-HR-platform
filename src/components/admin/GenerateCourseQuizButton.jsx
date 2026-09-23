// src/components/admin/GenerateCourseQuizButton.jsx
//
// NEW (2026-09-21): drop-in button that generates a real, AI-written
// quiz for a course from its actual lesson content - pass it the
// course's id and title. Mount wherever the admin course-management
// UI renders each course's row/card.
//
// Usage: <GenerateCourseQuizButton courseId={course.id} courseTitle={course.title} />

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HelpCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GenerateCourseQuizButton({ courseId, courseTitle, onGenerated }) {
    const [generating, setGenerating] = useState(false);

    async function handleGenerate() {
        if (!window.confirm(`Generate a quiz for "${courseTitle}" from its real lesson content? This replaces any existing quiz for this course and turns quizzes on for it.`)) return;

        setGenerating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/index?action=generate-course-quiz', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ courseId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Quiz generation failed');

            toast.success(`Quiz created with ${data.questionsCreated} questions — now enabled for this course.`);
            if (onGenerated) onGenerated();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGenerating(false);
        }
    }

    return (
        <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition disabled:opacity-50"
            title="Generate a quiz for this course from its lesson content"
        >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
            Generate Quiz
        </button>
    );
}
