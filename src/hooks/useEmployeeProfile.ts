import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import type { Employee } from '../types';
import { mapEmployeeRecord } from '../utils/employeeMappers';
import { getEmployeeIdForUser, getEmployeeProfileById } from '../services/employees';

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
        empId = await getEmployeeIdForUser(user!.id);
        if (!empId) {
          setLoading(false);
          return;
        }
      }

      setEmployeeId(empId);

      const data = await getEmployeeProfileById(empId);
      if (!data) {
        setEmployee(null);
        return;
      }

      setEmployee(mapEmployeeRecord(data));
    } catch {
      showNotification('error', t('employees.failedToLoadDetails'));
    } finally {
      setLoading(false);
    }
  };

  return { employee, employeeId, loading };
}
