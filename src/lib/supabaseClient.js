// src/lib/supabaseClient.js
// DEPRECATED - Re-export from singleton to maintain backward compatibility
//
// FIXED (2026-08-29): confirmed real bug - this only ever exported a
// binding named 'supabase', never one named 'supabaseClient', despite
// this file's own filename and stated purpose. Any code still doing
// `import { supabaseClient } from '../lib/supabaseClient'` would get
// undefined for that binding - the "backward compatibility" this file
// claims to provide never actually worked for its own name.

import { supabase } from './supabase.js';
export { supabase };
export const supabaseClient = supabase;
