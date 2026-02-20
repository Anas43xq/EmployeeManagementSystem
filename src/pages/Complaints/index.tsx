import { useTranslation } from 'react-i18next';
import { Plus, MessageSquare } from 'lucide-react';
import { PageSpinner, PageHeader, Card, EmptyState, Button, Modal } from '../../components/ui';
import { useComplaints } from './useComplaints';
import ComplaintCard from './ComplaintCard';
import ComplaintFormModal from './ComplaintFormModal';
import type { ComplaintStatus } from './types';

const statusFilters: ('all' | ComplaintStatus)[] = ['all', 'pending', 'under_review', 'resolved', 'dismissed'];

export default function Complaints() {
  const { t } = useTranslation();
  const {
    loading,
    complaints,
    filter,
    setFilter,
    showModal,
    showResolveModal,
    setShowResolveModal,
    formData,
    setFormData,
    submitting,
    resolutionNotes,
    setResolutionNotes,
    resolveAction,
    isStaff,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleTakeReview,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
  } = useComplaints();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('complaints.title')}
        subtitle={isStaff ? t('complaints.subtitleStaff') : t('complaints.subtitle')}
        action={
          isStaff && (
            <Button onClick={handleOpenModal} icon={<Plus className="w-5 h-5" />}>
              {t('complaints.submitComplaint')}
            </Button>
          )
        }
      />

      <Card>
        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusFilters.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? t('common.all') : t(`complaints.status.${status}`)}
            </button>
          ))}
        </div>

        {/* Complaint List */}
        <div className="space-y-4">
          {complaints.map(complaint => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              isStaff={isStaff}
              onTakeReview={!isStaff ? handleTakeReview : undefined}
              onResolve={!isStaff ? handleOpenResolveModal : undefined}
              onDelete={!isStaff ? handleDelete : undefined}
            />
          ))}
        </div>

        {complaints.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            message={t('complaints.noComplaints')}
          />
        )}
      </Card>

      {/* Submit Complaint Modal (for employees) */}
      {isStaff && (
        <ComplaintFormModal
          show={showModal}
          onClose={handleCloseModal}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {/* Resolve/Dismiss Complaint Modal (for HR/Admin) */}
      <Modal
        show={showResolveModal}
        onClose={() => setShowResolveModal(false)}
      >
        <Modal.Header onClose={() => setShowResolveModal(false)}>
          {resolveAction === 'resolved' ? t('complaints.resolveComplaint') : t('complaints.dismissComplaint')}
        </Modal.Header>
        <Modal.Body>
          <p className="text-gray-700">
            {resolveAction === 'resolved' 
              ? t('complaints.resolveMessage')
              : t('complaints.dismissMessage')
            }
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('complaints.resolutionNotes')} {resolveAction === 'resolved' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              required={resolveAction === 'resolved'}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('complaints.resolutionPlaceholder')}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowResolveModal(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant={resolveAction === 'resolved' ? 'primary' : 'secondary'}
            onClick={handleResolve}
            disabled={submitting || (resolveAction === 'resolved' && !resolutionNotes)}
          >
            {submitting 
              ? t('common.saving') 
              : resolveAction === 'resolved' 
                ? t('complaints.resolve') 
                : t('complaints.dismiss')
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}