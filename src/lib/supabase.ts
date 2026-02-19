import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Disable lock to prevent AbortError issues
    lock: (() => {}) as any,
    // Use localStorage for storage
    storage: localStorage,
    storageKey: 'ems-auth-token',
    // Increase flow state expiry to prevent race conditions
    flowType: 'pkce',
  },
});

// Typed helper for queries - bypasses strict type inference issues
export const db = supabase as any;
