// src/lib/aiAssistant.js
// NEW (2026-10-14) - the one front-end doorway to the AI assistant for
// every product (assessments, HR tools, HIREVA, general help). It calls
// the server action 'ai-assistant', which verifies the signed-in user,
// charges one credit, refunds it if the AI fails, and builds the system
// prompt itself. Pages never send a userId or a system prompt.
//
// USAGE:
//   import { askAssistant } from '../lib/aiAssistant';
//   const { response, remaining } = await askAssistant({
//       product: 'assessments',            // assessments | hr_tools | hireva | general
//       message: 'What should I work on first?',
//       context: 'Leadership assessment, score 62%, weakest area: delegation',
//       history: [{ role: 'user', content: '...' }, { role: 'assistant', content: '...' }]
//   });

import { authenticatedFetch } from './authFetch';

export const ASSISTANT_PRODUCTS = ['assessments', 'hr_tools', 'hireva', 'general'];

export async function askAssistant({ product = 'general', message, context = '', history = [] }) {
    if (!message || !message.trim()) throw new Error('Please type a question first.');
    const data = await authenticatedFetch('ai-assistant', {
        product,
        message: message.trim().slice(0, 2000),
        context: String(context || '').slice(0, 3000),
        history: history.slice(-10)
    });
    return { response: data.response, remaining: data.remaining };
}
