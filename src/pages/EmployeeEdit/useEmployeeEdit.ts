import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../lib/activityLog';
import type { Department, EmployeeFormData } from './types';

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
  });

  useEffect(() => {
    loadDepartments();
    if (id && id !== 'new') {
      loadEmployee();
    } else {
      setLoading(false);
    }
  }, [id]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await db
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      showNotification('error', t('employees.failedToLoadDepartments'));
    }
  };

  const loadEmployee = async () => {
    try {
      const { data, error } = await db
        .from('employees')
        .select('*')
        .eq('id', id!)
        .maybeSingle() as { data: any; error: any };

      if (error) throw error;

      if (!data) {
        showNotification('error', t('employees.notFound'));
        navigate('/employees');
        return;
      }

      setFormData({
        employee_number: data.employee_number || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postal_code || '',
        department_id: data.department_id || '',
        position: data.position || '',
        employment_type: data.employment_type || 'full-time',
        status: data.status || 'active',
        hire_date: data.hire_date || '',
        salary: data.salary?.toString() || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        photo_url: data.photo_url || '',
      });
    } catch (error) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email || !formData.position || !formData.employee_number) {
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
        const { data, error: insertError } = await (db.from('employees') as any)
          .insert([submitData])
          .select('id')
          .single();

        if (insertError) throw insertError;
        newEmployeeId = data?.id;

        showNotification('success', t('employees.employeeCreated'));
      } else {
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
    } catch (error: any) {
      showNotification('error', error.message || t('employees.failedToSave'));
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
  };
}

