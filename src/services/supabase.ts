import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type { Session, User } from '@supabase/supabase-js';

type SupabaseLock = <Result>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<Result>
) => Promise<Result>;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const passthroughLock: SupabaseLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: passthroughLock,
    storage: localStorage,
    storageKey: 'ems-auth-token',
    flowType: 'pkce',
  },
});

export const db = supabase;
