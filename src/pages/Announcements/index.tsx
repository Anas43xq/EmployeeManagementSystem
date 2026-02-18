import { useTranslation } from 'react-i18next';
import { Megaphone, Plus } from 'lucide-react';
import { PageSpinner, PageHeader, EmptyState, Card, Button } from '../../components/ui';
import { useAnnouncements } from './useAnnouncements';
import AnnouncementCard from './AnnouncementCard';
import AnnouncementFormModal from './AnnouncementFormModal';

export default function Announcements() {
  const { t } = useTranslation();
  const {
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
  } = useAnnouncements();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('announcements.title')}
        subtitle={t('announcements.subtitle')}
        action={
          <Button onClick={openCreateModal} icon={<Plus className="w-5 h-5" />}>
            {t('announcements.newAnnouncement')}
          </Button>
        }
      />

      {announcements.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title={t('announcements.noAnnouncements')}
            message={t('announcements.createFirst')}
            action={
              <Button onClick={openCreateModal} icon={<Plus className="w-5 h-5" />}>
                {t('announcements.createAnnouncement')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              priorityConfig={PRIORITY_CONFIG[announcement.priority]}
              onToggleActive={toggleActive}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AnnouncementFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        editingAnnouncement={editingAnnouncement}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
