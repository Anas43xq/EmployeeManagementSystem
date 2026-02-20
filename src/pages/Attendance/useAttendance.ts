import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { logActivity } from '../../services/activityLog';
import type { AttendanceRecord, Employee } from './types';

export function useAttendance() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '09:00',
    check_out: '17:00',
    status: 'present' as 'present' | 'absent' | 'late' | 'half-day',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAttendance();
    if (user?.role === 'admin' || user?.role === 'hr') {
      loadEmployees();
    }
  }, [user, selectedDate]);

  const calculateHoursWorked = (checkIn: string | null, checkOut: string | null): string | null => {
    if (!checkIn || !checkOut) return null;
    try {
      const [inHour, inMin] = checkIn.split(':').map(Number);
      const [outHour, outMin] = checkOut.split(':').map(Number);

      const inMinutes = inHour * 60 + inMin;
      const outMinutes = outHour * 60 + outMin;

      let diffMinutes = outMinutes - inMinutes;

      if (diffMinutes < 0) {
        diffMinutes += 24 * 60;
      }

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return `${hours}h ${minutes}m`;
    } catch {
      return null;
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await db
        .from('employees')
        .select('id, first_name, last_name, employee_number')
        .eq('status', 'active')
        .order('first_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
    }
  };

  const loadAttendance = async () => {
    try {
      let query = db
        .from('attendance')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_number
          )
        `)
        .eq('date', selectedDate)
        .order('created_at', { ascending: false });

      if (user?.role === 'staff' && user?.employeeId) {
        query = query.eq('employee_id', user.employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!user?.employeeId) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      const { data: existing } = await db
        .from('attendance')
        .select('id, check_in')
        .eq('employee_id', user.employeeId)
        .eq('date', today)
        .maybeSingle();

      if (existing) {
        showNotification('info', t('attendance.alreadyCheckedIn'));
        return;
      }

      const { error } = await db.from('attendance').insert({
        employee_id: user.employeeId,
        date: today,
        check_in: time,
        status: 'present' as const,
      } as any);

      if (error) throw error;

      showNotification('success', t('attendance.checkInSuccess'));

      logActivity(user.id, 'attendance_checked_in', 'attendance', undefined, {
        date: today,
        check_in: time,
      });

      if (selectedDate === today) {
        loadAttendance();
      }
    } catch (error) {
      showNotification('error', t('attendance.checkInFailed'));
    }
  };

  const handleCheckOut = async (recordId: string) => {
    if (!user?.employeeId) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      const { error } = await (db.from('attendance') as any)
        .update({ check_out: time })
        .eq('id', recordId)
        .eq('employee_id', user.employeeId);

      if (error) throw error;

      showNotification('success', t('attendance.checkOutSuccess'));

      logActivity(user.id, 'attendance_checked_out', 'attendance', recordId, {
        date: today,
        check_out: time,
      });

      loadAttendance();
    } catch (error) {
      showNotification('error', t('attendance.checkOutFailed'));
    }
  };

  const openAddModal = () => {
    setFormData({
      employee_id: '',
      date: selectedDate,
      check_in: '09:00',
      check_out: '17:00',
      status: 'present',
      notes: '',
    });
    setError('');
    setShowAddModal(true);
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.employee_id) {
        setError(t('attendance.selectEmployeeError'));
        setSubmitting(false);
        return;
      }

      const { data: existingRecord } = await db
        .from('attendance')
        .select('id')
        .eq('employee_id', formData.employee_id)
        .eq('date', formData.date)
        .maybeSingle();

      if (existingRecord) {
        setError(t('attendance.recordAlreadyExists'));
        setSubmitting(false);
        return;
      }

      const { error } = await (db.from('attendance') as any).insert({
        employee_id: formData.employee_id,
        date: formData.date,
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        status: formData.status,
        notes: formData.notes,
      });

      if (error) throw error;

      if (user) {
        logActivity(user.id, 'attendance_recorded', 'attendance', undefined, {
          employee_id: formData.employee_id,
          date: formData.date,
          status: formData.status,
        });
      }

      setShowAddModal(false);
      if (formData.date === selectedDate) {
        loadAttendance();
      }
    } catch (err: any) {
      setError(err.message || t('attendance.failedToAdd'));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    attendanceRecords,
    loading,
    user,
    selectedDate,
    setSelectedDate,
    showAddModal,
    setShowAddModal,
    employees,
    formData,
    setFormData,
    submitting,
    error,
    calculateHoursWorked,
    handleMarkAttendance,
    handleCheckOut,
    openAddModal,
    handleAddAttendance,
  };
}

