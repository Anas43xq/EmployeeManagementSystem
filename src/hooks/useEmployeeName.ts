import { useEffect, useState } from 'react';
import { db } from '../services/supabase';

interface EmployeeName {
  firstName: string;
  lastName: string;
}

export function useEmployeeName(employeeId: string | null) {
  const [name, setName] = useState<EmployeeName>({ firstName: '', lastName: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId) {
      setName({ firstName: '', lastName: '' });
      return;
    }

    const fetchName = async () => {
      try {
        setLoading(true);
        const { data, error } = await db
          .from('employee_full')
          .select('first_name, last_name')
          .eq('id', employeeId)
          .maybeSingle();

        if (!error && data) {
          setName({
            firstName: (data.first_name as string) || '',
            lastName: (data.last_name as string) || '',
          });
        } else {
          setName({ firstName: '', lastName: '' });
        }
      } catch {
        setName({ firstName: '', lastName: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchName();
  }, [employeeId]);

  return { name, loading };
}
