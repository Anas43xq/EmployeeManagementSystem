/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const db = createClient(supabaseUrl, supabaseKey);

const { data, error, count } = await db
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

if (error) {
    console.error('Error:', error);
} else {
    console.log(`Total rows: ${count}`);
    console.table(data);
}

