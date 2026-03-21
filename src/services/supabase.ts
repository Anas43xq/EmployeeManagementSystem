import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

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
    lock: (async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => {
      return fn();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
    storage: localStorage,
    storageKey: 'ems-auth-token',
    flowType: 'pkce',
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
