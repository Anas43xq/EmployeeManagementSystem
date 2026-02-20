import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../services/activityLog';
import { AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import type { Announcement } from './types';

export function useAnnouncements() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    is_active: true,
    expires_at: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const PRIORITY_CONFIG = {
    low: { label: t('announcements.low'), color: 'bg-gray-100 text-gray-700', icon: Info },
    normal: { label: t('announcements.normal'), color: 'bg-primary-100 text-primary-700', icon: Bell },
    high: { label: t('announcements.high'), color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    urgent: { label: t('announcements.urgent'), color: 'bg-red-100 text-red-700', icon: AlertCircle },
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await (db
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false }) as any) as { data: Announcement[] | null; error: any };

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      is_active: true,
      expires_at: '',
    });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      is_active: announcement.is_active,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!formData.title.trim()) {
        setError(t('announcements.titleRequired'));
        setSubmitting(false);
        return;
      }

      if (!formData.content.trim()) {
        setError(t('announcements.contentRequired'));
        setSubmitting(false);
        return;
      }

      const announcementData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        is_active: formData.is_active,
        expires_at: formData.expires_at || null,
        created_by: user?.id,
      };

      if (editingAnnouncement) {
        const { error } = await (db
          .from('announcements') as any)
          .update(announcementData)
          .eq('id', editingAnnouncement.id);

        if (error) throw error;

        if (user) {
          logActivity(user.id, 'announcement_updated', 'announcement', editingAnnouncement.id, {
            title: announcementData.title,
          });
        }
      } else {
        const { data, error } = await (db
          .from('announcements') as any)
          .insert(announcementData)
          .select()
          .single();

        if (error) throw error;

        if (user && data) {
          logActivity(user.id, 'announcement_created', 'announcement', data.id, {
            title: announcementData.title,
          });
        }
      }

      setShowModal(false);
      loadAnnouncements();
    } catch (err: any) {
      setError(err.message || t('announcements.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('announcements.confirmDelete'))) return;

    try {
      const { error } = await (db
        .from('announcements')
        .delete()
        .eq('id', id) as any);

      if (error) throw error;

      if (user) {
        logActivity(user.id, 'announcement_deleted', 'announcement', id);
      }

      loadAnnouncements();
    } catch (err: any) {
      alert(err.message || t('announcements.deleteFailed'));
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await (db
        .from('announcements') as any)
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;

      if (user) {
        logActivity(user.id, 'announcement_toggled', 'announcement', announcement.id, {
          is_active: !announcement.is_active,
        });
      }

      loadAnnouncements();
    } catch (err: any) {
    }
  };

  return {
    announcements,
    loading,
    showModal,
    setShowModal,
    editingAnnouncement,
    formData,
    setFormData,
    submitting,
    error,
    PRIORITY_CONFIG,
    openCreateModal,
    openEditModal,
    handleSubmit,
    handleDelete,
    toggleActive,
  };
}
