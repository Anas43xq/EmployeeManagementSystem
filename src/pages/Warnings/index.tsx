import { useTranslation } from 'react-i18next';
import { Plus, AlertTriangle } from 'lucide-react';
import { PageSpinner, PageHeader, Card, EmptyState, Button, Modal } from '../../components/ui';
import { useWarnings } from './useWarnings';
import WarningCard from './WarningCard';
import WarningFormModal from './WarningFormModal';
import type { WarningStatus } from './types';

const statusFilters: ('all' | WarningStatus)[] = ['all', 'active', 'acknowledged', 'resolved', 'appealed'];

export default function Warnings() {
  const { t } = useTranslation();
  const {
    loading,
    warnings,
    employees,
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
    isStaff,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleAcknowledge,
    handleOpenResolveModal,
    handleResolve,
    handleDelete,
  } = useWarnings();

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('warnings.title')}
        subtitle={isStaff ? t('warnings.subtitleStaff') : t('warnings.subtitle')}
        action={
          !isStaff && (
            <Button variant="danger" onClick={handleOpenModal} icon={<Plus className="w-5 h-5" />}>
              {t('warnings.issueWarning')}
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
              {status === 'all' ? t('common.all') : t(`warnings.status.${status}`)}
            </button>
          ))}
        </div>

        {/* Warning List */}
        <div className="space-y-4">
          {warnings.map(warning => (
            <WarningCard
              key={warning.id}
              warning={warning}
              isStaff={isStaff}
              onAcknowledge={isStaff ? handleAcknowledge : undefined}
              onResolve={!isStaff ? handleOpenResolveModal : undefined}
              onDelete={!isStaff ? handleDelete : undefined}
            />
          ))}
        </div>

        {warnings.length === 0 && (
          <EmptyState
            icon={AlertTriangle}
            message={t('warnings.noWarnings')}
          />
        )}
      </Card>

      {/* Issue Warning Modal */}
      {!isStaff && (
        <WarningFormModal
          show={showModal}
          onClose={handleCloseModal}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          submitting={submitting}
          employees={employees}
        />
      )}

      {/* Resolve Warning Modal */}
      <Modal
        show={showResolveModal}
        onClose={() => setShowResolveModal(false)}
      >
        <Modal.Header onClose={() => setShowResolveModal(false)}>
          {t('warnings.resolveWarning')}
        </Modal.Header>
        <Modal.Body>
          <p className="text-gray-700">
            {t('warnings.resolveMessage')}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('warnings.resolutionNotes')}
            </label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={t('warnings.resolutionPlaceholder')}
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
            onClick={handleResolve}
            disabled={submitting}
          >
            {submitting ? t('common.saving') : t('warnings.resolve')}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
