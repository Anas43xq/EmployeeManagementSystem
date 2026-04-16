import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { logActivity } from '../../services/activityLog';
import {
  getAttendanceEmployees,
  getAttendanceRecords,
  checkAttendanceExists,
  markAttendance,
  updateCheckOut,
  createAttendanceRecord,
  attendanceRecordExists,
} from '../../services/attendance';
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
    } catch (err) {
      console.error('[useAttendance] calculateHoursWorked failed:', err);
      return null;
    }
  };

  const loadAttendance = useCallback(async () => {
    try {
      const data = await getAttendanceRecords(
        selectedDate,
        user?.role === 'staff' && user?.employeeId ? user.employeeId : undefined
      );
      setAttendanceRecords(data);
    } catch (error) {
      console.error('[useAttendance] loadAttendance failed:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.employeeId, selectedDate]);

  const loadEmployees = useCallback(async () => {
    try {
      const data = await getAttendanceEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('[useAttendance] loadEmployees failed:', error);
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleMarkAttendance = async () => {
    if (!user?.employeeId) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      const existing = await checkAttendanceExists(user.employeeId, today);
      if (existing) {
        showNotification('info', t('attendance.alreadyCheckedIn'));
        return;
      }

      await markAttendance(user.employeeId, today, time);
      showNotification('success', t('attendance.checkInSuccess'));
      logActivity(user.id, 'attendance_checked_in', 'attendance', undefined, {
        date: today,
        check_in: time,
      });

      if (selectedDate === today) {
        loadAttendance();
      }
    } catch (_error) {
      showNotification('error', t('attendance.checkInFailed'));
    }
  };

  const handleCheckOut = async (recordId: string) => {
    if (!user?.employeeId) return;

    const today = new Date().toISOString().split('T')[0];
    try {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0].substring(0, 5);

      await updateCheckOut(recordId, user.employeeId, time);
      showNotification('success', t('attendance.checkOutSuccess'));
      logActivity(user.id, 'attendance_checked_out', 'attendance', recordId, {
        date: today,
        check_out: time,
      });

      loadAttendance();
    } catch (_error) {
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

      const recordExists = await attendanceRecordExists(formData.employee_id, formData.date);
      if (recordExists) {
        setError(t('attendance.recordAlreadyExists'));
        setSubmitting(false);
        return;
      }

      await createAttendanceRecord({
        employee_id: formData.employee_id,
        date: formData.date,
        check_in: formData.check_in || null,
        check_out: formData.check_out || null,
        status: formData.status,
        notes: formData.notes,
      });

      if (user) {
        logActivity(user.id, 'attendance_manual_entry', 'attendance', undefined, {
          employee_id: formData.employee_id,
          date: formData.date,
          status: formData.status,
        });
      }

      setShowAddModal(false);
      if (formData.date === selectedDate) {
        loadAttendance();
      }
    } catch (_err: unknown) {
      setError((_err as Error).message || t('attendance.failedToAdd'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  return {
    attendanceRecords,
    loading,
    selectedDate,
    handleDateChange,
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

