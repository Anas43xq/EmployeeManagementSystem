import { supabase } from '../supabase';

// Re-export supabase as typed for use across all services
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;
