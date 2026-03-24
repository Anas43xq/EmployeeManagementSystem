import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../services/activityLog';
import {
  getNextEmployeeNumber,
  getEmployeeById,
  createEmployee,
  updateEmployee,
} from '../../services/employees';
import { getDepartments } from '../../services/departments';
import type { Department, EmployeeFormData, Qualification } from './types';
import { mapEmployeeRecord } from '../../utils/employeeMappers';

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
      const preview = await getNextEmployeeNumber();
      setFormData((prev) => ({ ...prev, employee_number: preview }));
    } catch {
      // fallback — DB will assign the real number on save
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(
        data.map((dept) => ({
          id: dept.id,
          name: dept.name,
        }))
      );
    } catch (_error) {
      showNotification('error', t('employees.failedToLoadDepartments'));
    }
  };

  const loadEmployee = async () => {
    try {
      const data = await getEmployeeById(id!);
      if (!data) {
        showNotification('error', t('employees.notFound'));
        navigate('/employees');
        return;
      }

      const employee = mapEmployeeRecord(data);

      setFormData({
        employee_number: employee.employee_number,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        date_of_birth: employee.date_of_birth,
        gender: employee.gender,
        address: employee.address,
        city: employee.city,
        state: employee.state,
        postal_code: employee.postal_code,
        department_id: employee.department_id,
        position: employee.position,
        employment_type: employee.employment_type || 'full-time',
        status: employee.status || 'active',
        hire_date: employee.hire_date,
        salary: employee.salary.toString(),
        emergency_contact_name: employee.emergency_contact_name,
        emergency_contact_phone: employee.emergency_contact_phone,
        photo_url: employee.photo_url || '',
        qualifications: employee.qualifications,
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
      const isNewEmployee = !id || id === 'new';
      const submitData = {
        ...formData,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        date_of_birth: formData.date_of_birth || null,
        updated_at: new Date().toISOString(),
      };

      let newEmployeeId = id;
      if (isNewEmployee) {
        const { employee_number: _preview, ...employeeData } = submitData;
        const createdEmployee = await createEmployee(employeeData);
        newEmployeeId = createdEmployee.id;
        showNotification('success', t('employees.employeeCreated'));
      } else {
        await updateEmployee(id!, submitData);
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

