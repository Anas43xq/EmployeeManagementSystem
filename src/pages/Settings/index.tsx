import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import ProfileInfoCard from './ProfileInfoCard';
import ChangePasswordCard from './ChangePasswordCard';
import NotificationPrefsCard from './NotificationPrefsCard';
import LanguageCard from './LanguageCard';
import AccountInfoSidebar from './AccountInfoSidebar';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

export default function Settings() {
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
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadNotificationPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
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
        });
      }
    } catch (err) {
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
      const { error } = await (supabase
        .from('user_preferences') as any)
        .upsert({
          user_id: user.id,
          email_leave_approvals: notificationPrefs.leave_approvals,
          email_attendance_reminders: notificationPrefs.attendance_reminders,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      showNotification('success', t('settings.prefsSaved'));
    } catch (err) {
      console.error('Error saving preferences:', err);
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
      const redirectUrl = `${appUrl}/settings`;

      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        {
          emailRedirectTo: redirectUrl
        }
      );
      
      if (error) throw error;

      await supabase.auth.signOut();
      navigate('/login', { state: { successMessage: t('settings.emailChangeRequest') } });
    } catch (error: any) {
      console.error('Error updating email:', error);
      if (error?.message?.includes('same')) {
        showNotification('info', 'New email is the same as current email');
      } else {
        showNotification('error', 'Failed to update email: ' + (error?.message || 'Please try again'));
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-2">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProfileInfoCard
            user={user}
            isEditingEmail={isEditingEmail}
            setIsEditingEmail={setIsEditingEmail}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            updatingEmail={updatingEmail}
            onEmailUpdate={handleEmailUpdate}
            onCancelEdit={handleCancelEdit}
          />
          <ChangePasswordCard />
          <NotificationPrefsCard
            notificationPrefs={notificationPrefs}
            setNotificationPrefs={setNotificationPrefs}
            savingPrefs={savingPrefs}
            onSave={handleSavePreferences}
          />
          <LanguageCard />
        </div>

        <AccountInfoSidebar user={user} />
      </div>
    </div>
  );
}
