import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import type { Employee } from '../types';

export function useEmployeeProfile() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      let empId = user?.employeeId ?? null;

      if (!empId) {
        const { data: userData, error: userError } = await db
          .from('users')
          .select('employee_id')
          .eq('id', user!.id)
          .maybeSingle();

        const userRecord = userData as { employee_id: string } | null;
        if (userError || !userRecord?.employee_id) {
          setLoading(false);
          return;
        }
        empId = userRecord.employee_id;
      }

      setEmployeeId(empId);

      const { data, error } = await db
        .from('employees')
        .select(`*, departments!department_id (name)`)
        .eq('id', empId)
        .maybeSingle();

      if (error) throw error;
      setEmployee(data as Employee);
    } catch {
      showNotification('error', t('employees.failedToLoadDetails'));
    } finally {
      setLoading(false);
    }
  };

  return { employee, employeeId, loading };
}
