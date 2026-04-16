import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { signOutCurrentSession } from '../../services/session';
import {
  getUserNotificationPreferences,
  saveUserNotificationPreferences,
  requestUserEmailUpdate,
  type NotificationPreferenceState,
} from '../../services/settings';

export function useSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferenceState>({
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
      const data = await getUserNotificationPreferences(user.id);

      if (data) {
        setNotificationPrefs({
          leave_approvals: data.email_leave_approvals ?? true,
          attendance_reminders: data.email_attendance_reminders ?? true,
          warnings: data.email_warnings ?? true,
          tasks: data.email_tasks ?? true,
          complaints: data.email_complaints ?? true,
        });
      }
    } catch (err) {
      console.error('[useSettings] loadNotificationPreferences failed:', err);
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
      await saveUserNotificationPreferences(user.id, notificationPrefs);
      showNotification('success', t('settings.prefsSaved'));
    } catch (err) {
      console.error('[useSettings] handleSavePreferences failed:', err);
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
      await requestUserEmailUpdate(newEmail, `${appUrl}/settings`);
      await signOutCurrentSession();
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
