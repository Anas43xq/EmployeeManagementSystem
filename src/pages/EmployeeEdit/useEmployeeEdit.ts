import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../services/activityLog';
import type { Department, EmployeeFormData, Qualification } from './types';

export function useEmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    department_id: '',
    position: '',
    employment_type: 'full-time',
    status: 'active',
    hire_date: '',
    salary: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    photo_url: '',
    qualifications: [],
  });

  useEffect(() => {
    loadDepartments();
    if (id && id !== 'new') {
      loadEmployee();
    } else {
      loadNextEmployeeNumber();
    }
  }, [id]);

  const loadNextEmployeeNumber = async () => {
    try {
      const { data } = await db
        .from('employees')
        .select('employee_number')
        .order('employee_number', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { employee_number: string } | null; error: unknown };

      let preview = 'EMP001';
      if (data?.employee_number) {
        const match = data.employee_number.match(/^EMP(\d+)$/);
        if (match) {
          const next = parseInt(match[1], 10) + 1;
          preview = 'EMP' + String(next).padStart(3, '0');
        }
      }
      setFormData(prev => ({ ...prev, employee_number: preview }));
    } catch {
      // fallback — DB will assign the real number on save
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data, error } = await db
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (_error) {
      showNotification('error', t('employees.failedToLoadDepartments'));
    }
  };

  const loadEmployee = async () => {
    try {
      const { data, error } = await db
        .from('employees')
        .select('*')
        .eq('id', id!)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (error) throw error;

      if (!data) {
        showNotification('error', t('employees.notFound'));
        navigate('/employees');
        return;
      }

      setFormData({
        employee_number: (data.employee_number as string) || '',
        first_name: (data.first_name as string) || '',
        last_name: (data.last_name as string) || '',
        email: (data.email as string) || '',
        phone: (data.phone as string) || '',
        date_of_birth: (data.date_of_birth as string) || '',
        gender: (data.gender as string) || '',
        address: (data.address as string) || '',
        city: (data.city as string) || '',
        state: (data.state as string) || '',
        postal_code: (data.postal_code as string) || '',
        department_id: (data.department_id as string) || '',
        position: (data.position as string) || '',
        employment_type: (data.employment_type as string) || 'full-time',
        status: (data.status as string) || 'active',
        hire_date: (data.hire_date as string) || '',
        salary: ((data.salary as number) || 0).toString(),
        emergency_contact_name: (data.emergency_contact_name as string) || '',
        emergency_contact_phone: (data.emergency_contact_phone as string) || '',
        photo_url: (data.photo_url as string) || '',
        qualifications: (data.qualifications as Qualification[]) || [],
      });
    } catch (_error) {
      showNotification('error', t('employees.failedToLoadDetails'));
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (photoUrl: string | null) => {
    setFormData(prev => ({ ...prev, photo_url: photoUrl || '' }));
  };

  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { degree: '', institution: '', year: '' }],
    }));
  };

  const updateQualification = (index: number, field: keyof Qualification, value: string) => {
    setFormData(prev => {
      const updated = [...prev.qualifications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, qualifications: updated };
    });
  };

  const removeQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.position) {
      showNotification('error', t('employees.fillRequiredFields'));
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        date_of_birth: formData.date_of_birth || null,
        updated_at: new Date().toISOString(),
      };

      let error;
      let newEmployeeId = id;

      const isNewEmployee = !id || id === 'new';

      if (isNewEmployee) {
        const { employee_number: _preview, ...employeeData } = submitData;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: insertError } = await (db.from('employees') as any)
          .insert([employeeData])
          .select('id, employee_number')
          .single();

        if (insertError) throw insertError;
        newEmployeeId = data?.id;

        showNotification('success', t('employees.employeeCreated'));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (db.from('employees') as any)
          .update(submitData)
          .eq('id', id!);

        error = updateError;
        if (error) throw error;
        showNotification('success', t('employees.employeeUpdated'));
      }

      if (user) {
        logActivity(user.id, isNewEmployee ? 'employee_created' : 'employee_updated', 'employee', newEmployeeId || id!, {
          name: `${formData.first_name} ${formData.last_name}`,
          position: formData.position,
        });
      }

      navigate(`/employees/${newEmployeeId || id}`);
    } catch (_error: unknown) {
      showNotification('error', (_error as Error).message || t('employees.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return {
    id,
    loading,
    saving,
    departments,
    formData,
    handleChange,
    handlePhotoChange,
    handleSubmit,
    addQualification,
    updateQualification,
    removeQualification,
  };
}

