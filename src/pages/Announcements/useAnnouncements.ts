import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useDeleteConfirmation } from '../../hooks/useDeleteConfirmation';
import { logActivity } from '../../services/activityLog';
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
} from '../../services/announcements';
import { AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import type { Announcement } from './types';

export function useAnnouncements() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { pendingDeleteId, deleting, requestDelete, cancelDelete, confirmDelete } = useDeleteConfirmation();
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

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('[useAnnouncements] loadAnnouncements failed:', err);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

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
        isActive: formData.is_active,
        expiresAt: formData.expires_at || null,
        createdBy: user?.id,
      };

      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, announcementData);
        if (user) {
          logActivity(user.id, 'announcement_updated', 'announcement', editingAnnouncement.id, {
            title: announcementData.title,
          });
        }
      } else {
        const createdAnnouncement = await createAnnouncement(announcementData);
        if (user && createdAnnouncement) {
          logActivity(user.id, 'announcement_created', 'announcement', createdAnnouncement.id, {
            title: announcementData.title,
          });
        }
      }

      setShowModal(false);
      loadAnnouncements();
    } catch (_err: unknown) {
      setError(((_err as Error)?.message) || t('announcements.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteHandler = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      if (user) {
        logActivity(user.id, 'announcement_deleted', 'announcement', id);
      }
      loadAnnouncements();
    } catch (err) {
      console.error('[useAnnouncements] confirmDeleteHandler failed:', err);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      await toggleAnnouncementActive(announcement.id, !announcement.is_active);
      if (user) {
        logActivity(user.id, 'announcement_toggled', 'announcement', announcement.id, {
          is_active: !announcement.is_active,
        });
      }
      loadAnnouncements();
    } catch (err) {
      console.error('[useAnnouncements] toggleActive failed:', err);
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
    requestDelete,
    cancelDelete,
    pendingDeleteId,
    deleting,
    toggleActive,
    handleConfirmDelete: () => confirmDelete(confirmDeleteHandler),
  };
}
