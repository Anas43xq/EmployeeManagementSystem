import { useTranslation } from 'react-i18next';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { PageSpinner, PageHeader, EmptyState, Card, Button, Modal } from '../../components/ui';
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
    requestDelete,
    cancelDelete,
    confirmDelete,
    pendingDeleteId,
    deleting,
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
              onDelete={requestDelete}
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

      <Modal show={!!pendingDeleteId} onClose={cancelDelete}>
        <Modal.Header onClose={cancelDelete}>{t('announcements.confirmDelete')}</Modal.Header>
        <Modal.Body>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-gray-600">{t('announcements.deleteWarning')}</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={cancelDelete}>{t('common.cancel')}</Button>
          <Button type="button" variant="danger" onClick={confirmDelete} loading={deleting} loadingText={t('common.deleting')}>
            {t('common.delete')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
