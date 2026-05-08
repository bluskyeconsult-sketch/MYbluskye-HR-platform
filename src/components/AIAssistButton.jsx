// src/components/AIAssistButton.jsx
import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AIAssistButton({ onClick, isLoading, label = "AI Assist" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-primary-600 text-white rounded-lg hover:from-purple-500 hover:to-primary-500 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-purple-500/20"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
      {isLoading ? 'Generating...' : label}
    </button>
  );
}
