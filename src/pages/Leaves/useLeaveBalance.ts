import { useState, useEffect } from 'react';
import { db } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { LeaveBalance } from './types';

export function useLeaveBalance() {
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadLeaveBalance();
  }, [user]);

  // Real-time subscription for leave_balances table
  useEffect(() => {
    if (!user?.employeeId) return;

    const channel = supabase
      .channel('leave-balances-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_balances',
          filter: `employee_id=eq.${user.employeeId}`,
        },
        () => {
          loadLeaveBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.employeeId]);

  const loadLeaveBalance = async () => {
    if (!user?.employeeId) return;

    const currentYear = new Date().getFullYear();
    try {
      const { data, error } = await db
        .from('leave_balances')
        .select('*')
        .eq('employee_id', user.employeeId)
        .eq('year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') {
        return;
      }

      if (data) {
        setLeaveBalance(data);
      } else {
        const { data: newBalance, error: insertError } = await (db.from('leave_balances') as any)
          .insert({
            employee_id: user.employeeId,
            year: currentYear,
            annual_total: 20,
            annual_used: 0,
            sick_total: 10,
            sick_used: 0,
            casual_total: 10,
            casual_used: 0,
          })
          .select()
          .single();

        if (!insertError && newBalance) {
          setLeaveBalance(newBalance);
        }
      }
    } catch {
      // silent
    }
  };

  const getAvailableBalance = (leaveType: string): number => {
    if (!leaveBalance) return 0;
    switch (leaveType) {
      case 'annual':
        return (leaveBalance.annual_total || 0) - (leaveBalance.annual_used || 0);
      case 'sick':
        return (leaveBalance.sick_total || 0) - (leaveBalance.sick_used || 0);
      case 'casual':
        return (leaveBalance.casual_total || 0) - (leaveBalance.casual_used || 0);
      default:
        return 999;
    }
  };

  const updateLeaveBalance = async (employeeId: string, leaveType: string, days: number, action: 'add' | 'subtract') => {
    const currentYear = new Date().getFullYear();
    let fieldToUpdate = '';

    switch (leaveType) {
      case 'annual':
        fieldToUpdate = 'annual_used';
        break;
      case 'sick':
        fieldToUpdate = 'sick_used';
        break;
      case 'casual':
        fieldToUpdate = 'casual_used';
        break;
      default:
        return;
    }

    try {
      const { data: currentBalance } = await db
        .from('leave_balances')
        .select(fieldToUpdate)
        .eq('employee_id', employeeId)
        .eq('year', currentYear)
        .single();

      if (currentBalance) {
        const balanceRecord = currentBalance as unknown as Record<string, number>;
        const currentValue = balanceRecord[fieldToUpdate] || 0;
        const newValue = action === 'add' ? currentValue + days : Math.max(0, currentValue - days);

        await (db.from('leave_balances') as any)
          .update({ [fieldToUpdate]: newValue })
          .eq('employee_id', employeeId)
          .eq('year', currentYear);
      }
    } catch {
      // silent
    }
  };

  return {
    leaveBalance,
    getAvailableBalance,
    updateLeaveBalance,
  };
}
