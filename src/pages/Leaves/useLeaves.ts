import { useEffect, useState } from 'react';
import { supabase, db } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLeaveBalance } from './useLeaveBalance';
import { useLeaveActions } from './useLeaveActions';
import type { Leave } from './types';

export function useLeaves() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  // --- Balance hook ---
  const { leaveBalance, getAvailableBalance, updateLeaveBalance } = useLeaveBalance();

  // --- Load leaves ---
  const loadLeaves = async () => {
    try {
      let query = db
        .from('leaves')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (user?.role === 'staff' && user?.employeeId) {
        query = query.eq('employee_id', user.employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeaves(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadLeaves();
  }, [user]);

  // Real-time subscription for leaves table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('leaves-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => { loadLeaves(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // --- Actions hook ---
  const actions = useLeaveActions({
    leaves,
    getAvailableBalance,
    updateLeaveBalance,
    loadLeaves,
  });

  // --- Filtered leaves ---
  const filteredLeaves = leaves.filter(leave =>
    filter === 'all' ? true : leave.status === filter
  );

  return {
    leaves,
    loading,
    user,
    filter,
    setFilter,
    filteredLeaves,
    leaveBalance,
    getAvailableBalance,
    ...actions,
  };
}
