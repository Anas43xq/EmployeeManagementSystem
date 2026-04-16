import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrCreateLeaveBalance, updateLeaveBalance, subscribeToLeaveBalanceChanges } from '../../services/leaves';
import { calculateWorkingDays } from '../../utils/dateUtils';
import type { LeaveBalance } from './types';

/**
 * Hook: Staff leave balance display and calculation
 * Owns: leaveBalance state, balance calculations, balance updates
 */
export function useLeaveBalance() {
  const { user } = useAuth();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  const loadLeaveBalance = useCallback(async () => {
    if (!user?.employeeId) return;
    const currentYear = new Date().getFullYear();
    try {
      const data = await getOrCreateLeaveBalance(user.employeeId, currentYear);
      setLeaveBalance(data);
    } catch (err) {
      console.error('[useLeaveBalance] loadLeaveBalance failed:', err);
      setLeaveBalance(null);
    }
  }, [user?.employeeId]);

  useEffect(() => {
    loadLeaveBalance();
  }, [loadLeaveBalance]);

  useEffect(() => {
    if (!user?.employeeId) return;

    return subscribeToLeaveBalanceChanges(user.employeeId, loadLeaveBalance);
  }, [user?.employeeId, loadLeaveBalance]);

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

  const calculateDays = (startDate: string, endDate: string): number => {
    if (!startDate || !endDate) return 0;
    return calculateWorkingDays(startDate, endDate);
  };

  const updateLeaveBalanceField = async (employeeId: string, leaveType: string, days: number, action: 'add' | 'subtract') => {
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
      const balance = await getOrCreateLeaveBalance(employeeId, currentYear);
      const rec = balance as unknown as Record<string, number>;
      const newValue = action === 'add'
        ? (rec[fieldToUpdate] || 0) + days
        : Math.max(0, (rec[fieldToUpdate] || 0) - days);
      await updateLeaveBalance(employeeId, currentYear, fieldToUpdate, newValue);
    } catch (err) {
      console.error('[useLeaveBalance] updateLeaveBalanceField failed:', err);
      throw err;
    }
  };

  return {
    leaveBalance,
    getAvailableBalance,
    calculateDays,
    updateLeaveBalanceField,
  };
}
