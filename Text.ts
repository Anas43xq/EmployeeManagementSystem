import { useEffect } from 'react';
import { db } from './src/services/supabase.ts';

export default function useText() {
    useEffect(() => {
        const load = async () => {
            const { data, error } = await db
                .from('activity_logs')
                .select('id, action, created_at, entity_type')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error fetching activity logs:', error);
            } else {
                console.log('Activity logs:', data);
            }
        };

        load();
    }, []);
}

