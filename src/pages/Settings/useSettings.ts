import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { db } from '../../services/supabase';
import type { Database } from '../../types/database';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

export function useSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    leave_approvals: true,
    attendance_reminders: true,
    warnings: true,
    tasks: true,
    complaints: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await db
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return;

      if (data) {
        const prefs = data as UserPreferences;
        setNotificationPrefs({
          leave_approvals: prefs.email_leave_approvals ?? true,
          attendance_reminders: prefs.email_attendance_reminders ?? true,
          warnings: prefs.email_warnings ?? true,
          tasks: prefs.email_tasks ?? true,
          complaints: prefs.email_complaints ?? true,
        });
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadNotificationPreferences();
    }
  }, [user?.id]);

  const handleSavePreferences = async () => {
    if (!user?.id) {
      showNotification('error', 'User not authenticated');
      return;
    }

    setSavingPrefs(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (db.from('user_preferences') as any)
        .upsert({
          user_id: user.id,
          email_leave_approvals: notificationPrefs.leave_approvals,
          email_attendance_reminders: notificationPrefs.attendance_reminders,
          email_warnings: notificationPrefs.warnings,
          email_tasks: notificationPrefs.tasks,
          email_complaints: notificationPrefs.complaints,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      showNotification('success', t('settings.prefsSaved'));
    } catch {
      showNotification('error', 'Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      showNotification('error', 'Please enter a valid email address');
      return;
    }

    if (!user?.id) {
      showNotification('error', 'User not authenticated');
      return;
    }

    if (newEmail === user?.email) {
      setIsEditingEmail(false);
      return;
    }

    setUpdatingEmail(true);
    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await db.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${appUrl}/settings` }
      );

      if (error) throw error;

      await db.auth.signOut();
      navigate('/login', { state: { successMessage: t('settings.emailChangeRequest') } });
    } catch (_error: unknown) {
      if ((_error as Error)?.message?.includes('same')) {
        showNotification('info', 'New email is the same as current email');
      } else {
        showNotification('error', 'Failed to update email: ' + ((_error as Error)?.message || 'Please try again'));
      }
      setNewEmail(user?.email || '');
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setNewEmail(user?.email || '');
  };

  return {
    user,
    isEditingEmail,
    setIsEditingEmail,
    newEmail,
    setNewEmail,
    updatingEmail,
    notificationPrefs,
    setNotificationPrefs,
    savingPrefs,
    handleSavePreferences,
    handleEmailUpdate,
    handleCancelEdit,
  };
}
